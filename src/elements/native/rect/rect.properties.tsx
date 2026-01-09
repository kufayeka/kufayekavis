"use client";

import type React from "react";
import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine, DesignerState } from "../../../designer/core/engine";
import type { DesignerHost } from "../../../designer/core/host";
import type { RectElement } from "../../../designer/core/types";
import { Row, numberInput } from "../../../designer/ui/components/properties/controls";

type PropertiesCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  api: DesignerAPI;
  host: DesignerHost;
};

export function renderRectProperties(ctxUnknown: unknown): React.ReactNode {
  const { engine, state } = ctxUnknown as PropertiesCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? state.doc.elements[selectedId] : null;
  if (!el || el.type !== "rect") return null;

  const r = el as RectElement;
  const baseId = `el-${r.id}`;

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <Row id={`${baseId}-x`} label="X" control={numberInput(`${baseId}-x`, r.x, (v) => engine.updateElement(r.id, { x: v }))} />
      <Row id={`${baseId}-y`} label="Y" control={numberInput(`${baseId}-y`, r.y, (v) => engine.updateElement(r.id, { y: v }))} />
      <Row id={`${baseId}-w`} label="W" control={numberInput(`${baseId}-w`, r.width, (v) => engine.updateElement(r.id, { width: Math.max(1, v) }))} />
      <Row id={`${baseId}-h`} label="H" control={numberInput(`${baseId}-h`, r.height, (v) => engine.updateElement(r.id, { height: Math.max(1, v) }))} />
    </div>
  );
}
