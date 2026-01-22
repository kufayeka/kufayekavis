import { coerceSettings } from "../../../designer/plugins/mqttScada/settings";
import { PLUGIN_ID } from "../../../designer/plugins/mqttScada/constants";

export type MqttClientInfoKey =
  | "connectionStatus"
  | "connected"
  | "brokerUrl"
  | "clientId"
  | "lastConnectedAt"
  | "lastDisconnectedAt"
  | "reconnectCount"
  | "lastError"
  | "remoteControlTopic"
  | "defaultEventTopic"
  | "forcePublishElementEvents";

export const MQTT_CLIENT_INFO_OPTIONS: ReadonlyArray<{ value: MqttClientInfoKey; label: string }> = [
  { value: "connectionStatus", label: "Connection Status" },
  { value: "connected", label: "Connected (true/false)" },
  { value: "brokerUrl", label: "Broker WS URL" },
  { value: "clientId", label: "Client ID" },
  { value: "lastConnectedAt", label: "Last Connected" },
  { value: "lastDisconnectedAt", label: "Last Disconnected" },
  { value: "reconnectCount", label: "Reconnect Count" },
  { value: "lastError", label: "Last Error" },
  { value: "remoteControlTopic", label: "Remote Control Topic" },
  { value: "defaultEventTopic", label: "Default Event Topic" },
  { value: "forcePublishElementEvents", label: "Force Publish Element Events" },
];

export type MqttScadaRuntimeInfo = {
  status?: string;
  connected?: boolean;
  url?: string;
  clientId?: string;
  lastConnectedAt?: number;
  lastDisconnectedAt?: number;
  reconnectCount?: number;
  lastError?: string;
};

function fmtDateTime(ms: number | undefined): string {
  if (!ms || !Number.isFinite(ms)) return "-";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

export function resolveMqttClientInfoText(args: {
  key: string | undefined;
  pluginSettings: unknown;
  pluginRuntime: unknown;
}): string {
  const settings = coerceSettings(args.pluginSettings);
  const runtime = (args.pluginRuntime ?? {}) as MqttScadaRuntimeInfo;

  const key = (args.key ?? "connectionStatus") as MqttClientInfoKey;

  switch (key) {
    case "connectionStatus":
      return runtime.status ?? "disconnected";
    case "connected":
      return String(Boolean(runtime.connected));
    case "brokerUrl":
      return settings.url?.trim() ? settings.url.trim() : "";
    case "clientId":
      return runtime.clientId?.trim() ? runtime.clientId.trim() : settings.clientId?.trim() ? settings.clientId.trim() : "";
    case "lastConnectedAt":
      return fmtDateTime(runtime.lastConnectedAt);
    case "lastDisconnectedAt":
      return fmtDateTime(runtime.lastDisconnectedAt);
    case "reconnectCount":
      return String(runtime.reconnectCount ?? 0);
    case "lastError":
      return runtime.lastError?.trim() ? runtime.lastError.trim() : "";
    case "remoteControlTopic":
      return settings.remoteControlTopic?.trim() ? settings.remoteControlTopic.trim() : "";
    case "defaultEventTopic":
      return settings.defaultEventTopic?.trim() ? settings.defaultEventTopic.trim() : "";
    case "forcePublishElementEvents":
      return String(Boolean(settings.forcePublishElementEvents));
    default:
      return `Unknown key: ${String(args.key ?? "")}`;
  }
}

export function getMqttScadaRuntimeFromEngine(engine: { getRuntimePluginData: (pluginId: string) => unknown }): unknown {
  try {
    return engine.getRuntimePluginData(PLUGIN_ID);
  } catch {
    return undefined;
  }
}
