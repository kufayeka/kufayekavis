import { match } from "ts-pattern";
import { z } from "zod";

import type { DesignerAPI } from "../../../core/api";
import type { CreateElementInput } from "../../../core/engine";
import type { DesignerElement, ElementId } from "../../../core/types";
import type { DesignerRegistry, UiLayoutState } from "../../../core/registry";

export function applyRemoteControlCommand(
  api: DesignerAPI,
  registry: DesignerRegistry | null,
  cmd: unknown,
  publishResponse?: (payload: unknown) => void,
) {
  const CUSTOM_ELEMENT_ROOT_KEYS = new Set<string>([
    "id",
    "type",
    "kind",
    "name",
    "locked",
    "hidden",
    "parentId",
    "zIndex",
    "rotation",
    "flipH",
    "flipV",
    "opacity",
    "stroke",
    "strokeWidth",
    "fill",
    "enableOnMouseHoverEventListener",
    "enableOnMouseClickEventListener",
    "enableOnMouseLeaveEventListener",
    "mqttTopic",
    "x",
    "y",
    "width",
    "height",
    "props",
  ]);

  const splitCustomElementPatch = (patch: Record<string, unknown>) => {
    const elementPatch: Record<string, unknown> = {};
    const propsPatch: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(patch)) {
      if (k === "props") {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          Object.assign(propsPatch, v as Record<string, unknown>);
        }
        continue;
      }

      if (CUSTOM_ELEMENT_ROOT_KEYS.has(k)) elementPatch[k] = v;
      else propsPatch[k] = v;
    }

    return { elementPatch, propsPatch };
  };

  const applySmartPatch = (id: string, patch: Record<string, unknown>) => {
    const current = api.getElement(id);
    if (!current || current.type !== "custom") {
      api.updateElement(id, patch as Partial<DesignerElement>);
      return;
    }

    const { elementPatch, propsPatch } = splitCustomElementPatch(patch);
    api.engine.beginHistoryBatch();
    try {
      if (Object.keys(elementPatch).length > 0) api.updateElement(id, elementPatch as Partial<DesignerElement>);
      if (Object.keys(propsPatch).length > 0) api.updateCustomProps(id, propsPatch);
    } finally {
      api.engine.endHistoryBatch();
    }
  };

  const findElementInAllCanvases = (id: string) => {
    const project = api.engine.getState().project;
    for (const canvas of project.canvases) {
      const el = canvas.doc.elements[id];
      if (el) return { element: el, canvasId: canvas.id };
    }
    return null;
  };

  const applyGlobalRuntimePatch = (id: string, patch: Record<string, unknown>) => {
    const found = findElementInAllCanvases(id);
    if (!found) return;

    const { element } = found;
    if (element.type !== "custom") {
      api.engine.patchRuntimeElements([id], patch as Partial<DesignerElement>);
      return;
    }

    const { elementPatch, propsPatch } = splitCustomElementPatch(patch);
    const runtimePatch: Record<string, unknown> = { ...elementPatch };
    if (Object.keys(propsPatch).length > 0) runtimePatch.props = propsPatch;
    api.engine.patchRuntimeElements([id], runtimePatch as Partial<DesignerElement>);
  };

  const applyRuntimeSmartPatch = (ids: string[], patch: Record<string, unknown>) => {
    if (!ids.length) return;

    // For remote control in view mode, apply patches globally across all canvases.
    if (api.engine.getState().viewMode) {
      for (const id of ids) {
        applyGlobalRuntimePatch(id, patch);
      }
      return;
    }

    // Fallback to active canvas only for edit mode.
    const doc = api.getDocument();
    const customIds: string[] = [];
    const normalIds: string[] = [];

    for (const id of ids) {
      const el = doc.elements[id];
      if (el && (el as DesignerElement).type === "custom") customIds.push(id);
      else normalIds.push(id);
    }

    if (normalIds.length) {
      api.engine.patchRuntimeElements(normalIds as ElementId[], patch as Partial<DesignerElement>);
    }

    if (customIds.length) {
      const { elementPatch, propsPatch } = splitCustomElementPatch(patch);
      const runtimePatch: Record<string, unknown> = { ...elementPatch };
      if (Object.keys(propsPatch).length > 0) runtimePatch.props = propsPatch;
      api.engine.patchRuntimeElements(customIds as ElementId[], runtimePatch as Partial<DesignerElement>);
    }
  };

  const resolveTargetIds = (target: { id?: string; tag?: string }): string[] => {
    const tag = target.tag?.trim();
    if (tag) {
      const project = api.engine.getState().project;
      const ids: string[] = [];
      for (const canvas of project.canvases) {
        for (const [id, el] of Object.entries(canvas.doc.elements)) {
          const elTag = (el as unknown as { tag?: unknown }).tag;
          if (typeof elTag === "string" && elTag.trim() === tag) {
            ids.push(id);
          }
        }
      }
      return ids;
    }
    const id = target.id?.trim();
    return id ? [id] : [];
  };

  const envelopeSchema = z.object({
    action: z.string().min(1),
    payload: z.unknown().optional(),
    requestId: z.string().optional(),
  });

  const env = envelopeSchema.safeParse(cmd);
  if (!env.success) return;

  const action = env.data.action;
  const payloadRaw = env.data.payload;
  const requestId = env.data.requestId;

  const respond = (p: Record<string, unknown>) => {
    publishResponse?.({ requestId, ...p });
  };

  const asObj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const payload = asObj(payloadRaw);

  const idsSchema = z.array(z.string()).default([]);
  const numberOpt = z.preprocess((v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  }, z.number().optional());

  match(action)
    .with("select", () => {
      const parsed = z
        .object({
          ids: idsSchema,
          append: z.boolean().optional(),
        })
        .safeParse(payload);
      if (!parsed.success) return;
      api.select(parsed.data.ids, { append: parsed.data.append ?? false });
    })
    .with("clearSelection", () => {
      api.clearSelection();
    })
    .with("setTool", () => {
      const parsed = z.object({ tool: z.string().default("select") }).safeParse(payload);
      if (!parsed.success) return;
      api.setTool(parsed.data.tool);
    })
    .with("setViewMode", () => {
      const parsed = z.object({ value: z.boolean() }).safeParse(payload);
      if (!parsed.success) return;
      api.setViewMode(parsed.data.value);
    })
    .with("setZoom", () => {
      const parsed = z
        .object({
          scale: numberOpt,
          panX: numberOpt,
          panY: numberOpt,
        })
        .safeParse(payload);
      if (!parsed.success) return;
      api.engine.setZoom({
        ...(parsed.data.scale !== undefined ? { scale: parsed.data.scale } : null),
        ...(parsed.data.panX !== undefined ? { panX: parsed.data.panX } : null),
        ...(parsed.data.panY !== undefined ? { panY: parsed.data.panY } : null),
      });
    })
    .with("setCanvas", () => {
      api.setCanvas(payloadRaw as Partial<ReturnType<typeof api.getDocument>["canvas"]>);
    })
    .with("getDocument", () => {
      respond({ type: "getDocument", ok: true, doc: api.getDocument() });
    })
    .with("listElements", () => {
      const doc = api.getDocument();
      respond({ type: "listElements", ok: true, rootIds: doc.rootIds, ids: Object.keys(doc.elements) });
    })
    .with("getElement", () => {
      const parsed = z.object({ id: z.string().min(1) }).safeParse(payload);
      if (!parsed.success) {
        respond({ type: "getElement", ok: false, element: null });
        return;
      }
      const el = api.getElement(parsed.data.id);
      respond({ type: "getElement", ok: Boolean(el), element: el ?? null });
    })
    .with("getPluginSettings", () => {
      const parsed = z.object({ pluginId: z.string().min(1) }).safeParse(payload);
      if (!parsed.success) {
        respond({ type: "getPluginSettings", ok: false, error: "pluginId is required" });
        return;
      }
      respond({
        type: "getPluginSettings",
        ok: true,
        pluginId: parsed.data.pluginId,
        value: api.getPluginSettings(parsed.data.pluginId),
      });
    })
    .with("setPluginSettings", () => {
      const parsed = z.object({ pluginId: z.string().min(1), value: z.unknown().optional() }).safeParse(payload);
      if (!parsed.success) return;
      api.setPluginSettings(parsed.data.pluginId, parsed.data.value);
      respond({ type: "setPluginSettings", ok: true, pluginId: parsed.data.pluginId });
    })
    .with("patchPluginSettings", () => {
      const parsed = z
        .object({
          pluginId: z.string().min(1),
          patch: z.record(z.string(), z.unknown()),
        })
        .safeParse(payload);
      if (!parsed.success) return;
      const cur = api.getPluginSettings(parsed.data.pluginId);
      const curObj = cur && typeof cur === "object" ? (cur as Record<string, unknown>) : {};
      api.setPluginSettings(parsed.data.pluginId, { ...curObj, ...parsed.data.patch });
      respond({ type: "patchPluginSettings", ok: true, pluginId: parsed.data.pluginId });
    })
    .with("getUiLayout", () => {
      if (!registry) {
        respond({ type: "getUiLayout", ok: false, error: "registry not available" });
        return;
      }
      respond({ type: "getUiLayout", ok: true, layout: registry.getUiLayout() });
    })
    .with("setUiLayout", () => {
      if (!registry) return;
      const parsed = z
        .object({
          leftPanelVisible: z.boolean().optional(),
          rightPanelVisible: z.boolean().optional(),
          focusCanvas: z.boolean().optional(),
        })
        .safeParse(payload);
      if (!parsed.success) return;
      const p = parsed.data as Partial<UiLayoutState>;
      registry.setUiLayout({
        ...(typeof p.leftPanelVisible === "boolean" ? { leftPanelVisible: p.leftPanelVisible } : null),
        ...(typeof p.rightPanelVisible === "boolean" ? { rightPanelVisible: p.rightPanelVisible } : null),
        ...(typeof p.focusCanvas === "boolean" ? { focusCanvas: p.focusCanvas } : null),
      });
    })
    .with("toggleLeftPanel", () => {
      if (!registry) return;
      registry.toggleLeftPanel();
    })
    .with("toggleRightPanel", () => {
      if (!registry) return;
      registry.toggleRightPanel();
    })
    .with("toggleFocusCanvas", () => {
      if (!registry) return;
      registry.toggleFocusCanvas();
    })
    .with("exportProjectJson", () => {
      const json = api.exportProjectJson();
      respond({ type: "exportProjectJson", ok: true, json });
    })
    .with("importProjectJson", () => {
      const parsed = z
        .object({
          jsonText: z.string().optional(),
          doc: z.record(z.string(), z.unknown()).optional(),
        })
        .safeParse(payload);
      try {
        if (parsed.success && parsed.data.jsonText && parsed.data.jsonText.trim()) {
          api.importProjectJson(parsed.data.jsonText);
        } else if (parsed.success && parsed.data.doc && typeof parsed.data.doc === "object") {
          api.importProjectJson(JSON.stringify(parsed.data.doc));
        } else {
          throw new Error("jsonText or doc is required");
        }
        respond({ type: "importProjectJson", ok: true });
      } catch (err) {
        respond({ type: "importProjectJson", ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    })
    .with("deleteAllElements", () => {
      const doc = api.getDocument();
      api.deleteElements([...doc.rootIds]);
    })
    .with("createElement", () => {
      const parsed = z
        .object({
          input: z.unknown(),
          patch: z.unknown().optional(),
        })
        .safeParse(payload);
      if (!parsed.success) return;
      if (!parsed.data.input || typeof parsed.data.input !== "object") return;
      const id = api.createElement(parsed.data.input as CreateElementInput);
      if (parsed.data.patch && typeof parsed.data.patch === "object") applySmartPatch(id, parsed.data.patch as Record<string, unknown>);
      respond({ type: "createElement", ok: true, id });
    })
    .with("updateElement", () => {
      const parsed = z
        .object({
          id: z.string().optional(),
          tag: z.string().optional(),
          patch: z.record(z.string(), z.unknown()),
        })
        .safeParse(payload);
      if (!parsed.success) return;

      const ids = resolveTargetIds(parsed.data);
      if (!ids.length) {
        respond({ type: "updateElement", ok: false, error: "Target element not found (id/tag)" });
        return;
      }

      if (api.engine.getState().viewMode) {
        applyRuntimeSmartPatch(ids, parsed.data.patch);
      } else {
        for (const id of ids) applySmartPatch(id, parsed.data.patch);
      }
    })
    .with("bulkUpdateElements", () => {
      const parsed = z
        .object({
          updates: z.array(z.object({ id: z.string().min(1), patch: z.record(z.string(), z.unknown()) })).default([]),
        })
        .safeParse(payload);
      if (!parsed.success) return;
      if (parsed.data.updates.length === 0) return;

      if (api.engine.getState().viewMode) {
        for (const u of parsed.data.updates) {
          applyRuntimeSmartPatch([u.id], u.patch);
        }
        return;
      }

      api.engine.beginHistoryBatch();
      try {
        for (const u of parsed.data.updates) {
          applySmartPatch(u.id, u.patch);
        }
      } finally {
        api.engine.endHistoryBatch();
      }
    })
    .with("updateCustomProps", () => {
      const parsed = z.object({ id: z.string().min(1), patch: z.record(z.string(), z.unknown()) }).safeParse(payload);
      if (!parsed.success) return;
      if (api.engine.getState().viewMode) {
        applyRuntimeSmartPatch([parsed.data.id], { props: parsed.data.patch });
        return;
      }
      api.updateCustomProps(parsed.data.id, parsed.data.patch);
    })
    .with("callElementAction", () => {
      const parsed = z
        .object({
          id: z.string().min(1),
          actionId: z.string().min(1),
          args: z.array(z.unknown()).default([]),
        })
        .safeParse(payload);
      if (!parsed.success) return;
      try {
        const result = api.callElementAction(parsed.data.id, parsed.data.actionId, ...parsed.data.args);
        respond({ type: "callElementAction", ok: true, result });
      } catch (err) {
        respond({ type: "callElementAction", ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    })
    .with("deleteElements", () => {
      const parsed = z.object({ ids: idsSchema }).safeParse(payload);
      if (!parsed.success) return;
      if (parsed.data.ids.length) api.deleteElements(parsed.data.ids);
    })
    .with("translate", () => {
      const parsed = z.object({ ids: idsSchema, dx: numberOpt.optional(), dy: numberOpt.optional() }).safeParse(payload);
      if (!parsed.success) return;
      const dx = parsed.data.dx ?? 0;
      const dy = parsed.data.dy ?? 0;
      if (parsed.data.ids.length) api.translate(parsed.data.ids, dx, dy);
    })
    .with("bringToFront", () => {
      const parsed = z.object({ ids: idsSchema }).safeParse(payload);
      if (!parsed.success) return;
      if (parsed.data.ids.length) api.bringToFront(parsed.data.ids);
    })
    .with("groupSelection", () => {
      api.groupSelection();
    })
    .with("ungroupSelection", () => {
      api.ungroupSelection();
    })
    .otherwise(() => {
      // Unknown action: ignore for forward compatibility.
    });
}
