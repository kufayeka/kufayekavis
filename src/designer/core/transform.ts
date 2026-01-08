import type { DesignerElement } from "./types";

export function translateElement(el: DesignerElement, dx: number, dy: number): DesignerElement {
  if (dx === 0 && dy === 0) return el;

  if (el.type === "rect") return { ...el, x: el.x + dx, y: el.y + dy };
  if (el.type === "image") return { ...el, x: el.x + dx, y: el.y + dy };
  if (el.type === "text") return { ...el, x: el.x + dx, y: el.y + dy };
  if (el.type === "custom") return { ...el, x: el.x + dx, y: el.y + dy };
  if (el.type === "circle") return { ...el, cx: el.cx + dx, cy: el.cy + dy };
  if (el.type === "line")
    return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
  if (el.type === "free") return { ...el, d: shiftPathD(el.d, dx, dy) };
  return el; // group has no geometry; translate children instead
}

export function shiftPathD(d: string, dx: number, dy: number): string {
  if (!d) return d;
  // Supports our generated absolute M/L sequences.
  // Strategy: replace numbers in pairs after 'M'/'L'.
  const parts = d.replace(/,/g, " ").trim().split(/\s+/);
  const out: string[] = [];
  let i = 0;
  while (i < parts.length) {
    const cmd = parts[i];
    if (cmd === "M" || cmd === "L") {
      const x = Number(parts[i + 1]);
      const y = Number(parts[i + 2]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        out.push(cmd, String(x + dx), String(y + dy));
        i += 3;
        continue;
      }
    }
    out.push(cmd);
    i += 1;
  }
  return out.join(" ");
}
