"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "../edit.module.css";
import { useEditor } from "../state/EditorContext";
import { hitTest } from "../core/hitTest";
import {
    getBounds,
    getHandleAtPoint,
    getHandlePositions,
    resizeBoundsFromHandle,
    resizeElement,
    scaleElementWithinBounds,
    snapPoint,
    translateElement,
} from "../core/geometry";
import { renderCanvas, toCanvasPoint } from "../core/renderer";
import { CanvasElement, ElementType, Point, ResizeHandle } from "../core/models";
import { createElement } from "../core/elementFactory";

type ActiveHandle = ResizeHandle | "line-start" | "line-end" | "rotate";

interface DragState {
    mode: "none" | "move" | "resize" | "draw" | "freehand" | "rotate";
    start: Point;
    handle?: ActiveHandle;
    elementId?: string;
    startBounds?: ReturnType<typeof getBounds>;
    initialElements?: Record<string, CanvasElement>;
    rotateStartAngle?: number;
    initialRotation?: number;
}

interface MarqueeState {
    active: boolean;
    start: Point;
    current: Point;
    addToSelection: boolean;
}

const useCanvasRenderer = (marqueeBounds?: ReturnType<typeof getBounds>) => {
    const { state } = useEditor();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        renderCanvas(
            ctx,
            state.canvas,
            state.rootIds,
            state.elements,
            state.selectedIds,
            marqueeBounds
        );
    }, [state, marqueeBounds]);

    return canvasRef;
};

export default function CanvasWorkspace() {
    const { state, dispatch } = useEditor();
    const dragState = useRef<DragState>({ mode: "none", start: { x: 0, y: 0 } });
    const [marquee, setMarquee] = useState<MarqueeState | null>(null);

    const getBoundsFromMarquee = (start: Point, current: Point) => ({
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        width: Math.abs(current.x - start.x),
        height: Math.abs(current.y - start.y),
    });

    const getRotateHandlePoint = (element: CanvasElement, bounds: ReturnType<typeof getBounds>) => {
        const center = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
        };
        const offset = { x: 0, y: -bounds.height / 2 - 24 };
        const radians = (element.rotation * Math.PI) / 180;
        const rotated = {
            x: offset.x * Math.cos(radians) - offset.y * Math.sin(radians),
            y: offset.x * Math.sin(radians) + offset.y * Math.cos(radians),
        };
        return { x: center.x + rotated.x, y: center.y + rotated.y };
    };

    const getRotateHandleAtPoint = (element: CanvasElement, point: Point) => {
        if (element.type === "line") return null;
        const bounds = getBounds(element, state.elements);
        const handle = getRotateHandlePoint(element, bounds);
        const dist = Math.hypot(point.x - handle.x, point.y - handle.y);
        return dist <= 12 ? ("rotate" as const) : null;
    };

    const getRotatedHandleAtPoint = (
        element: CanvasElement,
        bounds: ReturnType<typeof getBounds>,
        point: Point
    ) => {
        if (element.type === "line") return null;
        const center = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
        };
        const radians = (element.rotation * Math.PI) / 180;
        const handles = getHandlePositions(bounds);
        const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

        const rotatedHandleEntries = (Object.entries(handles) as [ResizeHandle, Point][])
            .map(([key, handle]) => {
                const local = { x: handle.x - center.x, y: handle.y - center.y };
                const rotated = {
                    x: local.x * Math.cos(radians) - local.y * Math.sin(radians),
                    y: local.x * Math.sin(radians) + local.y * Math.cos(radians),
                };
                return [key, { x: center.x + rotated.x, y: center.y + rotated.y }] as const;
            });

        return (
            rotatedHandleEntries.find(([_, handle]) => distance(handle, point) <= 14)?.[0] ?? null
        );
    };

    const toLocalPoint = (element: CanvasElement, bounds: ReturnType<typeof getBounds>, point: Point) => {
        if (!element.rotation) return point;
        const center = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
        };
        const radians = (-element.rotation * Math.PI) / 180;
        const local = { x: point.x - center.x, y: point.y - center.y };
        const rotated = {
            x: local.x * Math.cos(radians) - local.y * Math.sin(radians),
            y: local.x * Math.sin(radians) + local.y * Math.cos(radians),
        };
        return { x: center.x + rotated.x, y: center.y + rotated.y };
    };

    const getLineHandleAtPoint = (element: CanvasElement, point: Point) => {
        if (element.type !== "line") return null;
        const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
        const start = { x: element.x1, y: element.y1 };
        const end = { x: element.x2, y: element.y2 };
        if (distance(start, point) <= 14) return "line-start" as const;
        if (distance(end, point) <= 14) return "line-end" as const;
        return null;
    };

    const distanceToSegment = (p: Point, a: Point, b: Point) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
        const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
        const clamped = Math.max(0, Math.min(1, t));
        const proj = { x: a.x + clamped * dx, y: a.y + clamped * dy };
        return Math.hypot(p.x - proj.x, p.y - proj.y);
    };

    const getLineHover = (point: Point) => {
        for (let i = state.rootIds.length - 1; i >= 0; i -= 1) {
            const element = state.elements[state.rootIds[i]];
            if (!element || element.type !== "line" || !element.visible || element.locked) continue;
            const start = { x: element.x1, y: element.y1 };
            const end = { x: element.x2, y: element.y2 };
            const dist = distanceToSegment(point, start, end);
            if (dist <= 10) return element;
        }
        return null;
    };

    const getCursorForHandle = (handle: ActiveHandle | null) => {
        if (!handle) return "default";
        if (handle === "line-start" || handle === "line-end") return "crosshair";
        if (handle === "rotate") return "grab";
        switch (handle) {
            case "n":
            case "s":
                return "ns-resize";
            case "e":
            case "w":
                return "ew-resize";
            case "ne":
            case "sw":
                return "nesw-resize";
            case "nw":
            case "se":
                return "nwse-resize";
            default:
                return "default";
        }
    };

    const marqueeBounds = marquee?.active
        ? getBoundsFromMarquee(marquee.start, marquee.current)
        : undefined;
    const canvasRef = useCanvasRenderer(marqueeBounds);

    const getGroupDescendants = (id: string, acc: string[] = []) => {
        const element = state.elements[id];
        if (!element || element.type !== "group") return acc;
        element.children.forEach((childId) => {
            acc.push(childId);
            const child = state.elements[childId];
            if (child?.type === "group") getGroupDescendants(childId, acc);
        });
        return acc;
    };

    const snapIfNeeded = (point: Point) =>
        state.canvas.gridEnabled
            ? snapPoint(point, state.canvas.gridSize)
            : point;

    const isMultiSelectKey = (event: React.MouseEvent<HTMLCanvasElement>) =>
        event.ctrlKey || event.metaKey;

    const getSelectableElements = () =>
        Object.values(state.elements).filter(
            (element) => element.visible && !element.locked
        );

    const getElementsInBounds = (bounds: ReturnType<typeof getBounds>) => {
        const elements = getSelectableElements();
        return elements.filter((element) => {
            const elementBounds = getBounds(element, state.elements);
            return (
                elementBounds.x <= bounds.x + bounds.width &&
                elementBounds.x + elementBounds.width >= bounds.x &&
                elementBounds.y <= bounds.y + bounds.height &&
                elementBounds.y + elementBounds.height >= bounds.y
            );
        });
    };

    const handlePointerDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const point = toCanvasPoint(event, canvas);
        const snapped = snapIfNeeded(point);

        if (state.selectedIds.length === 1) {
            const selected = state.elements[state.selectedIds[0]];
            if (selected && selected.type !== "line") {
                const bounds = getBounds(selected, state.elements);
                const rotateHandle = getRotateHandleAtPoint(selected, point);
                const resizeHandle = getRotatedHandleAtPoint(selected, bounds, point);
                const handle = rotateHandle ?? resizeHandle;
                if (handle) {
                    dragState.current = {
                        mode: handle === "rotate" ? "rotate" : "resize",
                        start: snapped,
                        handle,
                        elementId: selected.id,
                        startBounds: bounds,
                        rotateStartAngle:
                            handle === "rotate"
                                ? Math.atan2(
                                      snapped.y - (bounds.y + bounds.height / 2),
                                      snapped.x - (bounds.x + bounds.width / 2)
                                  ) *
                                      (180 / Math.PI)
                                : undefined,
                        initialRotation: handle === "rotate" ? selected.rotation : undefined,
                    };
                    return;
                }
            }
        }

        const hit = hitTest(state.rootIds, state.elements, point) ?? getLineHover(point);
        if (hit) {
            const bounds = getBounds(hit, state.elements);
            const rotateHandle =
                state.selectedIds.length === 1 ? getRotateHandleAtPoint(hit, point) : null;
            const resizeHandle = state.selectedIds.length === 1
                ? hit.type === "line"
                    ? getLineHandleAtPoint(hit, point)
                    : getRotatedHandleAtPoint(hit, bounds, point)
                : hit.type === "line"
                    ? getLineHandleAtPoint(hit, point)
                    : null;
            const handle = rotateHandle ?? resizeHandle;
            if (handle) {
                dispatch({ type: "SET_SELECTION", ids: [hit.id] });
                dragState.current = {
                    mode: handle === "rotate" ? "rotate" : "resize",
                    start: snapped,
                    handle,
                    elementId: hit.id,
                    startBounds: bounds,
                    rotateStartAngle:
                        handle === "rotate"
                            ? Math.atan2(
                                  snapped.y - (bounds.y + bounds.height / 2),
                                  snapped.x - (bounds.x + bounds.width / 2)
                              ) *
                                  (180 / Math.PI)
                            : undefined,
                    initialRotation: handle === "rotate" ? hit.rotation : undefined,
                };
                return;
            }

            if (isMultiSelectKey(event)) {
                const nextSelection = state.selectedIds.includes(hit.id)
                    ? state.selectedIds.filter((id) => id !== hit.id)
                    : [...state.selectedIds, hit.id];
                dispatch({ type: "SET_SELECTION", ids: nextSelection });
            } else {
                if (!state.selectedIds.includes(hit.id)) {
                    dispatch({ type: "SET_SELECTION", ids: [hit.id] });
                }
            }
            dragState.current = {
                mode: "move",
                start: snapped,
                initialElements: state.elements,
            };
            return;
        }

        if (!isMultiSelectKey(event)) {
            dispatch({ type: "SET_SELECTION", ids: [] });
        }
        setMarquee({
            active: true,
            start: snapped,
            current: snapped,
            addToSelection: isMultiSelectKey(event),
        });
    };

    const handlePointerMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const point = toCanvasPoint(event, canvas);
        const snapped = snapIfNeeded(point);
        const drag = dragState.current;

        if (drag.mode === "none") {
            const selected = state.selectedIds.length === 1
                ? state.elements[state.selectedIds[0]]
                : null;
            if (selected && selected.type !== "line") {
                const bounds = getBounds(selected, state.elements);
                const rotateHandle = getRotateHandleAtPoint(selected, point);
                const resizeHandle = getRotatedHandleAtPoint(selected, bounds, point);
                const handle = rotateHandle ?? resizeHandle;
                if (handle) {
                    canvas.style.cursor = getCursorForHandle(handle);
                    return;
                }
            }

            const hit = hitTest(state.rootIds, state.elements, point) ?? getLineHover(point);
            if (hit && state.selectedIds.length === 1 && state.selectedIds[0] === hit.id) {
                const rotateHandle = getRotateHandleAtPoint(hit, point);
                const bounds = getBounds(hit, state.elements);
                const handle = rotateHandle ?? (hit.type === "line"
                    ? getLineHandleAtPoint(hit, point)
                    : getRotatedHandleAtPoint(hit, bounds, point));
                canvas.style.cursor = getCursorForHandle(handle);
            } else if (hit) {
                canvas.style.cursor = "move";
            } else {
                canvas.style.cursor = "default";
            }
        }

        if (drag.mode === "move" && drag.initialElements) {
            const delta = {
                x: snapped.x - drag.start.x,
                y: snapped.y - drag.start.y,
            };
            const updates: Record<string, Partial<CanvasElement>> = {};
            const updateIds = new Set<string>();
            state.selectedIds.forEach((id) => {
                const element = drag.initialElements?.[id];
                if (!element) return;
                if (element.locked) return;
                if (element.type === "group") {
                    const descendants = getGroupDescendants(id);
                    descendants.forEach((childId) => updateIds.add(childId));
                } else {
                    updateIds.add(id);
                }
            });
            updateIds.forEach((id) => {
                const element = drag.initialElements?.[id];
                if (!element || element.locked) return;
                updates[id] = translateElement(element, delta);
            });
            dispatch({ type: "UPDATE_ELEMENTS", payload: updates });
        }

        if (drag.mode === "rotate" && drag.elementId && drag.startBounds) {
            const element = state.elements[drag.elementId];
            if (!element || element.type === "line") return;
            const center = {
                x: drag.startBounds.x + drag.startBounds.width / 2,
                y: drag.startBounds.y + drag.startBounds.height / 2,
            };
            const angle = Math.atan2(snapped.y - center.y, snapped.x - center.x) * (180 / Math.PI);
            const delta = angle - (drag.rotateStartAngle ?? 0);
            const nextRotation = (drag.initialRotation ?? 0) + delta;
            dispatch({ type: "UPDATE_ELEMENT", id: element.id, payload: { rotation: nextRotation } });
        }

        if (drag.mode === "resize" && drag.elementId && drag.startBounds && drag.handle) {
            const element = state.elements[drag.elementId];
            if (!element) return;
            if (element.type === "line") {
                if (drag.handle === "line-start") {
                    dispatch({
                        type: "UPDATE_ELEMENT",
                        id: element.id,
                        payload: { x1: snapped.x, y1: snapped.y },
                    });
                }
                if (drag.handle === "line-end") {
                    dispatch({
                        type: "UPDATE_ELEMENT",
                        id: element.id,
                        payload: { x2: snapped.x, y2: snapped.y },
                    });
                }
                return;
            }
            const localPoint = toLocalPoint(element, drag.startBounds, snapped);
            const nextBounds = resizeBoundsFromHandle(drag.startBounds, drag.handle, localPoint);
            if (element.type === "group") {
                const updates: Record<string, Partial<CanvasElement>> = {};
                const descendants = getGroupDescendants(element.id);
                descendants.forEach((childId) => {
                    const child = state.elements[childId];
                    if (!child || child.locked) return;
                    updates[childId] = scaleElementWithinBounds(child, drag.startBounds!, nextBounds);
                });
                dispatch({ type: "UPDATE_ELEMENTS", payload: updates });
            } else {
                const resized = resizeElement(element, drag.startBounds, nextBounds);
                dispatch({ type: "UPDATE_ELEMENT", id: element.id, payload: resized });
            }
        }

        if (marquee?.active) {
            setMarquee((prev) =>
                prev ? { ...prev, current: snapped } : prev
            );
        }
    };

    const handlePointerUp = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.style.cursor = "default";
        }
        if (marquee?.active) {
            const bounds = getBoundsFromMarquee(marquee.start, marquee.current);
            const hits = getElementsInBounds(bounds).map((element) => element.id);
            const nextSelection = marquee.addToSelection
                ? Array.from(new Set([...state.selectedIds, ...hits]))
                : hits;
            dispatch({ type: "SET_SELECTION", ids: nextSelection });
            setMarquee(null);
        }
        dragState.current = { mode: "none", start: { x: 0, y: 0 } };
    };

    const getPointFromClient = (clientX: number, clientY: number): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        event.preventDefault();
        const type = event.dataTransfer.getData("application/x-kufayeka-element") as ElementType;
        if (!type || type === "freehand") return;
        const rawPoint = getPointFromClient(event.clientX, event.clientY);
        const snapped = snapIfNeeded(rawPoint);
        const element = createElement(type, {
            x: snapped.x,
            y: snapped.y,
            x1: snapped.x,
            y1: snapped.y,
            x2: snapped.x + 120,
            y2: snapped.y + 80,
            points: [snapped, { x: snapped.x + 60, y: snapped.y + 40 }],
        } as CanvasElement);
        dispatch({ type: "ADD_ELEMENTS", elements: [element] });
    };

    const handleCanvasDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    };

    return (
        <div className={styles.canvasArea}>
            <div
                className={styles.canvasContainer}
                onDragOver={handleCanvasDragOver}
                onDrop={handleCanvasDrop}
            >
                <canvas
                    ref={canvasRef}
                    className={styles.canvas}
                    width={state.canvas.width}
                    height={state.canvas.height}
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                />
            </div>
        </div>
    );
}
