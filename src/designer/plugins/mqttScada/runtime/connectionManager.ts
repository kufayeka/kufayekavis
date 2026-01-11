import mqtt, { type IClientOptions, type MqttClient } from "mqtt";

import type { DesignerAPI } from "../../../core/api";
import type { DesignerRegistry } from "../../../core/registry";

import { PLUGIN_ID } from "../constants";
import { coerceSettings, type MqttScadaSettings } from "../settings";
import { applyRemoteControlCommand } from "./remoteControl";

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

export function createConnectionManager(api: DesignerAPI, registry?: DesignerRegistry) {
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

        // Safety: while editing, ignore remote control so properties don't change under the user.
        // View Mode behaves like Online Mode, so remote control is allowed there.
        if (!api.engine.getState().viewMode) {
          if (parsed && typeof parsed === "object" && "requestId" in (parsed as Record<string, unknown>)) {
            const requestId = (parsed as Record<string, unknown>).requestId;
            if (typeof requestId === "string" && requestId.trim()) {
              publishResponse({ requestId, ok: false, error: "Remote control is disabled in Edit Mode" });
            }
          }
          return;
        }

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
