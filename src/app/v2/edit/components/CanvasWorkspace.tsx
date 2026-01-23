"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "../edit.module.css";
import { useEditor } from "../state/EditorContext";
import { hitTest } from "../core/hitTest";
import {
    getBounds,
    getHandleAtPoint,
    resizeBoundsFromHandle,
    resizeElement,
    scaleElementWithinBounds,
    snapPoint,
    translateElement,
} from "../core/geometry";
import { renderCanvas, toCanvasPoint } from "../core/renderer";
import { CanvasElement, ElementType, Point, ResizeHandle } from "../core/models";
import { createElement } from "../core/elementFactory";

interface DragState {
    mode: "none" | "move" | "resize" | "draw" | "freehand";
    start: Point;
    handle?: ResizeHandle;
    elementId?: string;
    startBounds?: ReturnType<typeof getBounds>;
    initialElements?: Record<string, CanvasElement>;
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

        const hit = hitTest(state.rootIds, state.elements, point);
        if (hit) {
            const bounds = getBounds(hit, state.elements);
            const handle =
                state.selectedIds.length === 1
                    ? getHandleAtPoint(bounds, point)
                    : null;
            if (handle) {
                dragState.current = {
                    mode: "resize",
                    start: snapped,
                    handle,
                    elementId: hit.id,
                    startBounds: bounds,
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

        if (drag.mode === "resize" && drag.elementId && drag.startBounds && drag.handle) {
            const element = state.elements[drag.elementId];
            if (!element) return;
            const nextBounds = resizeBoundsFromHandle(drag.startBounds, drag.handle, snapped);
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
        if (!type) return;
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
