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

  const fillStyle = el.fillStyle ?? "solid";
  const edgePctRaw = typeof el.fillVerticalEdgeFadeEdgePct === "number" ? el.fillVerticalEdgeFadeEdgePct : 30;
  const edgePct = Math.max(0, Math.min(50, edgePctRaw));

  const midOpacityRaw = typeof el.fillEdgeFadeMidOpacity === "number" ? el.fillEdgeFadeMidOpacity : 0.35;
  const midOpacity = Math.max(0, Math.min(1, midOpacityRaw));

  const startMid = `${Math.max(0, edgePct * 0.5)}%`;
  const endMid = `${Math.min(100, 100 - edgePct * 0.5)}%`;

  if (fillStyle === "verticalEdgeFade" || fillStyle === "horizontalEdgeFade") {
    const gradientId = `rect-${fillStyle === "verticalEdgeFade" ? "vert" : "horiz"}-fade-${el.id}`;
    const gradientProps =
      fillStyle === "verticalEdgeFade"
        ? ({ id: gradientId, x1: "0%", y1: "0%", x2: "0%", y2: "100%" } as const)
        : ({ id: gradientId, x1: "0%", y1: "0%", x2: "100%", y2: "0%" } as const);

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        "defs",
        null,
        React.createElement(
          "linearGradient",
          gradientProps,
          React.createElement("stop", { offset: "0%", stopColor: el.fill, stopOpacity: 0 }),
          React.createElement("stop", { offset: startMid, stopColor: el.fill, stopOpacity: midOpacity }),
          React.createElement("stop", { offset: `${edgePct}%`, stopColor: el.fill, stopOpacity: 1 }),
          React.createElement("stop", { offset: `${100 - edgePct}%`, stopColor: el.fill, stopOpacity: 1 }),
          React.createElement("stop", { offset: endMid, stopColor: el.fill, stopOpacity: midOpacity }),
          React.createElement("stop", { offset: "100%", stopColor: el.fill, stopOpacity: 0 }),
        ),
      ),
      React.createElement("rect", {
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rx: el.rx,
        ry: el.ry,
        fill: `url(#${gradientId})`,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
      }),
    );
  }

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
