"use client";

import type React from "react";
import { useCallback } from "react";

import type { DesignerEngine, DesignerState } from "../../designer/core/engine";
import type { DesignerElement, ElementId } from "../../designer/core/types";
import { useDesignerHost } from "../../designer/ui/hooks/useDesignerHost";
import { RenderTree } from "../../designer/ui/components/svgCanvas/renderTree";

export function OnlineStage({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const host = useDesignerHost();
  const runtimePatches = state.runtime?.elementPatches;

  const renderCustom = useCallback(
    (el: DesignerElement, doc: DesignerState["doc"]) => {
      if (el.type !== "custom") return null;
      const def = host.elements.getDefinitionForElement(el);
      if (def?.render) {
        try {
          return def.render({ engine, api: host.api, element: el, document: doc, elements: host.elements }) as React.ReactNode;
        } catch {
          // fall through to placeholder
        }
      }

      const label = def?.label || el.kind || "Custom";
      const w = Math.max(1, el.width);
      const h = Math.max(1, el.height);
      return (
        <>
          <rect x={0} y={0} width={w} height={h} fill={el.fill || "transparent"} stroke={el.stroke || "var(--foreground)"} strokeWidth={el.strokeWidth ?? 2} />
          <text x={8} y={20} fontSize={14} fill={el.stroke || "var(--foreground)"} opacity={0.85}>
            {label}
          </text>
        </>
      );
    },
    [engine, host.api, host.elements],
  );

  const renderNativeByDefinition = useCallback(
    (el: DesignerElement, doc: DesignerState["doc"]) => {
      if (el.type === "custom" || el.type === "group") return null;
      const def = host.elements.getDefinitionForElement(el);
      if (!def?.render) return null;
      try {
        return def.render({ engine, api: host.api, element: el, document: doc, elements: host.elements }) as React.ReactNode;
      } catch {
        return null;
      }
    },
    [engine, host.api, host.elements],
  );

  const viewBox = `0 0 ${Math.max(1, state.doc.canvas.width)} ${Math.max(1, state.doc.canvas.height)}`;

  return (
    <div className="h-full w-full">
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="designer-svg block"
        onClick={(e) => {
          const target = e.target as Element | null;
          const idNode = (target?.closest?.("[data-el-id]") as Element | null) ?? null;
          const id = (idNode?.getAttribute?.("data-el-id") as ElementId | null) ?? null;
          if (id) return;
          host.api.publishEvent("default/events", { eventType: "onCanvasClick" });
        }}
        onMouseEnter={() => host.api.publishEvent("default/events", { eventType: "onCanvasEnter" })}
        onMouseLeave={() => host.api.publishEvent("default/events", { eventType: "onCanvasLeave" })}
      >
        <g>
          <rect x={0} y={0} width={state.doc.canvas.width} height={state.doc.canvas.height} fill={state.doc.canvas.background} />
          <RenderTree
            doc={state.doc}
            rootIds={state.doc.rootIds}
            onRegister={() => {
              // online/view mode doesn't need element refs for selection/drag
            }}
            renderCustom={renderCustom}
            renderNativeByDefinition={renderNativeByDefinition}
            api={host.api}
            viewMode={Boolean(state.viewMode)}
            runtimePatches={runtimePatches}
          />
        </g>
      </svg>
    </div>
  );
}
