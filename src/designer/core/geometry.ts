import type { DesignerDocument, DesignerElement, ElementId, Vec2 } from "./types";
import { bboxFromPoints } from "./math";

export type BBox = { x: number; y: number; width: number; height: number };

export function getElementBBox(el: DesignerElement, doc: DesignerDocument): BBox {
  if (el.type === "rect") return { x: el.x, y: el.y, width: el.width, height: el.height };
  if (el.type === "image") return { x: el.x, y: el.y, width: el.width, height: el.height };
  if (el.type === "custom") return { x: el.x, y: el.y, width: el.width, height: el.height };
  if (el.type === "circle") return { x: el.cx - el.r, y: el.cy - el.r, width: el.r * 2, height: el.r * 2 };
  if (el.type === "line") {
    const x = Math.min(el.x1, el.x2);
    const y = Math.min(el.y1, el.y2);
    return { x, y, width: Math.abs(el.x2 - el.x1), height: Math.abs(el.y2 - el.y1) };
  }
  if (el.type === "text") {
    // Approximate bbox: SVG <text> uses baseline at (x,y).
    // We estimate width from character count and font size.
    const fontSize = Math.max(1, el.fontSize || 16);
    const text = (el.text || "").toString();
    const width = Math.max(1, text.length * fontSize * 0.6);
    const height = Math.max(1, fontSize * 1.2);
    return { x: el.x, y: el.y - height, width, height };
  }
  if (el.type === "free") {
    const points = extractPointsFromPath(el.d);
    return bboxFromPoints(points);
  }
  // group
  const childIds = Array.isArray(el.childIds) ? el.childIds : [];
  const boxes = childIds
    .map((id) => doc.elements[id])
    .filter(Boolean)
    .map((child) => getElementBBox(child!, doc));
  if (boxes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function getSelectionBBox(ids: ElementId[], doc: DesignerDocument): BBox | null {
  const boxes = ids
    .map((id) => doc.elements[id])
    .filter(Boolean)
    .map((el) => getElementBBox(el!, doc));
  if (boxes.length === 0) return null;
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function getBBoxCenter(b: BBox): Vec2 {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

function extractPointsFromPath(d: string): Vec2[] {
  // Supports paths we generate: absolute M/L sequences (e.g. "M 10 10 L 20 20 L 30 10").
  // For unknown commands, this intentionally returns empty points.
  if (!d) return [];
  const tokens = d
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const points: Vec2[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "M" || t === "L") {
      const x = Number(tokens[i + 1]);
      const y = Number(tokens[i + 2]);
      if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
      i += 3;
      continue;
    }
    // Unknown/unsupported token
    i++;
  }
  return points;
}
