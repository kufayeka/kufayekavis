import React from "react";

import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine } from "../../../designer/core/engine";
import type { ElementRegistry } from "../../../designer/core/elements";
import type { DesignerDocument, LineElement } from "../../../designer/core/types";

type RenderCtx = {
  engine: DesignerEngine;
  api: DesignerAPI;
  element: LineElement;
  document: DesignerDocument;
  elements: ElementRegistry;
};

export function renderNativeLine(ctx: unknown): unknown {
  const { element: el } = ctx as RenderCtx;

  return React.createElement("line", {
    x1: el.x1,
    y1: el.y1,
    x2: el.x2,
    y2: el.y2,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
  });
}
