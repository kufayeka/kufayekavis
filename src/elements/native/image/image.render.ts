import React from "react";

import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine } from "../../../designer/core/engine";
import type { ElementRegistry } from "../../../designer/core/elements";
import type { DesignerDocument, ImageElement } from "../../../designer/core/types";

type RenderCtx = {
  engine: DesignerEngine;
  api: DesignerAPI;
  element: ImageElement;
  document: DesignerDocument;
  elements: ElementRegistry;
};

export function renderNativeImage(ctx: unknown): unknown {
  const { element: el } = ctx as RenderCtx;
  const preserveAspectRatio = el.fit === "stretch" ? "none" : el.preserveAspectRatio;

  return React.createElement(
    "image",
    {
      href: el.href,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      preserveAspectRatio,
      role: "img",
    },
    React.createElement("title", null, el.name?.trim() ? el.name : "Image"),
  );
}
