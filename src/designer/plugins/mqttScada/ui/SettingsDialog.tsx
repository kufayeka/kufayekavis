import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, TextField } from "@mui/material";

import type { DesignerAPI } from "../../../core/api";

import { PLUGIN_ID } from "../constants";
import { coerceSettings, type MqttScadaSettings } from "../settings";
import { createConnectionManager } from "../runtime/connectionManager";

export function SettingsDialog({ api }: { api: DesignerAPI }) {
  const initial = useMemo(() => coerceSettings(api.getPluginSettings(PLUGIN_ID)), [api]);
  const [settings, setSettings] = useState<MqttScadaSettings>(initial);

  const [testStatus, setTestStatus] = useState<{ kind: "idle" | "testing" | "ok" | "error"; message?: string }>({
    kind: "idle",
  });

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
        <TextField
          label="Broker WS URL"
          value={settings.url}
          onChange={(e) => setSettings((s) => ({ ...s, url: e.target.value }))}
          placeholder="ws://host:port/mqtt"
          fullWidth
        />

        <TextField
          label="Client ID"
          value={settings.clientId ?? ""}
          onChange={(e) => setSettings((s) => ({ ...s, clientId: e.target.value }))}
          placeholder="optional"
          fullWidth
        />

        <TextField
          label="Username"
          value={settings.username ?? ""}
          onChange={(e) => setSettings((s) => ({ ...s, username: e.target.value }))}
          placeholder="optional"
          fullWidth
        />

        <TextField
          label="Password"
          type="password"
          value={settings.password ?? ""}
          onChange={(e) => setSettings((s) => ({ ...s, password: e.target.value }))}
          placeholder="optional"
          fullWidth
        />

        <TextField
          label="Keepalive (s)"
          type="number"
          inputProps={{ min: 0 }}
          value={settings.keepalive ?? 30}
          onChange={(e) => setSettings((s) => ({ ...s, keepalive: Number(e.target.value) }))}
          fullWidth
        />

        <TextField
          label="Reconnect (ms)"
          type="number"
          inputProps={{ min: 0 }}
          value={settings.reconnectPeriodMs ?? 2000}
          onChange={(e) => setSettings((s) => ({ ...s, reconnectPeriodMs: Number(e.target.value) }))}
          fullWidth
        />

        <FormControlLabel
          control={
            <Checkbox checked={settings.clean ?? true} onChange={(e) => setSettings((s) => ({ ...s, clean: e.target.checked }))} />
          }
          label="Clean session"
        />
      </div>

      <div className="rounded border border-black/10 p-3 space-y-2">
        <div className="text-sm font-medium">Remote Control Interface</div>
        <FormControlLabel
          control={
            <Checkbox
              checked={settings.remoteControlEnabled ?? true}
              onChange={(e) => setSettings((s) => ({ ...s, remoteControlEnabled: e.target.checked }))}
            />
          }
          label="Enable remote control subscribe"
        />
        <TextField
          label="Remote control topic"
          value={settings.remoteControlTopic ?? ""}
          onChange={(e) => setSettings((s) => ({ ...s, remoteControlTopic: e.target.value }))}
          placeholder="scada/rc"
          fullWidth
        />
        <TextField
          label="Response topic (optional)"
          value={settings.remoteControlResponseTopic ?? ""}
          onChange={(e) => setSettings((s) => ({ ...s, remoteControlResponseTopic: e.target.value }))}
          placeholder="scada/rc/resp"
          fullWidth
        />
        <div className="text-xs text-black/60">
          Message format: <span className="font-mono">{"{"}action, payload{"}"}</span>
        </div>
      </div>

      <div className="rounded border border-black/10 p-3 space-y-2">
        <div className="text-sm font-medium">Event Output Interface</div>
        <FormControlLabel
          control={
            <Checkbox
              checked={settings.eventOutputEnabled ?? true}
              onChange={(e) => setSettings((s) => ({ ...s, eventOutputEnabled: e.target.checked }))}
            />
          }
          label="Enable event publish"
        />

        <div className="flex flex-col gap-1">
          <FormControlLabel
            control={
              <Checkbox
                checked={settings.canvasEventOutputEnabled ?? true}
                onChange={(e) => setSettings((s) => ({ ...s, canvasEventOutputEnabled: e.target.checked }))}
              />
            }
            label="Publish canvas events"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={settings.elementEventOutputEnabled ?? true}
                onChange={(e) => setSettings((s) => ({ ...s, elementEventOutputEnabled: e.target.checked }))}
              />
            }
            label="Publish element events"
          />
        </div>
        <TextField
          label="Default event topic"
          value={settings.defaultEventTopic ?? ""}
          onChange={(e) => setSettings((s) => ({ ...s, defaultEventTopic: e.target.value }))}
          placeholder="scada/events"
          fullWidth
        />
        <div className="text-xs text-black/60">
          Elements can override per element via <span className="font-mono">mqttTopic</span>.
        </div>

        <FormControlLabel
          control={
            <Checkbox
              checked={settings.forcePublishElementEvents ?? false}
              onChange={(e) => setSettings((s) => ({ ...s, forcePublishElementEvents: e.target.checked }))}
            />
          }
          label="Force publish element events (ignore per-element flags)"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={settings.forcePublishCanvasEvents ?? false}
              onChange={(e) => setSettings((s) => ({ ...s, forcePublishCanvasEvents: e.target.checked }))}
            />
          }
          label="Force publish canvas events"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => {
            api.setPluginSettings(PLUGIN_ID, settings);
            setTestStatus({ kind: "idle" });
          }}
        >
          Save
        </Button>

        <Button
          onClick={async () => {
            setTestStatus({ kind: "testing", message: "Testing..." });
            const mgr = createConnectionManager(api);
            const res = await mgr.testConnection(settings);
            setTestStatus(res.ok ? { kind: "ok", message: res.message } : { kind: "error", message: res.message });
          }}
          disabled={testStatus.kind === "testing"}
        >
          Test
        </Button>

        {testStatus.kind !== "idle" && (
          <Alert severity={testStatus.kind === "ok" ? "success" : testStatus.kind === "error" ? "error" : "info"}>
            {testStatus.message ?? ""}
          </Alert>
        )}
      </div>
    </div>
  );
}
