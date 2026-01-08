import React from "react";
import type { DesignerAPI } from "../../designer/core/api";
import type { DesignerDocument, DesignerElement } from "../../designer/core/types";
import type { DesignerEngine } from "../../designer/core/engine";
import type { ElementRegistry } from "../../designer/core/elements";

type NumericDisplayProps = {
  value?: unknown;
  label?: unknown;
  backgroundColor?: unknown;
  valueColor?: unknown;
  labelColor?: unknown;
};

type RenderCtx = {
  engine: DesignerEngine;
  api: DesignerAPI;
  element: Extract<DesignerElement, { type: "custom" }>;
  document: DesignerDocument;
  elements: ElementRegistry;
};

function toNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toString(v: unknown, fallback: string): string {
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return fallback;
  return String(v);
}

export function renderNumericDisplay(ctx: unknown): unknown {
  const { element } = ctx as RenderCtx;
  const p = (element.props || {}) as NumericDisplayProps;

  // Visuals
  const w = Math.max(1, element.width);
  const h = Math.max(1, element.height);
  const bg = toString(p.backgroundColor, "var(--background)");
  const valueColor = toString(p.valueColor, "var(--foreground)");
  const labelColor = toString(p.labelColor, "var(--foreground)");
  const value = toNumber(p.value, 0);
  const label = toString(p.label, "");

  const valueFontSize = Math.max(10, Math.min(72, Math.round(h * 0.45)));
  const labelFontSize = Math.max(8, Math.min(28, Math.round(h * 0.18)));

  return React.createElement(
    React.Fragment,
    null,
    React.createElement("rect", {
      x: 0,
      y: 0,
      width: w,
      height: h,
      rx: 8,
      ry: 8,
      fill: bg,
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      opacity: 1,
    }),
    React.createElement(
      "text",
      {
        x: w / 2,
        y: h * 0.52,
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: valueFontSize,
        fontWeight: 700,
        fill: valueColor,
      },
      String(value),
    ),
    React.createElement(
      "text",
      {
        x: w / 2,
        y: h - Math.max(10, labelFontSize * 0.9),
        textAnchor: "middle",
        dominantBaseline: "alphabetic",
        fontSize: labelFontSize,
        fontWeight: 500,
        fill: labelColor,
        opacity: 0.9,
      },
      label,
    ),
  );
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

export function exportNumericDisplaySvg(ctx: unknown): string {
  const { element } = ctx as RenderCtx;
  const p = (element.props || {}) as NumericDisplayProps;

  const w = Math.max(1, element.width);
  const h = Math.max(1, element.height);
  const bg = escapeXml(toString(p.backgroundColor, "var(--background)"));
  const valueColor = escapeXml(toString(p.valueColor, "var(--foreground)"));
  const labelColor = escapeXml(toString(p.labelColor, "var(--foreground)"));
  const value = escapeXml(String(toNumber(p.value, 0)));
  const label = escapeXml(toString(p.label, ""));

  const valueFontSize = Math.max(10, Math.min(72, Math.round(h * 0.45)));
  const labelFontSize = Math.max(8, Math.min(28, Math.round(h * 0.18)));

  return [
    `<rect x="0" y="0" width="${w}" height="${h}" rx="8" ry="8" fill="${bg}" stroke="${escapeXml(element.stroke)}" stroke-width="${element.strokeWidth}" />`,
    `<text x="${w / 2}" y="${h * 0.52}" text-anchor="middle" dominant-baseline="middle" font-size="${valueFontSize}" font-weight="700" fill="${valueColor}">${value}</text>`,
    `<text x="${w / 2}" y="${h - Math.max(10, labelFontSize * 0.9)}" text-anchor="middle" font-size="${labelFontSize}" font-weight="500" fill="${labelColor}" opacity="0.9">${label}</text>`,
  ].join("");
}