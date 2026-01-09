import { z } from "zod";

import type { CanvasSettings, DesignerDocument, DesignerElement, ElementId } from "./types";

function toFiniteNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function zNum(defaultValue: number, opts?: { min?: number; max?: number }): z.ZodType<number> {
  const base = z.preprocess((v) => toFiniteNumber(v), z.number().default(defaultValue));
  const min = opts?.min;
  const max = opts?.max;
  return base.transform((n) => {
    let out = n;
    if (typeof min === "number") out = Math.max(min, out);
    if (typeof max === "number") out = Math.min(max, out);
    return out;
  });
}

function zBoolOptional() {
  return z.preprocess((v) => (typeof v === "boolean" ? v : undefined), z.boolean().optional());
}

function zStr(defaultValue: string): z.ZodType<string> {
  return z.preprocess((v) => (typeof v === "string" ? v : undefined), z.string().default(defaultValue));
}

function baseElementSchema(defaults?: { stroke?: string; strokeWidth?: number; fill?: string }) {
  const stroke = defaults?.stroke ?? "black";
  const strokeWidth = defaults?.strokeWidth ?? 2;
  const fill = defaults?.fill ?? "transparent";

  return z
    .object({
      id: z.preprocess((v) => (typeof v === "string" ? v : undefined), z.string().default("")),
      name: z.preprocess((v) => (typeof v === "string" ? v : undefined), z.string().optional()),
      locked: zBoolOptional(),
      hidden: zBoolOptional(),
      parentId: z.preprocess((v) => (typeof v === "string" ? v : undefined), z.string().optional()),
      zIndex: zNum(1),
      rotation: zNum(0),
      flipH: zBoolOptional(),
      flipV: zBoolOptional(),
      opacity: zNum(1, { min: 0, max: 1 }),
      stroke: zStr(stroke),
      strokeWidth: zNum(strokeWidth, { min: 0 }),
      fill: zStr(fill),

      enableOnMouseHoverEventListener: zBoolOptional(),
      enableOnMouseClickEventListener: zBoolOptional(),
      enableOnMouseLeaveEventListener: zBoolOptional(),
      mqttTopic: z.preprocess((v) => (typeof v === "string" ? v : undefined), z.string().optional()),
    })
    .loose();
}

const rectSchema = baseElementSchema().extend({
  type: z.literal("rect"),
  x: zNum(100),
  y: zNum(100),
  width: zNum(140, { min: 1 }),
  height: zNum(100, { min: 1 }),
  rx: zNum(0, { min: 0 }),
  ry: zNum(0, { min: 0 }),
});

const circleSchema = baseElementSchema().extend({
  type: z.literal("circle"),
  cx: zNum(200),
  cy: zNum(200),
  r: zNum(60, { min: 1 }),
});

const lineSchema = baseElementSchema({ fill: "transparent" })
  .extend({
    type: z.literal("line"),
    x1: zNum(200),
    y1: zNum(200),
    x2: zNum(320),
    y2: zNum(260),
  })
  .transform((el) => ({ ...el, fill: "transparent" }));

const freeSchema = baseElementSchema({ fill: "transparent" })
  .extend({
    type: z.literal("free"),
    d: zStr(""),
  })
  .transform((el) => ({ ...el, fill: "transparent" }));

const imageSchema = baseElementSchema({ stroke: "transparent", strokeWidth: 0, fill: "transparent" }).extend({
  type: z.literal("image"),
  x: zNum(100),
  y: zNum(100),
  width: zNum(220, { min: 1 }),
  height: zNum(160, { min: 1 }),
  href: zStr(""),
  preserveAspectRatio: zStr("xMidYMid meet"),
  fit: z.enum(["none", "contain", "cover", "stretch"]).optional(),
  naturalWidth: z.preprocess((v) => toFiniteNumber(v), z.number().optional()),
  naturalHeight: z.preprocess((v) => toFiniteNumber(v), z.number().optional()),
});

const textSchema = baseElementSchema({ fill: "#000000" }).extend({
  type: z.literal("text"),
  x: zNum(100),
  y: zNum(100),
  text: zStr("Text"),
  fontSize: zNum(20, { min: 1 }),
  fontWeight: zStr("normal"),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  textDecoration: z.enum(["none", "underline", "line-through"]).optional(),
  fill: zStr("#000000"),
});

const groupSchema = baseElementSchema({ stroke: "transparent", strokeWidth: 0, fill: "transparent" })
  .extend({
    type: z.literal("group"),
    childIds: z.array(z.string()).default([]),
  })
  .transform((el) => ({
    ...el,
    rotation: 0,
    opacity: 1,
    stroke: "transparent",
    strokeWidth: 0,
    fill: "transparent",
  }));

const customSchema = baseElementSchema().extend({
  type: z.literal("custom"),
  kind: zStr(""),
  x: zNum(100),
  y: zNum(100),
  width: zNum(220, { min: 1 }),
  height: zNum(160, { min: 1 }),
  props: z.preprocess(
    (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : undefined),
    z.record(z.string(), z.unknown()).default({}),
  ),
});

const elementSchema = z.discriminatedUnion("type", [rectSchema, circleSchema, lineSchema, freeSchema, imageSchema, textSchema, groupSchema, customSchema]);

export function normalizeElement(input: unknown): DesignerElement | null {
  const res = elementSchema.safeParse(input);
  return res.success ? (res.data as DesignerElement) : null;
}

const canvasSchema = z
  .object({
    width: zNum(1200, { min: 1 }),
    height: zNum(800, { min: 1 }),
    background: zStr("var(--background)"),
    gridEnabled: z.preprocess((v) => (typeof v === "boolean" ? v : undefined), z.boolean().default(true)),
    gridSize: zNum(20, { min: 1 }),
    snapToGrid: z.preprocess((v) => (typeof v === "boolean" ? v : undefined), z.boolean().default(false)),
  })
  .passthrough();

export function normalizeCanvas(input: unknown): CanvasSettings | null {
  const res = canvasSchema.safeParse(input);
  return res.success ? (res.data as CanvasSettings) : null;
}

const docSchema = z
  .object({
    version: z.literal(1),
    canvas: canvasSchema,
    elements: z.record(z.string(), z.unknown()).default({}),
    rootIds: z.array(z.string()).default([]),
    nextZ: zNum(1, { min: 1 }),
    pluginSettings: z.record(z.string(), z.unknown()).default({}),
  })
  .passthrough();

export function normalizeDocument(parsed: unknown): DesignerDocument {
  const docRes = docSchema.safeParse(parsed);
  if (!docRes.success) {
    throw new Error("Invalid project file");
  }

  const docRaw = docRes.data;
  const elements: Record<ElementId, DesignerElement> = {};
  for (const [id, raw] of Object.entries(docRaw.elements)) {
    const el = normalizeElement(raw);
    if (!el) continue;
    const finalId = el.id?.trim() ? el.id : id;
    elements[finalId] = { ...el, id: finalId };
  }

  const rootIds = (docRaw.rootIds ?? []).filter((id) => Boolean(elements[id]));

  return {
    ...(docRaw as unknown as DesignerDocument),
    version: 1,
    canvas: docRaw.canvas as CanvasSettings,
    elements,
    rootIds,
    nextZ: docRaw.nextZ as number,
    pluginSettings: docRaw.pluginSettings as Record<string, unknown>,
  };
}
