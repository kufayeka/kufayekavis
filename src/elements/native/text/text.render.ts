import React from "react";

import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine } from "../../../designer/core/engine";
import type { ElementRegistry } from "../../../designer/core/elements";
import type { DesignerDocument, TextElement } from "../../../designer/core/types";
import { getMqttScadaRuntimeFromEngine, resolveMqttClientInfoText } from "./mqttClientInfo";

type RenderCtx = {
  engine: DesignerEngine;
  api: DesignerAPI;
  element: TextElement;
  document: DesignerDocument;
  elements: ElementRegistry;
};

export function renderNativeText(ctx: unknown): unknown {
  const { api, engine, element: el } = ctx as RenderCtx;

  const mode = (el as unknown as { textSource?: unknown }).textSource;
  const mqttInfoKey = (el as unknown as { mqttInfoKey?: unknown }).mqttInfoKey;

  const content =
    mode === "mqttClientInfo"
      ? resolveMqttClientInfoText({
          key: typeof mqttInfoKey === "string" ? mqttInfoKey : undefined,
          pluginSettings: api.getPluginSettings("system.mqttScada"),
          pluginRuntime: getMqttScadaRuntimeFromEngine(engine),
        })
      : el.text;

  return React.createElement(
    "text",
    {
      x: el.x,
      y: el.y,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      textDecoration: el.textDecoration,
      fill: el.fill,
    },
    content,
  );
}
