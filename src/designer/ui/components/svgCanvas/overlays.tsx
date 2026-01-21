import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { Button, Paper, TextField, Typography } from "@mui/material";

import type { DesignerState } from "../../../core/engine";
import { getBBoxCenter } from "../../../core/geometry";
import type { DragMode } from "./dragTypes";
 import { MOTION_PATH_LINE_KIND, coerceMotionPathLineProps } from "../../../../elements/motionPathLine/motionPathLine.model";

function adjustHandleForFlip(el: { flipH?: boolean; flipV?: boolean }, handle: "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w"): "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w" {
  const meta = el;
  let adjusted = handle as string;
  if (meta.flipH) {
    if (adjusted.includes('e')) adjusted = adjusted.replace('e', 'w');
    else if (adjusted.includes('w')) adjusted = adjusted.replace('w', 'e');
  }
  if (meta.flipV) {
    if (adjusted.includes('s')) adjusted = adjusted.replace('s', 'n');
    else if (adjusted.includes('n')) adjusted = adjusted.replace('n', 's');
  }
  return adjusted as "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w";
}

export function SelectionOverlay({
  box,
  state,
  onStartResize,
  onStartRotate,
  onStartLineEnd,
  onStartCircleR,
}: {
  box: { x: number; y: number; width: number; height: number };
  state: DesignerState;
  onStartResize: (m: DragMode) => void;
  onStartRotate: (m: DragMode) => void;
  onStartLineEnd: (m: DragMode) => void;
  onStartCircleR: (m: DragMode) => void;
}) {
  const singleId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const single = singleId ? state.doc.elements[singleId] : null;

  const isMotionPathLine = single?.type === "custom" && single.kind === MOTION_PATH_LINE_KIND;

  const stroke = "var(--foreground)";

  // Small animation to make selection feel alive (GSAP usage)
  useEffect(() => {
    gsap.to(".designer-selection", { opacity: 0.9, duration: 0.15, overwrite: true });
  }, [singleId, state.selection.ids.length]);

  const eventToCanvas = (e: React.PointerEvent) => {
    const svg = ((e.currentTarget as unknown as SVGGraphicsElement).ownerSVGElement as SVGSVGElement) ?? null;
    const rect = svg?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = e.clientX;
    const clientY = e.clientY;
    const scaleX = state.doc.canvas.width / rect.width;
    const scaleY = state.doc.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return { x, y };
  };

  const overlayTransform = (() => {
    if (!single) return undefined;
    if (single.type !== "rect" && single.type !== "image" && single.type !== "text" && single.type !== "custom") return undefined;
    if (!single.rotation) return undefined;

    // Match the same rotation pivot used by the element renderer.
    if (single.type === "text") {
      const cx = single.x;
      const cy = single.y;
      return `rotate(${single.rotation} ${cx} ${cy})`;
    }

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    return `rotate(${single.rotation} ${cx} ${cy})`;
  })();

  const startRotationForResize = (() => {
    if (!single) return 0;
    if (single.type !== "rect" && single.type !== "image" && single.type !== "text" && single.type !== "custom") return 0;
    return single.rotation || 0;
  })();

  return (
    <g className="designer-selection" pointerEvents="none" opacity={0.9} transform={overlayTransform}>
      <rect x={box.x} y={box.y} width={box.width} height={box.height} fill="none" stroke={stroke} strokeWidth={1} />

      {single && (single.type === "rect" || single.type === "image" || single.type === "text" || (single.type === "custom" && !isMotionPathLine)) && (
        <>
          <Handle
            x={box.x}
            y={box.y}
            cursor="nwse-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              const p = eventToCanvas(e);
              if (single.type === "text") {
                onStartResize({
                  kind: "resize-text",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "nw"),
                  startX: p.x,
                  startY: p.y,
                  startFontSize: single.fontSize,
                  startRotation: startRotationForResize,
                });
              } else {
                onStartResize({
                  kind: "resize-rect",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "nw"),
                  startX: p.x,
                  startY: p.y,
                  start: { x: single.x, y: single.y, w: single.width, h: single.height },
                  startRotation: startRotationForResize,
                });
              }
            }}
          />

          <Handle
            x={box.x + box.width / 2}
            y={box.y}
            cursor="ns-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              const p = eventToCanvas(e);
              if (single.type === "text") {
                onStartResize({
                  kind: "resize-text",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "n"),
                  startX: p.x,
                  startY: p.y,
                  startFontSize: single.fontSize,
                  startRotation: startRotationForResize,
                });
              } else {
                onStartResize({
                  kind: "resize-rect",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "n"),
                  startX: p.x,
                  startY: p.y,
                  start: { x: single.x, y: single.y, w: single.width, h: single.height },
                  startRotation: startRotationForResize,
                });
              }
            }}
          />

          <Handle
            x={box.x + box.width}
            y={box.y}
            cursor="nesw-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              const p = eventToCanvas(e);
              if (single.type === "text") {
                onStartResize({
                  kind: "resize-text",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "ne"),
                  startX: p.x,
                  startY: p.y,
                  startFontSize: single.fontSize,
                  startRotation: startRotationForResize,
                });
              } else {
                onStartResize({
                  kind: "resize-rect",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "ne"),
                  startX: p.x,
                  startY: p.y,
                  start: { x: single.x, y: single.y, w: single.width, h: single.height },
                  startRotation: startRotationForResize,
                });
              }
            }}
          />

          <Handle
            x={box.x + box.width}
            y={box.y + box.height / 2}
            cursor="ew-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              const p = eventToCanvas(e);
              if (single.type === "text") {
                onStartResize({
                  kind: "resize-text",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "e"),
                  startX: p.x,
                  startY: p.y,
                  startFontSize: single.fontSize,
                  startRotation: startRotationForResize,
                });
              } else {
                onStartResize({
                  kind: "resize-rect",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "e"),
                  startX: p.x,
                  startY: p.y,
                  start: { x: single.x, y: single.y, w: single.width, h: single.height },
                  startRotation: startRotationForResize,
                });
              }
            }}
          />

          <Handle
            x={box.x}
            y={box.y + box.height}
            cursor="nesw-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              const p = eventToCanvas(e);
              if (single.type === "text") {
                onStartResize({
                  kind: "resize-text",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "sw"),
                  startX: p.x,
                  startY: p.y,
                  startFontSize: single.fontSize,
                  startRotation: startRotationForResize,
                });
              } else {
                onStartResize({
                  kind: "resize-rect",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "sw"),
                  startX: p.x,
                  startY: p.y,
                  start: { x: single.x, y: single.y, w: single.width, h: single.height },
                  startRotation: startRotationForResize,
                });
              }
            }}
          />

          <Handle
            x={box.x + box.width / 2}
            y={box.y + box.height}
            cursor="ns-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              const p = eventToCanvas(e);
              if (single.type === "text") {
                onStartResize({
                  kind: "resize-text",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "s"),
                  startX: p.x,
                  startY: p.y,
                  startFontSize: single.fontSize,
                  startRotation: startRotationForResize,
                });
              } else {
                onStartResize({
                  kind: "resize-rect",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "s"),
                  startX: p.x,
                  startY: p.y,
                  start: { x: single.x, y: single.y, w: single.width, h: single.height },
                  startRotation: startRotationForResize,
                });
              }
            }}
          />

          <Handle
            x={box.x + box.width}
            y={box.y + box.height}
            cursor="nwse-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              const p = eventToCanvas(e);
              if (single.type === "text") {
                onStartResize({
                  kind: "resize-text",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "se"),
                  startX: p.x,
                  startY: p.y,
                  startFontSize: single.fontSize,
                  startRotation: startRotationForResize,
                });
              } else {
                onStartResize({
                  kind: "resize-rect",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "se"),
                  startX: p.x,
                  startY: p.y,
                  start: { x: single.x, y: single.y, w: single.width, h: single.height },
                  startRotation: startRotationForResize,
                });
              }
            }}
          />

          <Handle
            x={box.x}
            y={box.y + box.height / 2}
            cursor="ew-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              const p = eventToCanvas(e);
              if (single.type === "text") {
                onStartResize({
                  kind: "resize-text",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "w"),
                  startX: p.x,
                  startY: p.y,
                  startFontSize: single.fontSize,
                  startRotation: startRotationForResize,
                });
              } else {
                onStartResize({
                  kind: "resize-rect",
                  id: single.id,
                  handle: adjustHandleForFlip(single, "w"),
                  startX: p.x,
                  startY: p.y,
                  start: { x: single.x, y: single.y, w: single.width, h: single.height },
                  startRotation: startRotationForResize,
                });
              }
            }}
          />

          <RotateHandle
            x={box.x + box.width / 2}
            y={box.y - 24}
            onPointerDown={(e) => {
              e.stopPropagation();
              const center = getBBoxCenter(box);
              const p = eventToCanvas(e);
              const startAngle = Math.atan2(p.y - center.y, p.x - center.x);
              onStartRotate({
                kind: "rotate",
                id: single.id,
                startAngle,
                startRotation: single.rotation,
                center,
              });
            }}
          />
        </>
      )}

      {single && single.type === "line" && (
        <>
          <Handle
            x={single.x1}
            y={single.y1}
            cursor="crosshair"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartLineEnd({ kind: "line-end", id: single.id, end: "p1" });
            }}
          />
          <Handle
            x={single.x2}
            y={single.y2}
            cursor="crosshair"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartLineEnd({ kind: "line-end", id: single.id, end: "p2" });
            }}
          />
        </>
      )}

      {single && single.type === "custom" && single.kind === MOTION_PATH_LINE_KIND && (
        <>
          {(() => {
            const p = coerceMotionPathLineProps(single.props);
            return (
              <>
                <Handle
                  x={single.x + p.x1}
                  y={single.y + p.y1}
                  cursor="crosshair"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onStartLineEnd({ kind: "line-end", id: single.id, end: "p1" });
                  }}
                />
                <Handle
                  x={single.x + p.x2}
                  y={single.y + p.y2}
                  cursor="crosshair"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onStartLineEnd({ kind: "line-end", id: single.id, end: "p2" });
                  }}
                />
              </>
            );
          })()}
        </>
      )}

      {single && single.type === "circle" && (
        <Handle
          x={single.cx + single.r}
          y={single.cy}
          cursor="ew-resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            onStartCircleR({ kind: "circle-r", id: single.id });
          }}
        />
      )}
    </g>
  );
}

function Handle({
  x,
  y,
  cursor,
  onPointerDown,
}: {
  x: number;
  y: number;
  cursor: string;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const size = 10;
  return (
    <rect
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      fill="white"
      stroke="var(--foreground)"
      strokeWidth={1}
      pointerEvents="all"
      className={cursorToClass(cursor)}
      onPointerDown={onPointerDown}
    />
  );
}

function RotateHandle({ x, y, onPointerDown }: { x: number; y: number; onPointerDown: (e: React.PointerEvent) => void }) {
  const r = 6;
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill="white"
      stroke="var(--foreground)"
      strokeWidth={1}
      pointerEvents="all"
      className="cursor-grab"
      onPointerDown={onPointerDown}
    />
  );
}

function cursorToClass(cursor: string): string {
  switch (cursor) {
    case "nwse-resize":
      return "cursor-nwse-resize";
    case "nesw-resize":
      return "cursor-nesw-resize";
    case "ns-resize":
      return "cursor-ns-resize";
    case "crosshair":
      return "cursor-crosshair";
    case "ew-resize":
      return "cursor-ew-resize";
    case "grab":
      return "cursor-grab";
    case "move":
      return "cursor-move";
    default:
      return "cursor-default";
  }
}

export function MagnifierOverlay({
  initialPercent,
  onApply,
  onCancel,
}: {
  initialPercent: number;
  onApply: (percent: number) => void;
  onCancel: () => void;
}) {
  const [percent, setPercent] = useState(initialPercent);
  return (
    <Paper variant="outlined" className="p-2">
      <Typography variant="caption" className="text-black/70">Zoom</Typography>
      <div className="flex items-center gap-2 mt-1">
        <Button onClick={() => setPercent((p) => Math.max(10, p - 10))}>-</Button>
        <TextField
          title="magnifier-percent"
          aria-label="Magnifier percent"
          className="w-20"
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value || 0))}
          type="number"
        />
        <div className="text-sm">%</div>
        <Button onClick={() => setPercent((p) => Math.min(800, p + 10))}>+</Button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button onClick={() => onApply(percent)}>Apply</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Paper>
  );
}
