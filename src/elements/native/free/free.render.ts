import React from "react";

import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine } from "../../../designer/core/engine";
import type { ElementRegistry } from "../../../designer/core/elements";
import type { DesignerDocument, FreeDrawElement } from "../../../designer/core/types";

type RenderCtx = {
  engine: DesignerEngine;
  api: DesignerAPI;
  element: FreeDrawElement;
  document: DesignerDocument;
  elements: ElementRegistry;
};

export function renderNativeFree(ctx: unknown): unknown {
  const { element: el } = ctx as RenderCtx;

  return React.createElement("path", {
    d: el.d,
    fill: "none",
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
  });
}
