import React from "react";

import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine } from "../../../designer/core/engine";
import type { ElementRegistry } from "../../../designer/core/elements";
import type { DesignerDocument, TextElement } from "../../../designer/core/types";

type RenderCtx = {
  engine: DesignerEngine;
  api: DesignerAPI;
  element: TextElement;
  document: DesignerDocument;
  elements: ElementRegistry;
};

export function renderNativeText(ctx: unknown): unknown {
  const { element: el } = ctx as RenderCtx;

  return React.createElement(
    "text",
    {
      x: el.x,
      y: el.y,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      textDecoration: el.textDecoration,
      fill: el.fill,
    },
    el.text,
  );
}
