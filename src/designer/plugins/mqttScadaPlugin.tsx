"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import mqtt, { type IClientOptions, type MqttClient } from "mqtt";

import type { DesignerPlugin } from "../core/plugins";
import type { DesignerAPI } from "../core/api";
import type { CreateElementInput } from "../core/engine";
import type { DesignerElement } from "../core/types";

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

  // Event output
  eventOutputEnabled?: boolean;
  defaultEventTopic?: string; // used when caller publishes to "default/events"
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
    eventOutputEnabled: typeof v.eventOutputEnabled === "boolean" ? v.eventOutputEnabled : true,
    defaultEventTopic: typeof v.defaultEventTopic === "string" ? v.defaultEventTopic : "scada/events",
  };
}

function asBool(v: unknown): v is boolean {
  return typeof v === "boolean";
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

function applyRemoteControlCommand(api: DesignerAPI, cmd: unknown) {
  if (!cmd || typeof cmd !== "object") return;
  const o = cmd as Record<string, unknown>;
  const action = String(o.action ?? "");
  const payload = (o.payload ?? {}) as Record<string, unknown>;

  if (action === "select") {
    const ids = Array.isArray(payload.ids) ? (payload.ids.filter((x) => typeof x === "string") as string[]) : [];
    const append = asBool(payload.append) ? payload.append : false;
    api.select(ids, { append });
    return;
  }

  if (action === "clearSelection") {
    api.clearSelection();
    return;
  }

  if (action === "setTool") {
    api.setTool(String(payload.tool ?? "select"));
    return;
  }

  if (action === "setViewMode") {
    api.setViewMode(Boolean(payload.value));
    return;
  }

  if (action === "setZoom") {
    const p = payload as Record<string, unknown>;
    const scale = Number.isFinite(p.scale) ? Number(p.scale) : undefined;
    const panX = Number.isFinite(p.panX) ? Number(p.panX) : undefined;
    const panY = Number.isFinite(p.panY) ? Number(p.panY) : undefined;
    api.engine.setZoom({
      ...(scale !== undefined ? { scale } : null),
      ...(panX !== undefined ? { panX } : null),
      ...(panY !== undefined ? { panY } : null),
    });
    return;
  }

  if (action === "setCanvas") {
    api.setCanvas((payload as unknown) as Partial<ReturnType<typeof api.getDocument>["canvas"]>);
    return;
  }

  if (action === "createElement") {
    const input = payload.input as unknown;
    if (input && typeof input === "object") {
      api.createElement(input as CreateElementInput);
    }
    return;
  }

  if (action === "updateElement") {
    const id = String(payload.id ?? "");
    const patch = payload.patch as unknown;
    if (id && patch && typeof patch === "object") api.updateElement(id, patch as Partial<DesignerElement>);
    return;
  }

  if (action === "deleteElements") {
    const ids = Array.isArray(payload.ids) ? (payload.ids.filter((x) => typeof x === "string") as string[]) : [];
    if (ids.length) api.deleteElements(ids);
    return;
  }

  if (action === "translate") {
    const ids = Array.isArray(payload.ids) ? (payload.ids.filter((x) => typeof x === "string") as string[]) : [];
    const dx = Number.isFinite(payload.dx) ? Number(payload.dx) : 0;
    const dy = Number.isFinite(payload.dy) ? Number(payload.dy) : 0;
    if (ids.length) api.translate(ids, dx, dy);
    return;
  }

  if (action === "bringToFront") {
    const ids = Array.isArray(payload.ids) ? (payload.ids.filter((x) => typeof x === "string") as string[]) : [];
    if (ids.length) api.bringToFront(ids);
    return;
  }

  if (action === "groupSelection") {
    api.groupSelection();
    return;
  }

  if (action === "ungroupSelection") {
    api.ungroupSelection();
    return;
  }
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

function createConnectionManager(api: DesignerAPI) {
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

      client.on("message", (topic, payload) => {
        const s = coerceSettings(api.getPluginSettings(PLUGIN_ID));
        if (!s.remoteControlEnabled) return;
        if (!s.remoteControlTopic) return;
        if (topic !== s.remoteControlTopic) return;

        const text = payload.toString("utf8");
        const parsed = jsonSafeParse(text);
        applyRemoteControlCommand(api, parsed);
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
    const mgr = createConnectionManager(api);

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
