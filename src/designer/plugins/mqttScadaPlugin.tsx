"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import { match } from "ts-pattern";
import { z } from "zod";

import type { DesignerPlugin } from "../core/plugins";
import type { DesignerAPI } from "../core/api";
import type { CreateElementInput } from "../core/engine";
import type { DesignerElement } from "../core/types";
import type { DesignerRegistry, UiLayoutState } from "../core/registry";

type MqttScadaSettings = {
  url: string; // ws(s)://host:port/mqtt
  username?: string;
  password?: string;
  clientId?: string;
  clean?: boolean;
  keepalive?: number;
  reconnectPeriodMs?: number;

  // Remote control
  remoteControlEnabled?: boolean;
  remoteControlTopic?: string;
  remoteControlResponseTopic?: string;

  // Event output
  eventOutputEnabled?: boolean;
  defaultEventTopic?: string; // used when caller publishes to "default/events"

  // Force publish UI events even if per-element flags are not enabled.
  forcePublishElementEvents?: boolean;
  forcePublishCanvasEvents?: boolean;
};

const PLUGIN_ID = "system.mqttScada";
const DIALOG_ID = "system.mqttScada.settings";

function coerceSettings(value: unknown): MqttScadaSettings {
  const v = (value ?? {}) as Partial<MqttScadaSettings>;
  return {
    url: typeof v.url === "string" ? v.url : "",
    username: typeof v.username === "string" ? v.username : "",
    password: typeof v.password === "string" ? v.password : "",
    clientId: typeof v.clientId === "string" ? v.clientId : "",
    clean: typeof v.clean === "boolean" ? v.clean : true,
    keepalive: Number.isFinite(v.keepalive) ? Number(v.keepalive) : 30,
    reconnectPeriodMs: Number.isFinite(v.reconnectPeriodMs) ? Number(v.reconnectPeriodMs) : 2000,
    remoteControlEnabled: typeof v.remoteControlEnabled === "boolean" ? v.remoteControlEnabled : true,
    remoteControlTopic: typeof v.remoteControlTopic === "string" ? v.remoteControlTopic : "scada/rc",
    remoteControlResponseTopic: typeof v.remoteControlResponseTopic === "string" ? v.remoteControlResponseTopic : "scada/rc/resp",
    eventOutputEnabled: typeof v.eventOutputEnabled === "boolean" ? v.eventOutputEnabled : true,
    defaultEventTopic: typeof v.defaultEventTopic === "string" ? v.defaultEventTopic : "scada/events",

    forcePublishElementEvents: typeof v.forcePublishElementEvents === "boolean" ? v.forcePublishElementEvents : false,
    forcePublishCanvasEvents: typeof v.forcePublishCanvasEvents === "boolean" ? v.forcePublishCanvasEvents : false,
  };
}

function jsonSafeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function publishJson(client: MqttClient, topic: string, payload: unknown) {
  client.publish(topic, JSON.stringify(payload));
}

function applyRemoteControlCommand(
  api: DesignerAPI,
  registry: DesignerRegistry | null,
  cmd: unknown,
  publishResponse?: (payload: unknown) => void,
) {

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

  const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
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
      api.setCanvas((payloadRaw as unknown) as Partial<ReturnType<typeof api.getDocument>["canvas"]>);
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
      respond({ type: "getPluginSettings", ok: true, pluginId: parsed.data.pluginId, value: api.getPluginSettings(parsed.data.pluginId) });
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
      if (parsed.data.patch && typeof parsed.data.patch === "object") api.updateElement(id, parsed.data.patch as Partial<DesignerElement>);
      respond({ type: "createElement", ok: true, id });
    })
    .with("updateElement", () => {
      const parsed = z.object({ id: z.string().min(1), patch: z.record(z.string(), z.unknown()) }).safeParse(payload);
      if (!parsed.success) return;
      api.updateElement(parsed.data.id, parsed.data.patch as Partial<DesignerElement>);
    })
    .with("bulkUpdateElements", () => {
      const parsed = z
        .object({
          updates: z
            .array(z.object({ id: z.string().min(1), patch: z.record(z.string(), z.unknown()) }))
            .default([]),
        })
        .safeParse(payload);
      if (!parsed.success) return;
      if (parsed.data.updates.length === 0) return;
      api.engine.beginHistoryBatch();
      try {
        for (const u of parsed.data.updates) {
          api.updateElement(u.id, u.patch as Partial<DesignerElement>);
        }
      } finally {
        api.engine.endHistoryBatch();
      }
    })
    .with("updateCustomProps", () => {
      const parsed = z.object({ id: z.string().min(1), patch: z.record(z.string(), z.unknown()) }).safeParse(payload);
      if (!parsed.success) return;
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

function buildClientOptions(s: MqttScadaSettings): IClientOptions {
  const opts: IClientOptions = {
    username: s.username?.trim() ? s.username : undefined,
    password: s.password?.trim() ? s.password : undefined,
    clientId: s.clientId?.trim() ? s.clientId : undefined,
    clean: s.clean ?? true,
    keepalive: Math.max(0, Math.round(s.keepalive ?? 30)),
    reconnectPeriod: Math.max(0, Math.round(s.reconnectPeriodMs ?? 2000)),
  };
  return opts;
}

function createConnectionManager(api: DesignerAPI, registry?: DesignerRegistry) {
  let client: MqttClient | null = null;
  let currentUrl = "";
  let currentOptsJson = "";
  let remoteTopic = "";

  const disconnect = () => {
    if (!client) return;
    try {
      client.end(true);
    } catch {
      // ignore
    }
    client = null;
    currentUrl = "";
    currentOptsJson = "";
    remoteTopic = "";
  };

  const ensureConnected = (settings: MqttScadaSettings) => {
    const url = settings.url?.trim() ?? "";
    if (!url) {
      disconnect();
      return { client: null as MqttClient | null, status: "disconnected" as const };
    }

    const opts = buildClientOptions(settings);
    const nextOptsJson = JSON.stringify(opts);

    const needsNew = !client || currentUrl !== url || currentOptsJson !== nextOptsJson;
    if (needsNew) {
      disconnect();
      currentUrl = url;
      currentOptsJson = nextOptsJson;

      client = mqtt.connect(url, opts);

      const publishResponse = (payload: unknown) => {
        const s = coerceSettings(api.getPluginSettings(PLUGIN_ID));
        const topic = s.remoteControlResponseTopic?.trim();
        if (!topic) return;
        if (!client) return;
        publishJson(client, topic, payload);
      };

      client.on("message", (topic, payload) => {
        const s = coerceSettings(api.getPluginSettings(PLUGIN_ID));
        if (!s.remoteControlEnabled) return;
        if (!s.remoteControlTopic) return;
        if (topic !== s.remoteControlTopic) return;

        const text = payload.toString("utf8");
        const parsed = jsonSafeParse(text);
        applyRemoteControlCommand(api, registry ?? null, parsed, publishResponse);
      });

      client.on("connect", () => {
        const s = coerceSettings(api.getPluginSettings(PLUGIN_ID));
        if (s.remoteControlEnabled && s.remoteControlTopic?.trim()) {
          const desired = s.remoteControlTopic.trim();
          if (remoteTopic !== desired) {
            if (remoteTopic) {
              try {
                client?.unsubscribe(remoteTopic);
              } catch {
                // ignore
              }
            }
            remoteTopic = desired;
            client?.subscribe(remoteTopic);
          }
        }
      });
    }

    return { client, status: "connecting" as const };
  };

  const testConnection = async (settings: MqttScadaSettings, timeoutMs = 5000): Promise<{ ok: boolean; message: string }> => {
    const url = settings.url?.trim() ?? "";
    if (!url) return { ok: false, message: "URL is required" };

    const opts = buildClientOptions(settings);
    const testClient = mqtt.connect(url, opts);

    return await new Promise((resolve) => {
      const t = setTimeout(() => {
        try {
          testClient.end(true);
        } catch {
          // ignore
        }
        resolve({ ok: false, message: "Timeout" });
      }, timeoutMs);

      testClient.on("connect", () => {
        clearTimeout(t);
        try {
          testClient.end(true);
        } catch {
          // ignore
        }
        resolve({ ok: true, message: "Connected" });
      });

      testClient.on("error", (err) => {
        clearTimeout(t);
        try {
          testClient.end(true);
        } catch {
          // ignore
        }
        resolve({ ok: false, message: err?.message ? String(err.message) : "Error" });
      });
    });
  };

  const publishEvent = (settings: MqttScadaSettings, topic: string, data: Record<string, unknown>) => {
    if (!settings.eventOutputEnabled) return;
    const c = ensureConnected(settings).client;
    if (!c) return;

    const resolvedTopic = topic === "default/events" && settings.defaultEventTopic?.trim()
      ? settings.defaultEventTopic.trim()
      : topic;

    publishJson(c, resolvedTopic, data);
  };

  return { ensureConnected, disconnect, testConnection, publishEvent };
}

function SettingsDialog({ api }: { api: DesignerAPI }) {
  const initial = useMemo(() => coerceSettings(api.getPluginSettings(PLUGIN_ID)), [api]);
  const [settings, setSettings] = useState<MqttScadaSettings>(initial);

  const [testStatus, setTestStatus] = useState<{ kind: "idle" | "testing" | "ok" | "error"; message?: string }>({ kind: "idle" });

  useEffect(() => {
    // Keep in sync if something else updates plugin settings.
    const unsub = api.subscribe(() => {
      // no-op: avoid excessive rerenders; dialog uses local state.
    });
    return () => unsub();
  }, [api]);

  return (
    <div className="space-y-3">
      <div className="text-xs text-black/60">
        MQTT over WebSocket. Example: <span className="font-mono">ws://localhost:9001/mqtt</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <div className="text-xs font-medium">Broker WS URL</div>
          <input
            className="w-full px-2 py-1.5 rounded border border-black/15"
            value={settings.url}
            onChange={(e) => setSettings((s) => ({ ...s, url: e.target.value }))}
            placeholder="ws://host:port/mqtt"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium">Client ID</div>
          <input
            className="w-full px-2 py-1.5 rounded border border-black/15"
            value={settings.clientId ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, clientId: e.target.value }))}
            placeholder="optional"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium">Username</div>
          <input
            className="w-full px-2 py-1.5 rounded border border-black/15"
            value={settings.username ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, username: e.target.value }))}
            placeholder="optional"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium">Password</div>
          <input
            className="w-full px-2 py-1.5 rounded border border-black/15"
            type="password"
            value={settings.password ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, password: e.target.value }))}
            placeholder="optional"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium">Keepalive (s)</div>
          <input
            className="w-full px-2 py-1.5 rounded border border-black/15"
            type="number"
            min={0}
            value={settings.keepalive ?? 30}
            onChange={(e) => setSettings((s) => ({ ...s, keepalive: Number(e.target.value) }))}
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium">Reconnect (ms)</div>
          <input
            className="w-full px-2 py-1.5 rounded border border-black/15"
            type="number"
            min={0}
            value={settings.reconnectPeriodMs ?? 2000}
            onChange={(e) => setSettings((s) => ({ ...s, reconnectPeriodMs: Number(e.target.value) }))}
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.clean ?? true}
            onChange={(e) => setSettings((s) => ({ ...s, clean: e.target.checked }))}
          />
          <span className="text-xs">Clean session</span>
        </label>
      </div>

      <div className="rounded border border-black/10 p-3 space-y-2">
        <div className="text-sm font-medium">Remote Control Interface</div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.remoteControlEnabled ?? true}
            onChange={(e) => setSettings((s) => ({ ...s, remoteControlEnabled: e.target.checked }))}
          />
          <span className="text-xs">Enable remote control subscribe</span>
        </label>
        <label className="space-y-1 block">
          <div className="text-xs font-medium">Remote control topic</div>
          <input
            className="w-full px-2 py-1.5 rounded border border-black/15"
            value={settings.remoteControlTopic ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, remoteControlTopic: e.target.value }))}
            placeholder="scada/rc"
          />
        </label>
        <label className="space-y-1 block">
          <div className="text-xs font-medium">Response topic (optional)</div>
          <input
            className="w-full px-2 py-1.5 rounded border border-black/15"
            value={settings.remoteControlResponseTopic ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, remoteControlResponseTopic: e.target.value }))}
            placeholder="scada/rc/resp"
          />
        </label>
        <div className="text-xs text-black/60">
          Message format: <span className="font-mono">{"{"}action, payload{"}"}</span>
        </div>
      </div>

      <div className="rounded border border-black/10 p-3 space-y-2">
        <div className="text-sm font-medium">Event Output Interface</div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.eventOutputEnabled ?? true}
            onChange={(e) => setSettings((s) => ({ ...s, eventOutputEnabled: e.target.checked }))}
          />
          <span className="text-xs">Enable event publish</span>
        </label>
        <label className="space-y-1 block">
          <div className="text-xs font-medium">Default event topic</div>
          <input
            className="w-full px-2 py-1.5 rounded border border-black/15"
            value={settings.defaultEventTopic ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, defaultEventTopic: e.target.value }))}
            placeholder="scada/events"
          />
        </label>
        <div className="text-xs text-black/60">
          Elements can override per element via <span className="font-mono">mqttTopic</span>.
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.forcePublishElementEvents ?? false}
            onChange={(e) => setSettings((s) => ({ ...s, forcePublishElementEvents: e.target.checked }))}
          />
          <span className="text-xs">Force publish element events (ignore per-element flags)</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.forcePublishCanvasEvents ?? false}
            onChange={(e) => setSettings((s) => ({ ...s, forcePublishCanvasEvents: e.target.checked }))}
          />
          <span className="text-xs">Force publish canvas events</span>
        </label>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => {
            api.setPluginSettings(PLUGIN_ID, settings);
            setTestStatus({ kind: "idle" });
          }}
        >
          Save
        </button>

        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={async () => {
            setTestStatus({ kind: "testing", message: "Testing..." });
            const mgr = createConnectionManager(api);
            const res = await mgr.testConnection(settings);
            setTestStatus(res.ok ? { kind: "ok", message: res.message } : { kind: "error", message: res.message });
          }}
          disabled={testStatus.kind === "testing"}
        >
          Test
        </button>

        {testStatus.kind !== "idle" && (
          <div
            className={
              "text-xs px-2 py-1 rounded border " +
              (testStatus.kind === "ok"
                ? "border-green-600/30 bg-green-50"
                : testStatus.kind === "error"
                  ? "border-red-600/30 bg-red-50"
                  : "border-black/10 bg-black/5")
            }
          >
            {testStatus.message ?? ""}
          </div>
        )}
      </div>
    </div>
  );
}

export const mqttScadaPlugin: DesignerPlugin = {
  id: PLUGIN_ID,
  activate: ({ api, registry }) => {
    const mgr = createConnectionManager(api, registry);

    // Replace API publishEvent so ALL elements/canvas use MQTT when plugin is configured.
    const originalPublishEvent = api.publishEvent;
    api.publishEvent = (topic: string, data: Record<string, unknown>) => {
      const settings = coerceSettings(api.getPluginSettings(PLUGIN_ID));
      if (!settings.url?.trim()) {
        originalPublishEvent(topic, data);
        return;
      }
      mgr.publishEvent(settings, topic, data);
    };

    // Keep an always-on connection when settings exist.
    const ensure = () => {
      const settings = coerceSettings(api.getPluginSettings(PLUGIN_ID));
      mgr.ensureConnected(settings);
    };

    ensure();
    const unsub = api.subscribe(() => {
      // Cheap: reconnect if someone changed settings via API.
      ensure();
    });

    const disposers: Array<() => void> = [];

    disposers.push(
      registry.registerDialog({
        id: DIALOG_ID,
        title: "SCADA MQTT Connections",
        render: (ctxUnknown: unknown) => {
          const ctx = ctxUnknown as { api: DesignerAPI };
          return <SettingsDialog api={ctx.api} />;
        },
      }),
    );

    disposers.push(
      registry.registerTopRibbonItem({
        kind: "button",
        id: "system.mqttScada.open",
        label: "SCADA MQTT",
        placement: "right",
        order: 9,
        onClick: () => registry.openDialog(DIALOG_ID),
      }),
    );

    return () => {
      try {
        unsub();
      } catch {
        // ignore
      }
      try {
        api.publishEvent = originalPublishEvent;
      } catch {
        // ignore
      }
      try {
        mgr.disconnect();
      } catch {
        // ignore
      }
      for (const d of disposers) {
        try {
          d();
        } catch {
          // ignore
        }
      }
    };
  },
};
