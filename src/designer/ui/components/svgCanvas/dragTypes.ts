import type { DesignerElement, ElementId } from "../../../core/types";

export type DragMode =
  | { kind: "none" }
  | {
      kind: "move";
      startX: number;
      startY: number;
      originX: number;
      originY: number;
      ids: ElementId[];
      startElements: Record<ElementId, DesignerElement>;
      startBox: { x: number; y: number; width: number; height: number } | null;
      lastDx: number;
      lastDy: number;
      originalTransforms: Record<ElementId, string>;
    }
  | {
      kind: "marquee";
      startX: number;
      startY: number;
      x: number;
      y: number;
      append: boolean;
    }
  | {
      kind: "resize-rect";
      id: ElementId;
      handle: "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w";
      startX: number;
      startY: number;
      start: { x: number; y: number; w: number; h: number };
      startRotation: number;
    }
  | {
      kind: "resize-text";
      id: ElementId;
      handle: "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w";
      startX: number;
      startY: number;
      startFontSize: number;
      startRotation: number;
    }
  | { kind: "rotate"; id: ElementId; startAngle: number; startRotation: number; center: { x: number; y: number } }
  | { kind: "line-end"; id: ElementId; end: "p1" | "p2" }
  | { kind: "circle-r"; id: ElementId }
  | { kind: "free"; points: Array<{ x: number; y: number }> };
