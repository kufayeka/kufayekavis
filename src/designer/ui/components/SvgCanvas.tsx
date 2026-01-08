"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { DesignerElement, ElementId } from "../../core/types";
import { getElementBBox, getSelectionBBox } from "../../core/geometry";
import { clamp } from "../../core/math";
import { translateElement } from "../../core/transform";
import { useDesignerHost } from "../hooks/useDesignerHost";

import type { DragMode } from "./svgCanvas/dragTypes";
import { MagnifierOverlay, SelectionOverlay } from "./svgCanvas/overlays";
import { RenderTree } from "./svgCanvas/renderTree";
import { fileToDataUrl, loadImageSize, pointsToPath, rotateDelta } from "./svgCanvas/utils";

export function SvgCanvas({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const host = useDesignerHost();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const elRefs = useRef(new Map<ElementId, SVGElement>());
  const dragRef = useRef<DragMode>({ kind: "none" });
  const [dragUi, setDragUi] = useState<DragMode>({ kind: "none" });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [pendingMagnifier, setPendingMagnifier] = useState<
    | null
    | {
        box: { x: number; y: number; width: number; height: number };
        suggestedScale: number;
        left: number;
        top: number;
      }
  >(null);

  const selectionBox = useMemo(() => getSelectionBBox(state.selection.ids, state.doc), [state.selection.ids, state.doc]);

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
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill={el.fill || "transparent"}
            stroke={el.stroke || "var(--foreground)"}
            strokeWidth={el.strokeWidth ?? 2}
          />
          <text x={8} y={20} fontSize={14} fill={el.stroke || "var(--foreground)"} opacity={0.85}>
            {label}
          </text>
        </>
      );
    },
    [engine, host.api, host.elements],
  );

  const svgWidth = state.doc.canvas.width * state.zoom.scale;
  const svgHeight = state.doc.canvas.height * state.zoom.scale;
  const viewBox = `0 0 ${state.doc.canvas.width} ${state.doc.canvas.height}`;

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      // Map client pixels into SVG viewBox units (canvas coordinates)
      const scaleX = state.doc.canvas.width / rect.width;
      const scaleY = state.doc.canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      return { x, y };
    },
    [state.doc.canvas.height, state.doc.canvas.width],
  );

  const snapIfEnabled = useCallback(
    (x: number, y: number) => {
      const s = engine.getState();
      if (!s.doc.canvas.snapToGrid) return { x, y };
      const g = Math.max(1, s.doc.canvas.gridSize || 1);
      return {
        x: Math.round(x / g) * g,
        y: Math.round(y / g) * g,
      };
    },
    [engine],
  );

  const getMovableIds = useCallback(
    (ids: ElementId[]): ElementId[] => {
      const doc = engine.getState().doc;
      const out: ElementId[] = [];
      const seen = new Set<ElementId>();

      const visit = (id: ElementId) => {
        if (seen.has(id)) return;
        seen.add(id);
        const el = doc.elements[id];
        if (!el) return;
        if (el.type === "group") {
          for (const childId of el.childIds) visit(childId);
          return;
        }
        out.push(id);
      };

      for (const id of ids) visit(id);
      return out;
    },
    [engine],
  );

  const finalizeMarqueeSelection = useCallback(
    (startX: number, startY: number, endX: number, endY: number, append: boolean) => {
      const doc = engine.getState().doc;
      const x1 = Math.min(startX, endX);
      const y1 = Math.min(startY, endY);
      const x2 = Math.max(startX, endX);
      const y2 = Math.max(startY, endY);

      const hit: ElementId[] = [];

      for (const rootId of doc.rootIds) {
        const el = doc.elements[rootId];
        if (!el || el.hidden) continue;
        const b = getElementBBox(el, doc);
        const intersects = b.x <= x2 && b.x + b.width >= x1 && b.y <= y2 && b.y + b.height >= y1;
        if (intersects) hit.push(rootId);
      }

      engine.select(hit, { append });
    },
    [engine],
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (drag.kind === "none") return;

      if (drag.kind === "move") {
        const p = clientToCanvas(e.clientX, e.clientY);
        const totalDx = p.x - drag.originX;
        const totalDy = p.y - drag.originY;

        let dx = totalDx;
        let dy = totalDy;
        const s = engine.getState();
        if (s.doc.canvas.snapToGrid && drag.startBox) {
          const g = Math.max(1, s.doc.canvas.gridSize || 1);
          const targetX = drag.startBox.x + totalDx;
          const targetY = drag.startBox.y + totalDy;
          const snappedX = Math.round(targetX / g) * g;
          const snappedY = Math.round(targetY / g) * g;
          dx = snappedX - drag.startBox.x;
          dy = snappedY - drag.startBox.y;
        }

        engine.updateElements(drag.ids, (current) => {
          const start = drag.startElements[current.id];
          if (!start) return current;
          return translateElement(start, dx, dy);
        });

        dragRef.current = { ...drag, startX: p.x, startY: p.y };
        return;
      }

      if (drag.kind === "marquee") {
        const p = clientToCanvas(e.clientX, e.clientY);
        const next = { ...drag, x: p.x, y: p.y } as DragMode;
        dragRef.current = next;
        setDragUi(next);
        return;
      }

      if (drag.kind === "resize-rect") {
        const p = clientToCanvas(e.clientX, e.clientY);
        const rawDx = p.x - drag.startX;
        const rawDy = p.y - drag.startY;
        const { dx, dy } = rotateDelta(rawDx, rawDy, -drag.startRotation);

        let x = drag.start.x;
        let y = drag.start.y;
        let w = drag.start.w;
        let h = drag.start.h;

        if (drag.handle.includes("e")) w = Math.max(1, drag.start.w + dx);
        if (drag.handle.includes("s")) h = Math.max(1, drag.start.h + dy);
        if (drag.handle.includes("w")) {
          w = Math.max(1, drag.start.w - dx);
          x = drag.start.x + dx;
        }
        if (drag.handle.includes("n")) {
          h = Math.max(1, drag.start.h - dy);
          y = drag.start.y + dy;
        }

        if (engine.getState().doc.canvas.snapToGrid) {
          const g = Math.max(1, engine.getState().doc.canvas.gridSize || 1);
          x = Math.round(x / g) * g;
          y = Math.round(y / g) * g;
          w = Math.max(1, Math.round(w / g) * g);
          h = Math.max(1, Math.round(h / g) * g);
        }

        engine.updateElement(drag.id, { x, y, width: w, height: h });
        return;
      }

      if (drag.kind === "resize-text") {
        const p = clientToCanvas(e.clientX, e.clientY);
        const rawDx = p.x - drag.startX;
        const rawDy = p.y - drag.startY;
        const { dx, dy } = rotateDelta(rawDx, rawDy, -drag.startRotation);

        // Simple scaling heuristic: dragging down/right increases font, up/left decreases.
        const signX = drag.handle.includes("w") ? -1 : 1;
        const signY = drag.handle.includes("n") ? -1 : 1;
        const delta = (signX * dx + signY * dy) / 6;
        const nextFontSize = Math.max(6, Math.round(drag.startFontSize + delta));
        engine.updateElement(drag.id, { fontSize: nextFontSize } as unknown as Partial<DesignerElement>);
        return;
      }

      if (drag.kind === "rotate") {
        const p = clientToCanvas(e.clientX, e.clientY);
        const angle = Math.atan2(p.y - drag.center.y, p.x - drag.center.x);
        const delta = ((angle - drag.startAngle) * 180) / Math.PI;
        engine.updateElement(drag.id, { rotation: drag.startRotation + delta });
        return;
      }

      if (drag.kind === "line-end") {
        const p = clientToCanvas(e.clientX, e.clientY);
        const sp = snapIfEnabled(p.x, p.y);
        const patch = drag.end === "p1" ? { x1: sp.x, y1: sp.y } : { x2: sp.x, y2: sp.y };
        engine.updateElement(drag.id, patch);
        return;
      }

      if (drag.kind === "circle-r") {
        const p = clientToCanvas(e.clientX, e.clientY);
        const el = engine.getState().doc.elements[drag.id];
        if (!el || el.type !== "circle") return;
        const sp = snapIfEnabled(p.x, p.y);
        const r = Math.max(1, Math.hypot(sp.x - el.cx, sp.y - el.cy));
        engine.updateElement(drag.id, { r });
        return;
      }

      if (drag.kind === "free") {
        const p = clientToCanvas(e.clientX, e.clientY);
        const next = { ...drag, points: [...drag.points, { x: p.x, y: p.y }] } as DragMode;
        dragRef.current = next;
        setDragUi(next);
        return;
      }
    };

    const onPointerUp = () => {
      const drag = dragRef.current;

      if (drag.kind === "free") {
        const d = pointsToPath(drag.points);
        if (d) engine.createElement({ type: "free", d });
      }

      if (
        drag.kind === "move" ||
        drag.kind === "resize-rect" ||
        drag.kind === "resize-text" ||
        drag.kind === "rotate" ||
        drag.kind === "line-end" ||
        drag.kind === "circle-r"
      ) {
        engine.endHistoryBatch();
      }

      if (drag.kind === "marquee") {
        const tool = engine.getState().tool;
        const startX = drag.startX;
        const startY = drag.startY;
        const endX = drag.x;
        const endY = drag.y;
        if (tool === "magnifier") {
          // compute box in canvas units
          const x1 = Math.min(startX, endX);
          const y1 = Math.min(startY, endY);
          const x2 = Math.max(startX, endX);
          const y2 = Math.max(startY, endY);
          const box = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };

          const scroller = scrollRef.current;
          const svg = svgRef.current;
          if (scroller && svg && box.width > 0 && box.height > 0) {
            const containerRect = scroller.getBoundingClientRect();
            const oldScale = engine.getState().zoom.scale;
            const suggested = Math.min(
              containerRect.width / Math.max(1, box.width),
              containerRect.height / Math.max(1, box.height),
            );

            // compute overlay position (center of selection in client coords)
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;
            const centerClientX = containerRect.left + centerX * oldScale - scroller.scrollLeft;
            const centerClientY = containerRect.top + centerY * oldScale - scroller.scrollTop;

            // position relative to scroller
            const left = centerClientX - containerRect.left;
            const top = centerClientY - containerRect.top;

            setPendingMagnifier({ box, suggestedScale: suggested, left, top });
          } else {
            // fallback: just select
            finalizeMarqueeSelection(startX, startY, endX, endY, drag.append);
          }
        } else {
          finalizeMarqueeSelection(drag.startX, drag.startY, drag.x, drag.y, drag.append);
        }
      }

      dragRef.current = { kind: "none" };
      setDragUi({ kind: "none" });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [engine, clientToCanvas, finalizeMarqueeSelection, snapIfEnabled]);

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    // In view mode we don't allow selection/movement
    if (engine.getState().viewMode) return;
    const target = e.target as Element | null;
    const idNode = (target?.closest?.("[data-el-id]") as Element | null) ?? null;
    const id = (idNode?.getAttribute?.("data-el-id") as ElementId | null) ?? null;

    const isToggle = e.ctrlKey || e.metaKey;
    const append = e.shiftKey;

    const resolveSelectableId = (startId: ElementId): ElementId => {
      // Default behavior: if you click a child inside a group, select the group
      // so the group behaves like a single element.
      if (isToggle || append) return startId;
      let cur: ElementId = startId;
      while (true) {
        const el = engine.getState().doc.elements[cur];
        const pid = el?.parentId;
        if (!pid) return cur;
        const parent = engine.getState().doc.elements[pid];
        if (!parent || parent.type !== "group") return cur;
        cur = pid;
      }
    };

    // Tools: free draw starts on empty canvas
    if (!id && state.tool === "free") {
      const p = clientToCanvas(e.clientX, e.clientY);
      const next: DragMode = { kind: "free", points: [{ x: p.x, y: p.y }] };
      dragRef.current = next;
      setDragUi(next);
      return;
    }

    // Note: tools are placed via drag→drop from Palette. Clicking empty canvas should not spawn elements.

    if (!id) {
      if (state.tool === "select") {
        const p = clientToCanvas(e.clientX, e.clientY);
        const next: DragMode = {
          kind: "marquee",
          startX: p.x,
          startY: p.y,
          x: p.x,
          y: p.y,
          append,
        };
        dragRef.current = next;
        setDragUi(next);
        if (!append) engine.clearSelection();
        return;
      }

      engine.clearSelection();
      return;
    }

    const resolvedId = resolveSelectableId(id);

    let selectedIds: ElementId[];
    if (isToggle) {
      const already = state.selection.ids.includes(resolvedId);
      selectedIds = already
        ? state.selection.ids.filter((x) => x !== resolvedId)
        : Array.from(new Set([...state.selection.ids, resolvedId]));
      engine.select(selectedIds);
    } else if (append) {
      engine.select([resolvedId], { append: true });
      selectedIds = Array.from(new Set([...state.selection.ids, resolvedId]));
    } else {
      // If clicking an already-selected element with no modifiers, keep the multi-selection
      // (so we can drag the whole selection).
      if (state.selection.ids.includes(resolvedId)) {
        selectedIds = state.selection.ids;
      } else {
        engine.select([resolvedId], { append: false });
        selectedIds = [resolvedId];
      }
    }

    if (selectedIds.length === 0) {
      dragRef.current = { kind: "none" };
      setDragUi({ kind: "none" });
      return;
    }

    // If any of the selected elements are locked, allow selection but don't start move
    const anyLocked = selectedIds.some((sid) => engine.getState().doc.elements[sid]?.locked);
    if (anyLocked) {
      dragRef.current = { kind: "none" };
      setDragUi({ kind: "none" });
      return;
    }

    const movableIds = getMovableIds(selectedIds);
    const startElements: Record<ElementId, DesignerElement> = {};
    for (const mid of movableIds) {
      const el = engine.getState().doc.elements[mid];
      if (el) startElements[mid] = el;
    }

    // Start move
    engine.beginHistoryBatch();
    const p = clientToCanvas(e.clientX, e.clientY);
    dragRef.current = {
      kind: "move",
      startX: p.x,
      startY: p.y,
      originX: p.x,
      originY: p.y,
      ids: movableIds,
      startElements,
      startBox: getSelectionBBox(movableIds, engine.getState().doc),
    };
    setDragUi({
      kind: "move",
      startX: p.x,
      startY: p.y,
      originX: p.x,
      originY: p.y,
      ids: movableIds,
      startElements,
      startBox: getSelectionBBox(movableIds, engine.getState().doc),
    });
  };

  const onCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const p = clientToCanvas(e.clientX, e.clientY);

    // OS image file drop
    const dt = e.dataTransfer;
    // Prefer files
    if (dt.files && dt.files.length > 0) {
      for (const file of Array.from(dt.files)) {
        if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".svg")) continue;
        const href = await fileToDataUrl(file);
        // try to get natural size
        const { naturalWidth, naturalHeight } = await loadImageSize(href).catch(() => ({
          naturalWidth: undefined,
          naturalHeight: undefined,
        }));
        const w = naturalWidth && naturalWidth > 0 ? naturalWidth : undefined;
        const h = naturalHeight && naturalHeight > 0 ? naturalHeight : undefined;
        engine.createElement({ type: "image", x: p.x, y: p.y, href, width: w, height: h, naturalWidth, naturalHeight });
      }
      return;
    }

    // Fallback: try textual payloads (HTML/plain text/URI list)
    const htmlData = dt.getData("text/html");
    const plainData = dt.getData("text/plain");
    const uriData = dt.getData("text/uri-list");
    const textual = (htmlData || plainData || uriData || "").trim();
    if (textual) {
      if (/^data:image\//i.test(textual) || /^https?:\/\/.+\.(png|jpe?g|svg)$/i.test(textual)) {
        const href = textual;
        const { naturalWidth, naturalHeight } = await loadImageSize(href).catch(() => ({
          naturalWidth: undefined,
          naturalHeight: undefined,
        }));
        engine.createElement({ type: "image", x: p.x, y: p.y, href, width: naturalWidth, height: naturalHeight, naturalWidth, naturalHeight });
        return;
      }
      if (textual.startsWith("<svg")) {
        const href = "data:image/svg+xml;utf8," + encodeURIComponent(textual);
        const { naturalWidth, naturalHeight } = await loadImageSize(href).catch(() => ({
          naturalWidth: undefined,
          naturalHeight: undefined,
        }));
        engine.createElement({ type: "image", x: p.x, y: p.y, href, width: naturalWidth, height: naturalHeight, naturalWidth, naturalHeight });
        return;
      }
    }

    const paletteId =
      e.dataTransfer.getData("application/x-designer-palette") ||
      // Back-compat with the old payload used by the palette before the registry refactor
      e.dataTransfer.getData("application/x-designer-tool");
    if (!paletteId) return;

    host.elements.createFromPalette(engine, paletteId, p);
  };

  const onCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  // Handle OS clipboard paste (images, data URLs, SVG text)
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const cb = e.clipboardData;
      if (!cb) return;

      // Helper to compute center canvas point
      const getCenter = () => {
        const scroller = scrollRef.current;
        let x = state.doc.canvas.width / 2;
        let y = state.doc.canvas.height / 2;
        if (scroller) {
          const contentPxX = scroller.scrollLeft + scroller.clientWidth / 2;
          const contentPxY = scroller.scrollTop + scroller.clientHeight / 2;
          x = contentPxX / state.zoom.scale;
          y = contentPxY / state.zoom.scale;
        }
        return { x, y };
      };

      // First handle files (recommended when user copied an OS file)
      if (cb.files && cb.files.length > 0) {
        e.preventDefault();
        for (const file of Array.from(cb.files)) {
          if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".svg")) continue;
          const href = await fileToDataUrl(file);
          const { x, y } = getCenter();
          engine.createElement({ type: "image", x, y, href });
        }
        return;
      }

      // Next, inspect DataTransferItemList for string content (more reliable)
      const items = Array.from(cb.items || []);
      for (const item of items) {
        if (item.kind === "string") {
          // Promisify getAsString
          const text = await new Promise<string>((resolve) => item.getAsString((s) => resolve(s || "")));
          const trimmed = text.trim();
          if (!trimmed) continue;
          // data URL or direct image URL
          if (/^data:image\//i.test(trimmed) || /^https?:\/\/.+\.(png|jpe?g|svg)$/i.test(trimmed)) {
            e.preventDefault();
            const { x, y } = getCenter();
            engine.createElement({ type: "image", x, y, href: trimmed });
            return;
          }
          // Raw SVG markup
          if (trimmed.startsWith("<svg")) {
            e.preventDefault();
            const href = "data:image/svg+xml;utf8," + encodeURIComponent(trimmed);
            const { x, y } = getCenter();
            engine.createElement({ type: "image", x, y, href });
            return;
          }
        }
      }

      // If we found no external clipboard content, fall back to engine clipboard
      try {
        e.preventDefault();
      } catch {}
      engine.pasteClipboard();
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [engine, state.doc.canvas.width, state.doc.canvas.height, state.zoom.scale]);

  // Keep scroll position in sync with engine zoom.panX/panY when zoom state changes.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    // Convert pan (canvas units) to content pixels
    const left = Math.max(0, Math.round((state.zoom.panX ?? 0) * state.zoom.scale));
    const top = Math.max(0, Math.round((state.zoom.panY ?? 0) * state.zoom.scale));
    // Apply without triggering layout thrash in tight loops
    requestAnimationFrame(() => {
      scroller.scrollLeft = left;
      scroller.scrollTop = top;
    });
  }, [state.zoom.scale, state.zoom.panX, state.zoom.panY]);

  const onWheel = (e: React.WheelEvent) => {
    // Zoom when Ctrl+scroll OR when magnifier tool is active
    if (!e.ctrlKey && state.tool !== "magnifier") return;
    e.preventDefault();

    const scroller = scrollRef.current;
    const oldScale = state.zoom.scale;

    // Smooth exponential zoom factor — feels more like Photoshop
    const zoomFactor = Math.exp(-e.deltaY * 0.002);
    let nextScale = oldScale * zoomFactor;
    nextScale = Math.max(0.05, Math.min(16, nextScale));

    if (scroller) {
      const containerRect = scroller.getBoundingClientRect();
      const pointerX = e.clientX - containerRect.left;
      const pointerY = e.clientY - containerRect.top;

      // canvas coordinates under cursor before scaling (in canvas units)
      const contentPxX = scroller.scrollLeft + pointerX;
      const contentPxY = scroller.scrollTop + pointerY;
      const canvasX = contentPxX / oldScale;
      const canvasY = contentPxY / oldScale;

      // Compute new pan (in canvas units) so canvasX/canvasY stays under pointer
      const newPanX = canvasX - pointerX / nextScale;
      const newPanY = canvasY - pointerY / nextScale;

      // Clamp pan to canvas bounds (in canvas units)
      const maxPanX = Math.max(0, state.doc.canvas.width - containerRect.width / nextScale);
      const maxPanY = Math.max(0, state.doc.canvas.height - containerRect.height / nextScale);

      engine.setZoom({ scale: nextScale, panX: clamp(newPanX, 0, maxPanX), panY: clamp(newPanY, 0, maxPanY) });
      return;
    }

    engine.setZoom({ scale: nextScale });
  };

  const gridPatternId = "gridPattern";

  return (
    <div ref={scrollRef} className="h-full w-full">
      <div className="min-h-full min-w-full flex items-start justify-start p-4">
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          viewBox={viewBox}
          className="border border-black/20 bg-transparent"
          onPointerDown={onCanvasPointerDown}
          onDrop={onCanvasDrop}
          onDragOver={onCanvasDragOver}
          onWheel={onWheel}
        >
          <defs>
            <pattern id={gridPatternId} width={state.doc.canvas.gridSize} height={state.doc.canvas.gridSize} patternUnits="userSpaceOnUse">
              <path
                d={`M ${state.doc.canvas.gridSize} 0 L 0 0 0 ${state.doc.canvas.gridSize}`}
                fill="none"
                stroke="black"
                opacity="0.12"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <g>
            <rect x={0} y={0} width={state.doc.canvas.width} height={state.doc.canvas.height} fill={state.doc.canvas.background} />
            {state.doc.canvas.gridEnabled && !state.viewMode && (
              <rect x={0} y={0} width={state.doc.canvas.width} height={state.doc.canvas.height} fill={`url(#${gridPatternId})`} />
            )}

            <RenderTree
              doc={state.doc}
              rootIds={state.doc.rootIds}
              onRegister={(id, node) => {
                if (node) elRefs.current.set(id, node);
                else elRefs.current.delete(id);
              }}
              renderCustom={renderCustom}
              api={host.api}
            />

            {dragUi.kind === "free" && dragUi.points.length > 1 && (
              <path d={pointsToPath(dragUi.points)} fill="none" stroke="var(--foreground)" strokeWidth={2} opacity={0.8} />
            )}

            {dragUi.kind === "marquee" && (
              <rect
                x={Math.min(dragUi.startX, dragUi.x)}
                y={Math.min(dragUi.startY, dragUi.y)}
                width={Math.abs(dragUi.x - dragUi.startX)}
                height={Math.abs(dragUi.y - dragUi.startY)}
                fill="transparent"
                stroke="var(--foreground)"
                strokeWidth={1}
                opacity={0.7}
                pointerEvents="none"
              />
            )}

            {selectionBox && (
              <SelectionOverlay
                box={selectionBox}
                state={state}
                onStartResize={(mode) => {
                  engine.beginHistoryBatch();
                  dragRef.current = mode;
                  setDragUi(mode);
                }}
                onStartRotate={(mode) => {
                  engine.beginHistoryBatch();
                  dragRef.current = mode;
                  setDragUi(mode);
                }}
                onStartLineEnd={(mode) => {
                  engine.beginHistoryBatch();
                  dragRef.current = mode;
                  setDragUi(mode);
                }}
                onStartCircleR={(mode) => {
                  engine.beginHistoryBatch();
                  dragRef.current = mode;
                  setDragUi(mode);
                }}
              />
            )}
          </g>
        </svg>
      </div>
      {pendingMagnifier && (
        <div className="absolute top-4 right-4 z-50">
          <MagnifierOverlay
            initialPercent={Math.round(pendingMagnifier.suggestedScale * 100)}
            onApply={(percent) => {
              const scroller = scrollRef.current;
              if (!scroller) return setPendingMagnifier(null);
              const containerRect = scroller.getBoundingClientRect();
              const newScale = Math.max(0.1, Math.min(8, percent / 100));

              // Center selection in viewport by computing pan in canvas units
              const centerX = pendingMagnifier.box.x + pendingMagnifier.box.width / 2;
              const centerY = pendingMagnifier.box.y + pendingMagnifier.box.height / 2;
              const newPanX = centerX - containerRect.width / (2 * newScale);
              const newPanY = centerY - containerRect.height / (2 * newScale);
              const maxPanX = Math.max(0, state.doc.canvas.width - containerRect.width / newScale);
              const maxPanY = Math.max(0, state.doc.canvas.height - containerRect.height / newScale);

              engine.setZoom({ scale: newScale, panX: clamp(newPanX, 0, maxPanX), panY: clamp(newPanY, 0, maxPanY) });
              setPendingMagnifier(null);
            }}
            onCancel={() => setPendingMagnifier(null)}
          />
        </div>
      )}
    </div>
  );
}
