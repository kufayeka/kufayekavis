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

  const f = el.imageFilters;
  const isActive =
    Boolean(f) &&
    ((f?.brightness !== undefined && f.brightness !== 1) ||
      (f?.contrast !== undefined && f.contrast !== 1) ||
      (f?.saturate !== undefined && f.saturate !== 1) ||
      (f?.grayscale !== undefined && f.grayscale !== 0) ||
      (f?.blur !== undefined && f.blur !== 0));

  const filterId = isActive ? `imgf-${String(el.id)}` : undefined;

  return React.createElement(
    "image",
    {
      href: el.href,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      preserveAspectRatio,
      filter: filterId ? `url(#${filterId})` : undefined,
      role: "img",
    },
    React.createElement("title", null, el.name?.trim() ? el.name : "Image"),
  );
}
