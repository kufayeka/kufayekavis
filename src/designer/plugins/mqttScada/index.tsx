"use client";

import type { DesignerPlugin } from "../../core/plugins";
import type { DesignerAPI } from "../../core/api";

import { DIALOG_ID, PLUGIN_ID } from "./constants";
import { coerceSettings } from "./settings";
import { createConnectionManager } from "./runtime/connectionManager";
import { SettingsDialog } from "./ui/SettingsDialog";

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
