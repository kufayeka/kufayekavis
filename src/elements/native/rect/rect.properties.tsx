"use client";

import type React from "react";
import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine, DesignerState } from "../../../designer/core/engine";
import type { DesignerHost } from "../../../designer/core/host";
import type { RectElement } from "../../../designer/core/types";
import { ColorInput, Row, numberInput, selectInput } from "../../../designer/ui/components/properties/controls";

type PropertiesCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  api: DesignerAPI;
  host: DesignerHost;
};

export function renderRectProperties(ctxUnknown: unknown): React.ReactNode {
  const { engine, state } = ctxUnknown as PropertiesCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? state.doc.elements[selectedId] : null;
  if (!el || el.type !== "rect") return null;

  const r = el as RectElement;
  const baseId = `el-${r.id}`;

  const fillStyle = r.fillStyle ?? "solid";
  const edgePct = typeof r.fillVerticalEdgeFadeEdgePct === "number" ? r.fillVerticalEdgeFadeEdgePct : 30;
  const midOpacity = typeof r.fillEdgeFadeMidOpacity === "number" ? r.fillEdgeFadeMidOpacity : 0.35;

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <Row id={`${baseId}-x`} label="X" control={numberInput(`${baseId}-x`, r.x, (v) => engine.updateElement(r.id, { x: v }))} />
      <Row id={`${baseId}-y`} label="Y" control={numberInput(`${baseId}-y`, r.y, (v) => engine.updateElement(r.id, { y: v }))} />
      <Row id={`${baseId}-w`} label="W" control={numberInput(`${baseId}-w`, r.width, (v) => engine.updateElement(r.id, { width: Math.max(1, v) }))} />
      <Row id={`${baseId}-h`} label="H" control={numberInput(`${baseId}-h`, r.height, (v) => engine.updateElement(r.id, { height: Math.max(1, v) }))} />

      <Row
        id={`${baseId}-fill-color`}
        label="Fill Color"
        control={<ColorInput id={`${baseId}-fill-color`} value={r.fill} onChange={(v) => engine.updateElement(r.id, { fill: v })} />}
      />
      <Row
        id={`${baseId}-fill-style`}
        label="Fill Style"
        control={
          selectInput(
            `${baseId}-fill-style`,
            fillStyle,
            [
              { value: "solid", label: "Solid" },
              { value: "verticalEdgeFade", label: "Vertical Edge Fade" },
              { value: "horizontalEdgeFade", label: "Horizontal Edge Fade" },
            ],
            (v) => engine.updateElement(r.id, { fillStyle: v as RectElement["fillStyle"] }),
          )
        }
      />

      <Row
        id={`${baseId}-variant`}
        label="Variant"
        control={
          selectInput(
            `${baseId}-variant`,
            r.variant ?? "flat",
            [
              { value: "flat", label: "Flat" },
              { value: "emboss", label: "Emboss" },
              { value: "bevel", label: "Bevel" },
            ],
            (v) => engine.updateElement(r.id, { variant: v as RectElement["variant"] }),
          )
        }
      />

      {fillStyle === "verticalEdgeFade" || fillStyle === "horizontalEdgeFade" ? (
        <Row
          id={`${baseId}-fill-edge-pct`}
          label="Fade Edge %"
          control={
            numberInput(`${baseId}-fill-edge-pct`, edgePct, (v) =>
              engine.updateElement(r.id, { fillVerticalEdgeFadeEdgePct: Math.max(0, Math.min(50, v)) }),
            )
          }
        />
      ) : null}

      {fillStyle === "verticalEdgeFade" || fillStyle === "horizontalEdgeFade" ? (
        <Row
          id={`${baseId}-fill-mid-opacity`}
          label="Fade Smooth (0..1)"
          control={
            numberInput(`${baseId}-fill-mid-opacity`, midOpacity, (v) =>
              engine.updateElement(r.id, { fillEdgeFadeMidOpacity: Math.max(0, Math.min(1, v)) }),
            )
          }
        />
      ) : null}
    </div>
  );
}
