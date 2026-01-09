"use client";

import type React from "react";
import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine, DesignerState } from "../../../designer/core/engine";
import type { DesignerHost } from "../../../designer/core/host";
import type { ImageElement } from "../../../designer/core/types";
import { Row, numberInput, textInput } from "../../../designer/ui/components/properties/controls";

type PropertiesCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  api: DesignerAPI;
  host: DesignerHost;
};

export function renderImageProperties(ctxUnknown: unknown): React.ReactNode {
  const { engine, state } = ctxUnknown as PropertiesCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? state.doc.elements[selectedId] : null;
  if (!el || el.type !== "image") return null;

  const img = el as ImageElement;
  const baseId = `el-${img.id}`;

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <Row id={`${baseId}-x`} label="X" control={numberInput(`${baseId}-x`, img.x, (v) => engine.updateElement(img.id, { x: v }))} />
      <Row id={`${baseId}-y`} label="Y" control={numberInput(`${baseId}-y`, img.y, (v) => engine.updateElement(img.id, { y: v }))} />
      <Row id={`${baseId}-w`} label="W" control={numberInput(`${baseId}-w`, img.width, (v) => engine.updateElement(img.id, { width: Math.max(1, v) }))} />
      <Row id={`${baseId}-h`} label="H" control={numberInput(`${baseId}-h`, img.height, (v) => engine.updateElement(img.id, { height: Math.max(1, v) }))} />
      <Row id={`${baseId}-href`} label="Href" control={textInput(`${baseId}-href`, img.href, (v) => engine.updateElement(img.id, { href: v }))} />
      <Row id={`${baseId}-aspect`} label="Aspect" control={textInput(`${baseId}-aspect`, img.preserveAspectRatio, (v) => engine.updateElement(img.id, { preserveAspectRatio: v }))} />
      <Row
        id={`${baseId}-fit`}
        label="Fit"
        control={
          <select
            id={`${baseId}-fit`}
            aria-label="Fit"
            value={img.fit ?? "none"}
            onChange={(e) => {
              const v = e.target.value as "none" | "contain" | "cover" | "stretch";
              let pra = "xMidYMid meet";
              if (v === "cover") pra = "xMidYMid slice";
              if (v === "stretch") pra = "none";
              engine.updateElement(img.id, { fit: v, preserveAspectRatio: pra });
            }}
            className="px-2 py-1 rounded border border-black/15 w-full"
          >
            <option value="none">None</option>
            <option value="contain">Contain</option>
            <option value="stretch">Stretch</option>
            <option value="cover">Cover</option>
          </select>
        }
      />

      <div className="col-span-2 flex items-center gap-2">
        <button
          className="px-2 py-1 rounded border border-black/15"
          onClick={() => {
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            if (nw && nh) engine.updateElement(img.id, { width: nw, height: nh });
          }}
        >
          Scale to natural
        </button>
        <button
          className="px-2 py-1 rounded border border-black/15"
          onClick={() => {
            engine.updateElement(img.id, { fit: "contain", preserveAspectRatio: "xMidYMid meet" });
          }}
        >
          Fit to box
        </button>
      </div>
    </div>
  );
}
