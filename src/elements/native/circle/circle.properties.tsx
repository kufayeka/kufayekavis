"use client";

import type React from "react";
import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine, DesignerState } from "../../../designer/core/engine";
import type { DesignerHost } from "../../../designer/core/host";
import type { CircleElement } from "../../../designer/core/types";
import { Row, numberInput } from "../../../designer/ui/components/properties/controls";

type PropertiesCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  api: DesignerAPI;
  host: DesignerHost;
};

export function renderCircleProperties(ctxUnknown: unknown): React.ReactNode {
  const { engine, state } = ctxUnknown as PropertiesCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? state.doc.elements[selectedId] : null;
  if (!el || el.type !== "circle") return null;

  const c = el as CircleElement;
  const baseId = `el-${c.id}`;

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <Row id={`${baseId}-cx`} label="CX" control={numberInput(`${baseId}-cx`, c.cx, (v) => engine.updateElement(c.id, { cx: v }))} />
      <Row id={`${baseId}-cy`} label="CY" control={numberInput(`${baseId}-cy`, c.cy, (v) => engine.updateElement(c.id, { cy: v }))} />
      <Row id={`${baseId}-r`} label="R" control={numberInput(`${baseId}-r`, c.r, (v) => engine.updateElement(c.id, { r: Math.max(1, v) }))} />
    </div>
  );
}
