export type MqttScadaSettings = {
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
  canvasEventOutputEnabled?: boolean;
  elementEventOutputEnabled?: boolean;
  defaultEventTopic?: string; // used when caller publishes to "default/events"

  // Force publish UI events even if per-element flags are not enabled.
  forcePublishElementEvents?: boolean;
  forcePublishCanvasEvents?: boolean;
};

export function coerceSettings(value: unknown): MqttScadaSettings {
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
    canvasEventOutputEnabled: typeof v.canvasEventOutputEnabled === "boolean" ? v.canvasEventOutputEnabled : true,
    elementEventOutputEnabled: typeof v.elementEventOutputEnabled === "boolean" ? v.elementEventOutputEnabled : true,
    defaultEventTopic: typeof v.defaultEventTopic === "string" ? v.defaultEventTopic : "scada/events",

    forcePublishElementEvents: typeof v.forcePublishElementEvents === "boolean" ? v.forcePublishElementEvents : false,
    forcePublishCanvasEvents: typeof v.forcePublishCanvasEvents === "boolean" ? v.forcePublishCanvasEvents : false,
  };
}
