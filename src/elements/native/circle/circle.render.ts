import React from "react";

import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine } from "../../../designer/core/engine";
import type { ElementRegistry } from "../../../designer/core/elements";
import type { CircleElement, DesignerDocument } from "../../../designer/core/types";

type RenderCtx = {
  engine: DesignerEngine;
  api: DesignerAPI;
  element: CircleElement;
  document: DesignerDocument;
  elements: ElementRegistry;
};

export function renderNativeCircle(ctx: unknown): unknown {
  const { element: el } = ctx as RenderCtx;

  return React.createElement("circle", {
    cx: el.cx,
    cy: el.cy,
    r: el.r,
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
  });
}
