"use client";

import type React from "react";
import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine, DesignerState } from "../../../designer/core/engine";
import type { DesignerHost } from "../../../designer/core/host";
import type { LineElement } from "../../../designer/core/types";
import { Row, numberInput } from "../../../designer/ui/components/properties/controls";

type PropertiesCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  api: DesignerAPI;
  host: DesignerHost;
};

export function renderLineProperties(ctxUnknown: unknown): React.ReactNode {
  const { engine, state } = ctxUnknown as PropertiesCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? state.doc.elements[selectedId] : null;
  if (!el || el.type !== "line") return null;

  const ln = el as LineElement;
  const baseId = `el-${ln.id}`;

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <Row id={`${baseId}-x1`} label="X1" control={numberInput(`${baseId}-x1`, ln.x1, (v) => engine.updateElement(ln.id, { x1: v }))} />
      <Row id={`${baseId}-y1`} label="Y1" control={numberInput(`${baseId}-y1`, ln.y1, (v) => engine.updateElement(ln.id, { y1: v }))} />
      <Row id={`${baseId}-x2`} label="X2" control={numberInput(`${baseId}-x2`, ln.x2, (v) => engine.updateElement(ln.id, { x2: v }))} />
      <Row id={`${baseId}-y2`} label="Y2" control={numberInput(`${baseId}-y2`, ln.y2, (v) => engine.updateElement(ln.id, { y2: v }))} />
    </div>
  );
}
