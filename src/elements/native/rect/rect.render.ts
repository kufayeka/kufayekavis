import React from "react";

import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine } from "../../../designer/core/engine";
import type { ElementRegistry } from "../../../designer/core/elements";
import type { DesignerDocument, RectElement } from "../../../designer/core/types";

type RenderCtx = {
  engine: DesignerEngine;
  api: DesignerAPI;
  element: RectElement;
  document: DesignerDocument;
  elements: ElementRegistry;
};

export function renderNativeRect(ctx: unknown): unknown {
  const { element: el } = ctx as RenderCtx;

  return React.createElement("rect", {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rx: el.rx,
    ry: el.ry,
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
  });
}
