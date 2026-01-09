"use client";

import type React from "react";
import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine, DesignerState } from "../../../designer/core/engine";
import type { DesignerHost } from "../../../designer/core/host";
import type { TextElement } from "../../../designer/core/types";
import { ColorInput, Row, numberInput, textAreaInput } from "../../../designer/ui/components/properties/controls";

type PropertiesCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  api: DesignerAPI;
  host: DesignerHost;
};

export function renderTextProperties(ctxUnknown: unknown): React.ReactNode {
  const { engine, state } = ctxUnknown as PropertiesCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? state.doc.elements[selectedId] : null;
  if (!el || el.type !== "text") return null;

  const t = el as TextElement;
  const baseId = `el-${t.id}`;

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <Row id={`${baseId}-x`} label="X" control={numberInput(`${baseId}-x`, t.x, (v) => engine.updateElement(t.id, { x: v }))} />
      <Row id={`${baseId}-y`} label="Y" control={numberInput(`${baseId}-y`, t.y, (v) => engine.updateElement(t.id, { y: v }))} />
      <div className="col-span-2">
        <Row id={`${baseId}-text`} label="Text" control={textAreaInput(`${baseId}-text`, t.text, (v) => engine.updateElement(t.id, { text: v }))} />
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
          <select
            id={`${baseId}-font-weight`}
            aria-labelledby={`${baseId}-font-weight-label`}
            aria-label="Weight"
            title="Weight"
            value={t.fontWeight}
            onChange={(e) => engine.updateElement(t.id, { fontWeight: e.target.value })}
            className="px-2 py-1 rounded border border-black/15 w-full"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        }
      />
      <Row
        id={`${baseId}-font-color`}
        label="Color"
        control={<ColorInput id={`${baseId}-font-color`} value={t.fill} onChange={(v) => engine.updateElement(t.id, { fill: v })} />}
      />
      <div className="col-span-2 flex items-center gap-2">
        <button className="px-2 py-1 rounded border" onClick={() => engine.updateElement(t.id, { fontWeight: t.fontWeight === "bold" ? "normal" : "bold" })}>
          Bold
        </button>
        <button className="px-2 py-1 rounded border" onClick={() => engine.updateElement(t.id, { fontStyle: t.fontStyle === "italic" ? "normal" : "italic" })}>
          Italic
        </button>
        <button
          className="px-2 py-1 rounded border"
          onClick={() => engine.updateElement(t.id, { textDecoration: t.textDecoration === "underline" ? "none" : "underline" })}
        >
          Underline
        </button>
      </div>
    </div>
  );
}
