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

  const variant = el.variant ?? "flat";

  const buildFilter = () => {
    if (variant === "flat") return null;
    const fid = `rect-variant-${variant}-${el.id}`;

    // Parameters tuned per variant
    const params = variant === "emboss"
      ? { highlightOpacity: 0.6, shadowOpacity: 0.45, blur: 2, offset: 2 }
      : { highlightOpacity: 0.35, shadowOpacity: 0.35, blur: 1.2, offset: 1 };

    return React.createElement(
      "filter",
      { id: fid, x: "-20%", y: "-20%", width: "140%", height: "140%", filterUnits: "objectBoundingBox" },
      // highlight (top-left)
      React.createElement("feOffset", { dx: -params.offset, dy: -params.offset, result: "off1" }),
      React.createElement("feGaussianBlur", { in: "off1", stdDeviation: params.blur, result: "blur1" }),
      React.createElement("feFlood", { floodColor: "#ffffff", floodOpacity: params.highlightOpacity, result: "flood1" }),
      React.createElement("feComposite", { in: "flood1", in2: "blur1", operator: "in", result: "comp1" }),
      // shadow (bottom-right)
      React.createElement("feOffset", { dx: params.offset, dy: params.offset, result: "off2" }),
      React.createElement("feGaussianBlur", { in: "off2", stdDeviation: params.blur, result: "blur2" }),
      React.createElement("feFlood", { floodColor: "#000000", floodOpacity: params.shadowOpacity, result: "flood2" }),
      React.createElement("feComposite", { in: "flood2", in2: "blur2", operator: "in", result: "comp2" }),
      React.createElement(
        "feMerge",
        null,
        React.createElement("feMergeNode", { in: "comp1" }),
        React.createElement("feMergeNode", { in: "comp2" }),
        React.createElement("feMergeNode", { in: "SourceGraphic" }),
      ),
    );
  };

  const filterDef = buildFilter();

  if (fillStyle === "verticalEdgeFade" || fillStyle === "horizontalEdgeFade") {
    const gradientId = `rect-${fillStyle === "verticalEdgeFade" ? "vert" : "horiz"}-fade-${el.id}`;
    const gradientProps =
      fillStyle === "verticalEdgeFade"
        ? { id: gradientId, x1: "0%", y1: "0%", x2: "0%", y2: "100%" }
        : { id: gradientId, x1: "0%", y1: "0%", x2: "100%", y2: "0%" };

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        "defs",
        null,
        React.createElement(
          "linearGradient",
          gradientProps as unknown as React.SVGProps<SVGLinearGradientElement>,
          React.createElement("stop", { offset: "0%", stopColor: el.fill, stopOpacity: 0 }),
          React.createElement("stop", { offset: startMid, stopColor: el.fill, stopOpacity: midOpacity }),
          React.createElement("stop", { offset: `${edgePct}%`, stopColor: el.fill, stopOpacity: 1 }),
          React.createElement("stop", { offset: `${100 - edgePct}%`, stopColor: el.fill, stopOpacity: 1 }),
          React.createElement("stop", { offset: endMid, stopColor: el.fill, stopOpacity: midOpacity }),
          React.createElement("stop", { offset: "100%", stopColor: el.fill, stopOpacity: 0 }),
        ),
        filterDef,
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
        filter: variant === "flat" ? undefined : `url(#rect-variant-${variant}-${el.id})`,
      }),
    );
  }

  if (variant !== "flat") {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement("defs", null, filterDef),
      React.createElement("rect", {
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rx: el.rx,
        ry: el.ry,
        fill: el.fill,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        filter: `url(#rect-variant-${variant}-${el.id})`,
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
