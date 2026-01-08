"use client";

import { useRef } from "react";
import { useSyncExternalStore } from "react";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { CustomElement, DesignerElement, DesignerDocument, ImageElement } from "../../core/types";
import type { RibbonAction } from "../../core/registry";
import { useDesignerHost } from "../hooks/useDesignerHost";

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Ribbon({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const host = useDesignerHost();
  const pluginRibbonActions = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getRibbonActions(),
    () => host.registry.getRibbonActions(),
  ) as RibbonAction[];

  const importRef = useRef<HTMLInputElement | null>(null);
  const hasSelectedGroup = state.selection.ids.some((id) => state.doc.elements[id]?.type === "group");
  
  function downloadSvg(filename: string, svg: string) {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const renderElement = (el: DesignerElement, doc: DesignerDocument): string => {
    const attrs = [] as string[];
    if (el.opacity !== undefined) attrs.push(`opacity="${el.opacity}"`);
    if (el.stroke) attrs.push(`stroke="${el.stroke}"`);
    if (el.strokeWidth !== undefined) attrs.push(`stroke-width="${el.strokeWidth}"`);
    if (el.fill) attrs.push(`fill="${el.fill}"`);
    const buildTransformAttr = (
      rotation: number | undefined,
      flipH: boolean | undefined,
      flipV: boolean | undefined,
      cx: number | undefined,
      cy: number | undefined,
    ) => {
      const parts: string[] = [];
      if ((flipH || flipV) && cx !== undefined && cy !== undefined) {
        const sx = flipH ? -1 : 1;
        const sy = flipV ? -1 : 1;
        parts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
      }
      if (rotation) parts.push(`rotate(${rotation} ${cx ?? 0} ${cy ?? 0})`);
      return parts.length ? ` transform=\"${parts.join(" ")}\"` : "";
    };

    if (el.type === "rect") {
      const r = el;
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const transform = buildTransformAttr(r.rotation, r.flipH, r.flipV, cx, cy);
      return `<rect x=\"${r.x}\" y=\"${r.y}\" width=\"${r.width}\" height=\"${r.height}\" ${attrs.join(" ")} ${transform} />`;
    }
    if (el.type === "circle") {
      const c = el;
      const cx = c.cx;
      const cy = c.cy;
      const transform = buildTransformAttr(c.rotation, c.flipH, c.flipV, cx, cy);
      return `<circle cx=\"${c.cx}\" cy=\"${c.cy}\" r=\"${c.r}\" ${attrs.join(" ")} ${transform} />`;
    }
    if (el.type === "line") {
      const l = el;
      const cx = (l.x1 + l.x2) / 2;
      const cy = (l.y1 + l.y2) / 2;
      const transform = buildTransformAttr(l.rotation, l.flipH, l.flipV, cx, cy);
      return `<line x1=\"${l.x1}\" y1=\"${l.y1}\" x2=\"${l.x2}\" y2=\"${l.y2}\" ${attrs.join(" ")} ${transform} />`;
    }
    if (el.type === "free") {
      const f = el;
      const transform = f.rotation ? ` transform=\"rotate(${f.rotation} 0 0)\"` : "";
      return `<path d=\"${f.d}\" ${attrs.join(" ")} ${transform} />`;
    }
    if (el.type === "image") {
      const im = el as ImageElement;
      const pra = im.fit === "stretch" ? "none" : im.preserveAspectRatio;
      const cx = im.x + im.width / 2;
      const cy = im.y + im.height / 2;
      const transform = buildTransformAttr(im.rotation, im.flipH, im.flipV, cx, cy);
      const praAttr = pra ? ` preserveAspectRatio=\"${pra}\"` : "";
      return `<image href=\"${im.href}\" x=\"${im.x}\" y=\"${im.y}\" width=\"${im.width}\" height=\"${im.height}\"${praAttr} ${attrs.join(" ")} ${transform} />`;
    }
    if (el.type === "text") {
      const t = el as unknown as { x: number; y: number; text: string; fontSize: number; fontWeight: string; fontStyle?: string; textDecoration?: string; fill: string; opacity: number; rotation?: number; flipH?: boolean; flipV?: boolean };
      const transform = buildTransformAttr(t.rotation, t.flipH, t.flipV, t.x, t.y);
      const styleParts: string[] = [];
      if (t.fontStyle && t.fontStyle !== "normal") styleParts.push(`font-style:${t.fontStyle}`);
      if (t.textDecoration && t.textDecoration !== "none") styleParts.push(`text-decoration:${t.textDecoration}`);
      const styleAttr = styleParts.length ? ` style=\"${styleParts.join(";")}\"` : "";
      const escaped = String(t.text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<text x=\"${t.x}\" y=\"${t.y}\" font-size=\"${t.fontSize}\" font-weight=\"${t.fontWeight}\" fill=\"${t.fill}\" opacity=\"${t.opacity}\"${styleAttr} ${transform}>${escaped}</text>`;
    }

    if (el.type === "custom") {
      const c = el as CustomElement;
      const cx = c.x + c.width / 2;
      const cy = c.y + c.height / 2;
      const transform = buildTransformAttr(c.rotation, c.flipH, c.flipV, cx, cy);

      const def = host.elements.getDefinitionForElement(el);
      let inner = "";
      if (def?.exportSvg) {
        try {
          inner = String(def.exportSvg({ engine, api: host.api, element: el, document: doc, elements: host.elements }));
        } catch {
          inner = "";
        }
      }

      if (!inner) {
        const label = (def?.label || c.kind || "Custom").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const stroke = c.stroke || "var(--foreground)";
        const fill = c.fill || "transparent";
        const sw = c.strokeWidth ?? 2;
        inner = `<rect x=\"0\" y=\"0\" width=\"${c.width}\" height=\"${c.height}\" fill=\"${fill}\" stroke=\"${stroke}\" stroke-width=\"${sw}\" /><text x=\"8\" y=\"20\" font-size=\"14\" fill=\"${stroke}\" opacity=\"0.85\">${label}</text>`;
      }

      const w = Math.max(1, Number(c.width) || 1);
      const h = Math.max(1, Number(c.height) || 1);
      return `<g${transform}><svg x=\"${c.x}\" y=\"${c.y}\" width=\"${w}\" height=\"${h}\" viewBox=\"0 0 ${w} ${h}\" preserveAspectRatio=\"none\">${inner}</svg></g>`;
    }
    if (el.type === "group") {
      const g = el;
      const children = g.childIds.map((cid: string) => doc.elements[cid]).filter(Boolean) as DesignerElement[];
      const inner = children.map((ch) => renderElement(ch, doc)).join("\n");
      const transform = buildTransformAttr(g.rotation, g.flipH, g.flipV, 0, 0);
      return `<g ${attrs.join(" ")} ${transform}>${inner}</g>`;
    }
    return "";
  };

  const exportSvg = () => {
    const doc = state.doc;
    const w = doc.canvas.width;
    const h = doc.canvas.height;
    const content = doc.rootIds
      .map((id) => doc.elements[id])
      .filter(Boolean)
      .map((el) => renderElement(el, doc))
      .join("\n");
    const svg = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${w}\" height=\"${h}\" viewBox=\"0 0 ${w} ${h}\">\n${content}\n</svg>`;
    downloadSvg("project.svg", svg);
  };

  return (
    <div className="h-full w-full flex items-center justify-between px-3 gap-3">
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => importRef.current?.click()}
        >
          Import JSON
        </button>
        <input
            title="importProject"
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                engine.importProjectJson(text);
                e.target.value = "";
            }}
        />

        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => downloadText("project.json", engine.exportProjectJson())}
        >
          Export JSON
        </button>
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={exportSvg}
        >
          Export SVG
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => engine.setViewMode(!state.viewMode)}
        >
          {state.viewMode ? "Edit Mode" : "View Mode"}
        </button>

        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => engine.copySelection()}
        >
          Copy
        </button>
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => engine.pasteClipboard()}
        >
          Paste
        </button>
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => engine.duplicateSelection()}
        >
          Duplicate
        </button>
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => engine.groupSelection()}
          disabled={state.selection.ids.length < 2}
        >
          Group
        </button>
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => engine.ungroupSelection()}
          disabled={!hasSelectedGroup}
        >
          Ungroup
        </button>
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => engine.deleteElements(state.selection.ids)}
          disabled={state.selection.ids.length === 0}
        >
          Erase
        </button>

        {pluginRibbonActions.map((a) => (
          <button
            key={a.id}
            className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
            onClick={a.onClick}
            disabled={a.disabled}
            title={a.label}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => engine.setZoom({ scale: state.zoom.scale / 1.1 })}
        >
          -
        </button>
        <div className="min-w-[80px] text-center tabular-nums">
          {Math.round(state.zoom.scale * 100)}%
        </div>
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => engine.setZoom({ scale: state.zoom.scale * 1.1 })}
        >
          +
        </button>
      </div>
    </div>
  );
}
