"use client";

import type React from "react";
import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine, DesignerState } from "../../../designer/core/engine";
import type { DesignerHost } from "../../../designer/core/host";
import type { FreeDrawElement } from "../../../designer/core/types";
import { Row, textInput } from "../../../designer/ui/components/properties/controls";

type PropertiesCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  api: DesignerAPI;
  host: DesignerHost;
};

export function renderFreeProperties(ctxUnknown: unknown): React.ReactNode {
  const { engine, state } = ctxUnknown as PropertiesCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? state.doc.elements[selectedId] : null;
  if (!el || el.type !== "free") return null;

  const f = el as FreeDrawElement;
  const baseId = `el-${f.id}`;

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <Row id={`${baseId}-path`} label="Path" control={textInput(`${baseId}-path`, f.d, (v) => engine.updateElement(f.id, { d: v }))} />
    </div>
  );
}
