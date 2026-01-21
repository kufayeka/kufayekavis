import type {
  CanvasSettings,
  CircleElement,
  CustomElement,
  DesignerDocument,
  FreeDrawElement,
  GroupElement,
  ImageElement,
  LineElement,
  RectElement,
  TextElement,
} from "./types";

export const DEFAULT_CANVAS: CanvasSettings = {
  width: 1200,
  height: 800,
  background: "var(--background)",
  gridEnabled: true,
  gridSize: 20,
  snapToGrid: false,
};

export function createEmptyDocument(): DesignerDocument {
  return {
    version: 1,
    canvas: { ...DEFAULT_CANVAS },
    elements: {},
    rootIds: [],
    nextZ: 1,
    pluginSettings: {},
    history: {
      limit: 10,
      past: [],
      future: [],
    },
  };
}

export function baseDefaults() {
  return {
    rotation: 0,
    opacity: 1,
    stroke: "black",
    strokeWidth: 2,
    fill: "transparent",
  } as const;
}

export function createRect(partial: Partial<RectElement> & { id: string; zIndex: number }): RectElement {
  return {
    id: partial.id,
    type: "rect",
    name: partial.name,
    locked: partial.locked,
    hidden: partial.hidden,
    parentId: partial.parentId,
    zIndex: partial.zIndex,
    ...baseDefaults(),
    x: partial.x ?? 100,
    y: partial.y ?? 100,
    width: partial.width ?? 140,
    height: partial.height ?? 100,
    rx: partial.rx ?? 0,
    ry: partial.ry ?? 0,

    fillStyle: partial.fillStyle ?? "solid",
    fillVerticalEdgeFadeEdgePct: partial.fillVerticalEdgeFadeEdgePct ?? 30,
    fillEdgeFadeMidOpacity: partial.fillEdgeFadeMidOpacity ?? 0.35,
    variant: partial.variant ?? "flat",
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    stroke: partial.stroke ?? baseDefaults().stroke,
    strokeWidth: partial.strokeWidth ?? baseDefaults().strokeWidth,
    fill: partial.fill ?? baseDefaults().fill,
  };
}

export function createCircle(partial: Partial<CircleElement> & { id: string; zIndex: number }): CircleElement {
  return {
    id: partial.id,
    type: "circle",
    name: partial.name,
    locked: partial.locked,
    hidden: partial.hidden,
    parentId: partial.parentId,
    zIndex: partial.zIndex,
    ...baseDefaults(),
    cx: partial.cx ?? 200,
    cy: partial.cy ?? 200,
    r: partial.r ?? 60,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    stroke: partial.stroke ?? baseDefaults().stroke,
    strokeWidth: partial.strokeWidth ?? baseDefaults().strokeWidth,
    fill: partial.fill ?? baseDefaults().fill,
  };
}

export function createLine(partial: Partial<LineElement> & { id: string; zIndex: number }): LineElement {
  return {
    id: partial.id,
    type: "line",
    name: partial.name,
    locked: partial.locked,
    hidden: partial.hidden,
    parentId: partial.parentId,
    zIndex: partial.zIndex,
    ...baseDefaults(),
    x1: partial.x1 ?? 200,
    y1: partial.y1 ?? 200,
    x2: partial.x2 ?? 320,
    y2: partial.y2 ?? 260,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    stroke: partial.stroke ?? baseDefaults().stroke,
    strokeWidth: partial.strokeWidth ?? baseDefaults().strokeWidth,
    fill: partial.fill ?? baseDefaults().fill,
  };
}

export function createFree(partial: Partial<FreeDrawElement> & { id: string; zIndex: number }): FreeDrawElement {
  return {
    id: partial.id,
    type: "free",
    name: partial.name,
    locked: partial.locked,
    hidden: partial.hidden,
    parentId: partial.parentId,
    zIndex: partial.zIndex,
    ...baseDefaults(),
    d: partial.d ?? "",
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    stroke: partial.stroke ?? baseDefaults().stroke,
    strokeWidth: partial.strokeWidth ?? baseDefaults().strokeWidth,
    fill: partial.fill ?? baseDefaults().fill,
  };
}

export function createImage(partial: Partial<ImageElement> & { id: string; zIndex: number; href: string }): ImageElement {
  return {
    id: partial.id,
    type: "image",
    name: partial.name,
    locked: partial.locked,
    hidden: partial.hidden,
    parentId: partial.parentId,
    zIndex: partial.zIndex,
    ...baseDefaults(),
    x: partial.x ?? 100,
    y: partial.y ?? 100,
    width: partial.width ?? 220,
    height: partial.height ?? 160,
    href: partial.href,
    preserveAspectRatio: partial.preserveAspectRatio ?? "xMidYMid meet",
    fit: partial.fit ?? "none",
    naturalWidth: partial.naturalWidth,
    naturalHeight: partial.naturalHeight,
    flipH: partial.flipH ?? false,
    flipV: partial.flipV ?? false,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    stroke: "transparent",
    strokeWidth: 0,
    fill: partial.fill ?? baseDefaults().fill,
  };
}

export function createText(partial: Partial<TextElement> & { id: string; zIndex: number }): TextElement {
  return {
    id: partial.id,
    type: "text",
    name: partial.name,
    locked: partial.locked,
    hidden: partial.hidden,
    parentId: partial.parentId,
    zIndex: partial.zIndex,
    ...baseDefaults(),
    x: partial.x ?? 100,
    y: partial.y ?? 100,
    text: partial.text ?? "Text",
    fontSize: partial.fontSize ?? 20,
    fontWeight: partial.fontWeight ?? "normal",
    fontStyle: partial.fontStyle ?? "normal",
    textDecoration: partial.textDecoration ?? "none",
    fill: partial.fill ?? "#000000",
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    flipH: partial.flipH ?? false,
    flipV: partial.flipV ?? false,
  };
}

export function createGroup(partial: Partial<GroupElement> & { id: string; zIndex: number; childIds: string[] }): GroupElement {
  return {
    id: partial.id,
    type: "group",
    name: partial.name,
    locked: partial.locked,
    hidden: partial.hidden,
    parentId: partial.parentId,
    zIndex: partial.zIndex,
    ...baseDefaults(),
    childIds: partial.childIds,
    rotation: 0,
    opacity: 1,
    stroke: "transparent",
    strokeWidth: 0,
    fill: partial.fill ?? baseDefaults().fill,
  };
}

export function createCustom(
  partial: Partial<CustomElement> & { id: string; zIndex: number; kind: string },
): CustomElement {
  return {
    id: partial.id,
    type: "custom",
    kind: partial.kind,
    name: partial.name,
    locked: partial.locked,
    hidden: partial.hidden,
    parentId: partial.parentId,
    zIndex: partial.zIndex,
    ...baseDefaults(),
    x: partial.x ?? 100,
    y: partial.y ?? 100,
    width: partial.width ?? 220,
    height: partial.height ?? 160,
    props: partial.props ?? {},
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    flipH: partial.flipH ?? false,
    flipV: partial.flipV ?? false,
  };
}
