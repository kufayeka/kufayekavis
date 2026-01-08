import type { DesignerEngine } from "../../../core/engine";
import type { DesignerAPI } from "../../../core/api";
import type { DesignerDocument, DesignerElement, CustomElement, ImageElement, TextElement, GroupElement, RectElement, CircleElement, LineElement, FreeDrawElement } from "../../../core/types";
import type { DesignerHost } from "../../../core/host";

function escapeXml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTransformAttr(
  rotation: number | undefined,
  flipH: boolean | undefined,
  flipV: boolean | undefined,
  cx: number | undefined,
  cy: number | undefined,
) {
  const parts: string[] = [];
  if ((flipH || flipV) && cx !== undefined && cy !== undefined) {
    const sx = flipH ? -1 : 1;
    const sy = flipV ? -1 : 1;
    parts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
  }
  if (rotation) parts.push(`rotate(${rotation} ${cx ?? 0} ${cy ?? 0})`);
  return parts.length ? ` transform=\"${parts.join(" ")}\"` : "";
}

function renderElementToSvg(
  el: DesignerElement,
  doc: DesignerDocument,
  deps: { engine: DesignerEngine; api: DesignerAPI; host: DesignerHost },
): string {
  const attrs = [] as string[];
  attrs.push(`opacity=\"${el.opacity}\"`);
  if (el.stroke) attrs.push(`stroke=\"${escapeXml(el.stroke)}\"`);
  attrs.push(`stroke-width=\"${el.strokeWidth}\"`);
  if (el.fill) attrs.push(`fill=\"${escapeXml(el.fill)}\"`);

  if (el.type === "rect") {
    const r = el as RectElement;
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const transform = buildTransformAttr(r.rotation, r.flipH, r.flipV, cx, cy);
    return `<rect x=\"${r.x}\" y=\"${r.y}\" width=\"${r.width}\" height=\"${r.height}\" ${attrs.join(" ")} ${transform} />`;
  }
  if (el.type === "circle") {
    const c = el as CircleElement;
    const transform = buildTransformAttr(c.rotation, c.flipH, c.flipV, c.cx, c.cy);
    return `<circle cx=\"${c.cx}\" cy=\"${c.cy}\" r=\"${c.r}\" ${attrs.join(" ")} ${transform} />`;
  }
  if (el.type === "line") {
    const l = el as LineElement;
    const cx = (l.x1 + l.x2) / 2;
    const cy = (l.y1 + l.y2) / 2;
    const transform = buildTransformAttr(l.rotation, l.flipH, l.flipV, cx, cy);
    return `<line x1=\"${l.x1}\" y1=\"${l.y1}\" x2=\"${l.x2}\" y2=\"${l.y2}\" ${attrs.join(" ")} ${transform} />`;
  }
  if (el.type === "free") {
    const f = el as FreeDrawElement;
    const transform = f.rotation ? ` transform=\"rotate(${f.rotation} 0 0)\"` : "";
    return `<path d=\"${escapeXml(f.d)}\" ${attrs.join(" ")} ${transform} />`;
  }
  if (el.type === "image") {
    const im = el as ImageElement;
    const pra = im.fit === "stretch" ? "none" : im.preserveAspectRatio;
    const cx = im.x + im.width / 2;
    const cy = im.y + im.height / 2;
    const transform = buildTransformAttr(im.rotation, im.flipH, im.flipV, cx, cy);
    const praAttr = pra ? ` preserveAspectRatio=\"${escapeXml(String(pra))}\"` : "";
    return `<image href=\"${escapeXml(im.href)}\" x=\"${im.x}\" y=\"${im.y}\" width=\"${im.width}\" height=\"${im.height}\"${praAttr} ${attrs.join(" ")} ${transform} />`;
  }
  if (el.type === "text") {
    const t = el as TextElement;
    const transform = buildTransformAttr(t.rotation, t.flipH, t.flipV, t.x, t.y);
    const styleParts: string[] = [];
    if (t.fontStyle && t.fontStyle !== "normal") styleParts.push(`font-style:${t.fontStyle}`);
    if (t.textDecoration && t.textDecoration !== "none") styleParts.push(`text-decoration:${t.textDecoration}`);
    const styleAttr = styleParts.length ? ` style=\"${escapeXml(styleParts.join(";"))}\"` : "";
    return `<text x=\"${t.x}\" y=\"${t.y}\" font-size=\"${t.fontSize}\" font-weight=\"${escapeXml(String(t.fontWeight))}\" fill=\"${escapeXml(String(t.fill))}\" opacity=\"${t.opacity}\"${styleAttr} ${transform}>${escapeXml(String(t.text ?? ""))}</text>`;
  }
  if (el.type === "custom") {
    const c = el as CustomElement;
    const cx = c.x + c.width / 2;
    const cy = c.y + c.height / 2;
    const transform = buildTransformAttr(c.rotation, c.flipH, c.flipV, cx, cy);

    const def = deps.host.elements.getDefinitionForElement(el);
    let inner = "";
    if (def?.exportSvg) {
      try {
        inner = String(def.exportSvg({ engine: deps.engine, api: deps.api, element: el, document: doc, elements: deps.host.elements }));
      } catch {
        inner = "";
      }
    }

    if (!inner) {
      const label = escapeXml(String(def?.label || c.kind || "Custom"));
      const stroke = escapeXml(String(c.stroke || "var(--foreground)"));
      const fill = escapeXml(String(c.fill || "transparent"));
      const sw = c.strokeWidth ?? 2;
      inner = `<rect x=\"0\" y=\"0\" width=\"${c.width}\" height=\"${c.height}\" fill=\"${fill}\" stroke=\"${stroke}\" stroke-width=\"${sw}\" /><text x=\"8\" y=\"20\" font-size=\"14\" fill=\"${stroke}\" opacity=\"0.85\">${label}</text>`;
    }

    const w = Math.max(1, Number(c.width) || 1);
    const h = Math.max(1, Number(c.height) || 1);
    return `<g${transform}><svg x=\"${c.x}\" y=\"${c.y}\" width=\"${w}\" height=\"${h}\" viewBox=\"0 0 ${w} ${h}\" preserveAspectRatio=\"none\">${inner}</svg></g>`;
  }
  if (el.type === "group") {
    const g = el as GroupElement;
    const children = g.childIds.map((cid) => doc.elements[cid]).filter(Boolean) as DesignerElement[];
    const inner = children.map((ch) => renderElementToSvg(ch, doc, deps)).join("\n");
    const transform = buildTransformAttr(g.rotation, g.flipH, g.flipV, 0, 0);
    return `<g ${attrs.join(" ")} ${transform}>${inner}</g>`;
  }

  return "";
}

export function exportProjectToSvgString(deps: {
  engine: DesignerEngine;
  api: DesignerAPI;
  host: DesignerHost;
  document: DesignerDocument;
}): string {
  const doc = deps.document;
  const w = doc.canvas.width;
  const h = doc.canvas.height;
  const content = doc.rootIds
    .map((id) => doc.elements[id])
    .filter(Boolean)
    .map((el) => renderElementToSvg(el as DesignerElement, doc, { engine: deps.engine, api: deps.api, host: deps.host }))
    .join("\n");

  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${w}\" height=\"${h}\" viewBox=\"0 0 ${w} ${h}\">\n${content}\n</svg>`;
}
