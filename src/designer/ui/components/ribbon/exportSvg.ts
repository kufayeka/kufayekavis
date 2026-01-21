import type { DesignerEngine } from "../../../core/engine";
import type { DesignerAPI } from "../../../core/api";
import type { DesignerDocument, DesignerElement, CustomElement, ImageElement, TextElement, GroupElement, RectElement, CircleElement, LineElement, FreeDrawElement } from "../../../core/types";
import type { DesignerHost } from "../../../core/host";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function imageFilterIsActive(im: ImageElement): boolean {
  const f = im.imageFilters;
  if (!f) return false;
  return (
    (f.brightness !== undefined && f.brightness !== 1) ||
    (f.contrast !== undefined && f.contrast !== 1) ||
    (f.saturate !== undefined && f.saturate !== 1) ||
    (f.grayscale !== undefined && f.grayscale !== 0) ||
    (f.blur !== undefined && f.blur !== 0)
  );
}

function buildImageFilterDef(im: ImageElement): string {
  const f = im.imageFilters ?? {};
  const brightness = clamp(typeof f.brightness === "number" ? f.brightness : 1, 0, 3);
  const contrast = clamp(typeof f.contrast === "number" ? f.contrast : 1, 0, 3);
  const saturate = clamp(typeof f.saturate === "number" ? f.saturate : 1, 0, 3);
  const grayscale = clamp01(typeof f.grayscale === "number" ? f.grayscale : 0);
  const blur = clamp(typeof f.blur === "number" ? f.blur : 0, 0, 50);

  const slope = brightness * contrast;
  const intercept = 0.5 - 0.5 * contrast;
  const sat = clamp01(saturate);
  const finalSat = clamp01(sat * (1 - grayscale));
  const blurNode = blur > 0 ? `\n    <feGaussianBlur stdDeviation=\"${blur}\" />` : "";

  return `<filter id=\"imgf-${escapeXml(String(im.id))}\" color-interpolation-filters=\"sRGB\">\n    <feColorMatrix type=\"saturate\" values=\"${finalSat}\" />\n    <feComponentTransfer>\n      <feFuncR type=\"linear\" slope=\"${slope}\" intercept=\"${intercept}\" />\n      <feFuncG type=\"linear\" slope=\"${slope}\" intercept=\"${intercept}\" />\n      <feFuncB type=\"linear\" slope=\"${slope}\" intercept=\"${intercept}\" />\n      <feFuncA type=\"linear\" slope=\"1\" intercept=\"0\" />\n    </feComponentTransfer>${blurNode}\n  </filter>`;
}

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

    const fillStyle = r.fillStyle ?? "solid";
    const variant = r.variant ?? "flat";

    if (fillStyle === "verticalEdgeFade" || fillStyle === "horizontalEdgeFade") {
      const edgePctRaw = typeof r.fillVerticalEdgeFadeEdgePct === "number" ? r.fillVerticalEdgeFadeEdgePct : 30;
      const edgePct = clamp(edgePctRaw, 0, 50);
      const midOpacityRaw = typeof r.fillEdgeFadeMidOpacity === "number" ? r.fillEdgeFadeMidOpacity : 0.35;
      const midOpacity = clamp01(midOpacityRaw);

      const gid = `rect-${fillStyle === "verticalEdgeFade" ? "vert" : "horiz"}-fade-${escapeXml(String(r.id))}`;
      const axisAttrs =
        fillStyle === "verticalEdgeFade"
          ? `x1="0%" y1="0%" x2="0%" y2="100%"`
          : `x1="0%" y1="0%" x2="100%" y2="0%"`;

      const startMid = clamp(edgePct * 0.5, 0, 50);
      const endMid = 100 - startMid;

      const filterDef = variant === "flat" ? "" : (() => {
        // simple filter defs matching renderer
        if (variant === "emboss") {
          return `<filter id="rect-variant-emboss-${escapeXml(String(r.id))}" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox">\n  <feOffset dx=\"-2\" dy=\"-2\" result=\"off1\" />\n  <feGaussianBlur in=\"off1\" stdDeviation=\"2\" result=\"blur1\" />\n  <feFlood flood-color=\"#ffffff\" flood-opacity=\"0.6\" result=\"flood1\" />\n  <feComposite in=\"flood1\" in2=\"blur1\" operator=\"in\" result=\"comp1\" />\n  <feOffset dx=\"2\" dy=\"2\" result=\"off2\" />\n  <feGaussianBlur in=\"off2\" stdDeviation=\"2\" result=\"blur2\" />\n  <feFlood flood-color=\"#000000\" flood-opacity=\"0.45\" result=\"flood2\" />\n  <feComposite in=\"flood2\" in2=\"blur2\" operator=\"in\" result=\"comp2\" />\n  <feMerge>\n    <feMergeNode in=\"comp1\"/>\n    <feMergeNode in=\"comp2\"/>\n    <feMergeNode in=\"SourceGraphic\"/>\n  </feMerge>\n</filter>`;
        }
        // bevel
        return `<filter id=\"rect-variant-bevel-${escapeXml(String(r.id))}\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\" filterUnits=\"objectBoundingBox\">\n  <feOffset dx=\"-1\" dy=\"-1\" result=\"off1\" />\n  <feGaussianBlur in=\"off1\" stdDeviation=\"1.2\" result=\"blur1\" />\n  <feFlood flood-color=\"#ffffff\" flood-opacity=\"0.35\" result=\"flood1\" />\n  <feComposite in=\"flood1\" in2=\"blur1\" operator=\"in\" result=\"comp1\" />\n  <feOffset dx=\"1\" dy=\"1\" result=\"off2\" />\n  <feGaussianBlur in=\"off2\" stdDeviation=\"1.2\" result=\"blur2\" />\n  <feFlood flood-color=\"#000000\" flood-opacity=\"0.35\" result=\"flood2\" />\n  <feComposite in=\"flood2\" in2=\"blur2\" operator=\"in\" result=\"comp2\" />\n  <feMerge>\n    <feMergeNode in=\"comp1\"/>\n    <feMergeNode in=\"comp2\"/>\n    <feMergeNode in=\"SourceGraphic\"/>\n  </feMerge>\n</filter>`;
      })();

      // Inline defs for this rect (keeps export logic simple and self-contained)
      const defs = `<defs>\n  <linearGradient id=\"${gid}\" ${axisAttrs}>\n    <stop offset=\"0%\" stop-color=\"${escapeXml(String(r.fill))}\" stop-opacity=\"0\" />\n    <stop offset=\"${startMid}%\" stop-color=\"${escapeXml(String(r.fill))}\" stop-opacity=\"${midOpacity}\" />\n    <stop offset=\"${edgePct}%\" stop-color=\"${escapeXml(String(r.fill))}\" stop-opacity=\"1\" />\n    <stop offset=\"${100 - edgePct}%\" stop-color=\"${escapeXml(String(r.fill))}\" stop-opacity=\"1\" />\n    <stop offset=\"${endMid}%\" stop-color=\"${escapeXml(String(r.fill))}\" stop-opacity=\"${midOpacity}\" />\n    <stop offset=\"100%\" stop-color=\"${escapeXml(String(r.fill))}\" stop-opacity=\"0\" />\n  </linearGradient>\n${filterDef}\n</defs>`;

      const attrsNoFill = attrs.filter((a) => !a.startsWith("fill=\""));
      attrsNoFill.push(`fill=\"url(#${gid})\"`);
      if (variant !== "flat") attrsNoFill.push(`filter=\"url(#rect-variant-${variant}-${escapeXml(String(r.id))})\"`);

      return `<g>${defs}\n<rect x=\"${r.x}\" y=\"${r.y}\" width=\"${r.width}\" height=\"${r.height}\" ${attrsNoFill.join(" ")} ${transform} /></g>`;
    }

    // If variant is not flat and fill is solid we need to inline a filter def as well
    if ((r.variant ?? "flat") !== "flat") {
      const variant = r.variant ?? "flat";
      const filterDef = variant === "emboss"
        ? `<defs>\n  <filter id=\"rect-variant-emboss-${escapeXml(String(r.id))}\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\" filterUnits=\"objectBoundingBox\">\n  <feOffset dx=\"-2\" dy=\"-2\" result=\"off1\" />\n  <feGaussianBlur in=\"off1\" stdDeviation=\"2\" result=\"blur1\" />\n  <feFlood flood-color=\"#ffffff\" flood-opacity=\"0.6\" result=\"flood1\" />\n  <feComposite in=\"flood1\" in2=\"blur1\" operator=\"in\" result=\"comp1\" />\n  <feOffset dx=\"2\" dy=\"2\" result=\"off2\" />\n  <feGaussianBlur in=\"off2\" stdDeviation=\"2\" result=\"blur2\" />\n  <feFlood flood-color=\"#000000\" flood-opacity=\"0.45\" result=\"flood2\" />\n  <feComposite in=\"flood2\" in2=\"blur2\" operator=\"in\" result=\"comp2\" />\n  <feMerge>\n    <feMergeNode in=\"comp1\"/>\n    <feMergeNode in=\"comp2\"/>\n    <feMergeNode in=\"SourceGraphic\"/>\n  </feMerge>\n</filter>\n</defs>`
        : `<defs>\n  <filter id=\"rect-variant-bevel-${escapeXml(String(r.id))}\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\" filterUnits=\"objectBoundingBox\">\n  <feOffset dx=\"-1\" dy=\"-1\" result=\"off1\" />\n  <feGaussianBlur in=\"off1\" stdDeviation=\"1.2\" result=\"blur1\" />\n  <feFlood flood-color=\"#ffffff\" flood-opacity=\"0.35\" result=\"flood1\" />\n  <feComposite in=\"flood1\" in2=\"blur1\" operator=\"in\" result=\"comp1\" />\n  <feOffset dx=\"1\" dy=\"1\" result=\"off2\" />\n  <feGaussianBlur in=\"off2\" stdDeviation=\"1.2\" result=\"blur2\" />\n  <feFlood flood-color=\"#000000\" flood-opacity=\"0.35\" result=\"flood2\" />\n  <feComposite in=\"flood2\" in2=\"blur2\" operator=\"in\" result=\"comp2\" />\n  <feMerge>\n    <feMergeNode in=\"comp1\"/>\n    <feMergeNode in=\"comp2\"/>\n    <feMergeNode in=\"SourceGraphic\"/>\n  </feMerge>\n</filter>\n</defs>`;

      const attrsNoFill = attrs.filter((a) => !a.startsWith("fill=\""));
      attrsNoFill.push(`fill=\"${escapeXml(String(r.fill))}\"`);
      attrsNoFill.push(`filter=\"url(#rect-variant-${variant}-${escapeXml(String(r.id))})\"`);

      return `<g>${filterDef}\n<rect x=\"${r.x}\" y=\"${r.y}\" width=\"${r.width}\" height=\"${r.height}\" ${attrsNoFill.join(" ")} ${transform} /></g>`;
    }

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
    const filterAttr = imageFilterIsActive(im) ? ` filter=\"url(#imgf-${escapeXml(String(im.id))})\"` : "";
    return `<image href=\"${escapeXml(im.href)}\" x=\"${im.x}\" y=\"${im.y}\" width=\"${im.width}\" height=\"${im.height}\"${praAttr}${filterAttr} ${attrs.join(" ")} ${transform} />`;
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

  const imageDefs = doc.rootIds
    .map((id) => doc.elements[id])
    .filter(Boolean)
    .flatMap((root) => {
      const walk = (el: DesignerElement): DesignerElement[] => {
        if (el.type === "group") {
          const g = el as GroupElement;
          const kids = g.childIds.map((cid) => doc.elements[cid]).filter(Boolean) as DesignerElement[];
          return [el, ...kids.flatMap(walk)];
        }
        return [el];
      };
      return walk(root as DesignerElement);
    })
    .filter((el): el is ImageElement => Boolean(el) && (el as DesignerElement).type === "image")
    .filter((im) => imageFilterIsActive(im))
    .map((im) => buildImageFilterDef(im))
    .join("\n");

  const defsBlock = imageDefs.trim() ? `<defs>\n${imageDefs}\n</defs>\n` : "";

  const content = doc.rootIds
    .map((id) => doc.elements[id])
    .filter(Boolean)
    .map((el) => renderElementToSvg(el as DesignerElement, doc, { engine: deps.engine, api: deps.api, host: deps.host }))
    .join("\n");

  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${w}\" height=\"${h}\" viewBox=\"0 0 ${w} ${h}\">\n${defsBlock}${content}\n</svg>`;
}
