"use client";

import type React from "react";
import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine, DesignerState } from "../../../designer/core/engine";
import type { DesignerHost } from "../../../designer/core/host";
import type { TextElement } from "../../../designer/core/types";
import { ColorInput, Row, numberInput, textAreaInput } from "../../../designer/ui/components/properties/controls";
import { Button, ButtonGroup, MenuItem, TextField } from "@mui/material";
import { MQTT_CLIENT_INFO_OPTIONS, resolveMqttClientInfoText, getMqttScadaRuntimeFromEngine } from "./mqttClientInfo";

type PropertiesCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  api: DesignerAPI;
  host: DesignerHost;
};

export function renderTextProperties(ctxUnknown: unknown): React.ReactNode {
  const { engine, state, api } = ctxUnknown as PropertiesCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? state.doc.elements[selectedId] : null;
  if (!el || el.type !== "text") return null;

  const t = el as TextElement;
  const baseId = `el-${t.id}`;

  const textSource = (t as unknown as { textSource?: unknown }).textSource === "mqttClientInfo" ? "mqttClientInfo" : "static";
  const mqttInfoKeyRaw = (t as unknown as { mqttInfoKey?: unknown }).mqttInfoKey;
  const mqttInfoKey = typeof mqttInfoKeyRaw === "string" ? mqttInfoKeyRaw : "connectionStatus";

  const mqttPreview =
    textSource === "mqttClientInfo"
      ? resolveMqttClientInfoText({
          key: mqttInfoKey,
          pluginSettings: api.getPluginSettings("system.mqttScada"),
          pluginRuntime: getMqttScadaRuntimeFromEngine(engine),
        })
      : "";

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <Row id={`${baseId}-x`} label="X" control={numberInput(`${baseId}-x`, t.x, (v) => engine.updateElement(t.id, { x: v }))} />
      <Row id={`${baseId}-y`} label="Y" control={numberInput(`${baseId}-y`, t.y, (v) => engine.updateElement(t.id, { y: v }))} />

      <Row
        id={`${baseId}-text-source`}
        label="Content"
        control={
          <TextField
            id={`${baseId}-text-source`}
            select
            fullWidth
            value={textSource}
            onChange={(e) => {
              const v = String(e.target.value);
              if (v === "mqttClientInfo") {
                engine.updateElement(t.id, { type: "text", textSource: "mqttClientInfo", mqttInfoKey: mqttInfoKey || "connectionStatus" });
              } else {
                engine.updateElement(t.id, { type: "text", textSource: "static" });
              }
            }}
          >
            <MenuItem value="static">Static Text</MenuItem>
            <MenuItem value="mqttClientInfo">MQTT Client Info</MenuItem>
          </TextField>
        }
      />

      <div className="col-span-2">
        {textSource === "static" ? (
          <Row id={`${baseId}-text`} label="Text" control={textAreaInput(`${baseId}-text`, t.text, (v) => engine.updateElement(t.id, { text: v }))} />
        ) : (
          <div className="grid grid-cols-2 gap-2 items-center">
            <Row
              id={`${baseId}-mqtt-info-key`}
              label="MQTT Field"
              control={
                <TextField
                  id={`${baseId}-mqtt-info-key`}
                  select
                  fullWidth
                  value={mqttInfoKey}
                  onChange={(e) => engine.updateElement(t.id, { type: "text", mqttInfoKey: String(e.target.value) })}
                >
                  {MQTT_CLIENT_INFO_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              }
            />
            <Row id={`${baseId}-mqtt-preview`} label="Preview" control={<div className="text-xs text-black/70 truncate" title={mqttPreview}>{mqttPreview || "(empty)"}</div>} />
          </div>
        )}
      </div>
      <Row
        id={`${baseId}-font-size`}
        label="Font Size"
        control={numberInput(`${baseId}-font-size`, t.fontSize, (v) => engine.updateElement(t.id, { fontSize: Math.max(1, v) }))}
      />
      <Row
        id={`${baseId}-font-weight`}
        label="Weight"
        control={
          <TextField
            id={`${baseId}-font-weight`}
            select
            fullWidth
            value={t.fontWeight}
            onChange={(e) => engine.updateElement(t.id, { fontWeight: String(e.target.value) })}
          >
            <MenuItem value="normal">Normal</MenuItem>
            <MenuItem value="bold">Bold</MenuItem>
          </TextField>
        }
      />
      <Row
        id={`${baseId}-font-color`}
        label="Color"
        control={<ColorInput id={`${baseId}-font-color`} value={t.fill} onChange={(v) => engine.updateElement(t.id, { fill: v })} />}
      />
      <div className="col-span-2 flex items-center gap-2">
        <ButtonGroup>
          <Button onClick={() => engine.updateElement(t.id, { fontWeight: t.fontWeight === "bold" ? "normal" : "bold" })}>Bold</Button>
          <Button onClick={() => engine.updateElement(t.id, { fontStyle: t.fontStyle === "italic" ? "normal" : "italic" })}>Italic</Button>
          <Button onClick={() => engine.updateElement(t.id, { textDecoration: t.textDecoration === "underline" ? "none" : "underline" })}>Underline</Button>
        </ButtonGroup>
      </div>
    </div>
  );
}
