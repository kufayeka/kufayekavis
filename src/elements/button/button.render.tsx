"use client";

import type React from "react";

import type { CustomElement } from "../../designer/core/types";

import styles from "./button.render.module.css";

type ButtonProps = {
  text?: unknown;
  backgroundColor?: unknown;
  textColor?: unknown;
  fontSize?: unknown;
  fontWeight?: unknown;
  bold?: unknown;
  italic?: unknown;
  underline?: unknown;
  borderRadius?: unknown;
  onClickAction?: unknown;
};

function toString(v: unknown, fallback: string): string {
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function toNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
    if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  }
  if (typeof v === "number") return v !== 0;
  return fallback;
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function coerceFontWeight(props: ButtonProps): number {
  const bold = toBool(props.bold, false);
  if (bold) return 700;

  const fw = props.fontWeight;
  if (typeof fw === "number" && Number.isFinite(fw)) return clampInt(fw, 100, 900);
  if (typeof fw === "string") {
    const s = fw.trim().toLowerCase();
    if (s === "bold") return 700;
    if (s === "normal") return 400;
    const n = Number(s);
    if (Number.isFinite(n)) return clampInt(n, 100, 900);
  }
  return 400;
}

export function renderButton(ctxUnknown: unknown): React.ReactNode {
  const ctx = ctxUnknown as { element: CustomElement };
  const el = ctx.element;
  const p = (el.props || {}) as ButtonProps;

  const text = toString(p.text, "Button");
  const backgroundColor = toString(p.backgroundColor, "#007bff");
  const textColor = toString(p.textColor, "#ffffff");
  const fontSize = toNumber(p.fontSize, 14);
  const fontWeight = coerceFontWeight(p);
  const italic = toBool(p.italic, false);
  const underline = toBool(p.underline, false);
  const borderRadius = toNumber(p.borderRadius, 4);

  const w = Math.max(1, el.width);
  const h = Math.max(1, el.height);

  return (
    <g className={styles.root}>
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={borderRadius}
        ry={borderRadius}
        fill={backgroundColor}
        stroke="none"
      />
      <text
        className={styles.label}
        x={w / 2}
        y={h / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontWeight={fontWeight}
        fontStyle={italic ? "italic" : "normal"}
        textDecoration={underline ? "underline" : "none"}
        fill={textColor}
      >
        {text}
      </text>
    </g>
  );
}

export function exportButtonSvg(ctxUnknown: unknown): string {
  const ctx = ctxUnknown as { element: CustomElement };
  const el = ctx.element;
  const p = (el.props || {}) as ButtonProps;

  const text = toString(p.text, "Button");
  const backgroundColor = toString(p.backgroundColor, "#007bff");
  const textColor = toString(p.textColor, "#ffffff");
  const fontSize = toNumber(p.fontSize, 14);
  const fontWeight = coerceFontWeight(p);
  const italic = toBool(p.italic, false);
  const underline = toBool(p.underline, false);
  const borderRadius = toNumber(p.borderRadius, 4);

  const w = Math.max(1, el.width);
  const h = Math.max(1, el.height);

  // For SVG export, render as rect with text
  return `
    <rect x="0" y="0" width="${w}" height="${h}" rx="${borderRadius}" ry="${borderRadius}" fill="${backgroundColor}" stroke="none" />
    <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${italic ? "italic" : "normal"}" text-decoration="${underline ? "underline" : "none"}" fill="${textColor}">${text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</text>
  `;
}