import { createShortId, isShortId } from "../../lib/shortId";
import { createEmptyDocument } from "./defaults";
import { normalizeDocument } from "./normalize";
import type { CanvasId, DesignerCanvas, DesignerDocument, DesignerProject, PluginSettingsMap, ProjectId } from "./types";

export function createProjectId(): ProjectId {
  return createShortId();
}

export function createCanvasId(): CanvasId {
  return createShortId();
}

export function createEmptyProject(opts?: { id?: ProjectId; name?: string }): DesignerProject {
  const firstCanvasId = createCanvasId();
  return {
    version: 1,
    id: opts?.id && isShortId(opts.id) ? opts.id : createProjectId(),
    name: opts?.name,
    pluginSettings: {},
    activeCanvasId: firstCanvasId,
    canvases: [
      {
        id: firstCanvasId,
        name: "Canvas 1",
        doc: createEmptyDocument(),
      },
    ],
  };
}

export function projectFromSingleDocument(doc: DesignerDocument, opts?: { id?: ProjectId; canvasId?: CanvasId }): DesignerProject {
  const projectId = opts?.id && isShortId(opts.id) ? opts.id : createProjectId();
  const canvasId = opts?.canvasId && isShortId(opts.canvasId) ? opts.canvasId : createCanvasId();

  const legacyDocSettings = (doc as unknown as { pluginSettings?: unknown }).pluginSettings;
  const pluginSettings: PluginSettingsMap | undefined =
    legacyDocSettings && typeof legacyDocSettings === "object" && !Array.isArray(legacyDocSettings)
      ? (legacyDocSettings as PluginSettingsMap)
      : undefined;

  return {
    version: 1,
    id: projectId,
    pluginSettings,
    activeCanvasId: canvasId,
    canvases: [
      {
        id: canvasId,
        name: "Canvas 1",
        doc: pluginSettings ? { ...doc, pluginSettings: undefined } : doc,
      },
    ],
  };
}

function coercePluginSettings(raw: unknown): PluginSettingsMap | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  return raw as PluginSettingsMap;
}

function normalizeCanvas(raw: unknown, fallbackIndex: number): DesignerCanvas | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;

  const idRaw = typeof rec.id === "string" ? rec.id : "";
  const id = isShortId(idRaw) ? idRaw : createCanvasId();

  const nameRaw = typeof rec.name === "string" ? rec.name.trim() : "";
  const name = nameRaw || `Canvas ${fallbackIndex + 1}`;

  const docRaw = rec.doc;
  if (!docRaw || typeof docRaw !== "object" || Array.isArray(docRaw)) return null;
  const doc = normalizeDocument(docRaw);

  return { id, name, doc };
}

export function importProjectJsonText(jsonText: string): DesignerProject {
  const trimmed = typeof jsonText === "string" ? jsonText.trim() : "";
  if (!trimmed) throw new Error("Empty project JSON");

  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid project JSON");
  }

  const rec = parsed as Record<string, unknown>;

  // New format: project wrapper
  if (Array.isArray(rec.canvases)) {
    const idRaw = typeof rec.id === "string" ? rec.id : "";
    const projectId = isShortId(idRaw) ? idRaw : createProjectId();

    const canvases: DesignerCanvas[] = [];
    for (let i = 0; i < rec.canvases.length; i++) {
      const c = normalizeCanvas(rec.canvases[i], i);
      if (c) canvases.push(c);
    }

    if (canvases.length === 0) {
      return createEmptyProject({ id: projectId, name: typeof rec.name === "string" ? rec.name : undefined });
    }

    const activeRaw = typeof rec.activeCanvasId === "string" ? rec.activeCanvasId : "";
    const activeCanvasId = canvases.some((c) => c.id === activeRaw) ? activeRaw : canvases[0].id;

    // Canonical plugin settings are stored at the project level.
    // Back-compat: older exports may store pluginSettings inside each canvas document.
    const projectLevel = coercePluginSettings(rec.pluginSettings);
    const merged: PluginSettingsMap = { ...(projectLevel ?? {}) };

    for (const c of canvases) {
      const legacy = coercePluginSettings((c.doc as unknown as { pluginSettings?: unknown }).pluginSettings);
      if (legacy) {
        for (const [k, v] of Object.entries(legacy)) {
          if (merged[k] === undefined) merged[k] = v;
        }
        // Strip legacy per-canvas plugin settings so switching canvases doesn't "lose" settings.
        c.doc = { ...c.doc, pluginSettings: undefined };
      }
    }

    return {
      version: 1,
      id: projectId,
      name: typeof rec.name === "string" ? rec.name : undefined,
      pluginSettings: Object.keys(merged).length > 0 ? merged : undefined,
      canvases,
      activeCanvasId,
    };
  }

  // Backward compatibility: treat as a single DesignerDocument.
  const doc = normalizeDocument(parsed);
  return projectFromSingleDocument(doc);
}

export function exportProjectJsonText(project: DesignerProject): string {
  return JSON.stringify(project, null, 2);
}

export function getActiveCanvas(project: DesignerProject): DesignerCanvas {
  return project.canvases.find((c) => c.id === project.activeCanvasId) ?? project.canvases[0]!;
}
