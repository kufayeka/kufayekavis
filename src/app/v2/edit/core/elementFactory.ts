import { createId } from "./ids";
import {
    CanvasElement,
    ElementType,
    FreehandElement,
    LineElement,
    Point,
} from "./models";

const baseDefaults = () => ({
    rotation: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    stroke: "#e2e8f0",
    fill: "#1d4ed8",
    strokeWidth: 2,
    visible: true,
    locked: false,
    parentId: null,
});

export const createElement = (
    type: ElementType,
    payload: Partial<CanvasElement> = {}
): CanvasElement => {
    const id = createId(type);
    const name = `${type}-${id.slice(-4)}`;

    switch (type) {
        case "rect":
            return {
                id,
                type,
                name,
                x: 100,
                y: 100,
                width: 160,
                height: 120,
                radius: 12,
                ...baseDefaults(),
                ...(payload as CanvasElement),
            };
        case "circle":
            return {
                id,
                type,
                name,
                x: 120,
                y: 120,
                width: 140,
                height: 140,
                ...baseDefaults(),
                ...(payload as CanvasElement),
            };
        case "line":
            return {
                id,
                type,
                name,
                x1: 120,
                y1: 120,
                x2: 260,
                y2: 200,
                ...baseDefaults(),
                fill: "transparent",
                ...(payload as LineElement),
            };
        case "image":
            return {
                id,
                type,
                name,
                x: 160,
                y: 160,
                width: 220,
                height: 160,
                src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
                ...baseDefaults(),
                fill: "transparent",
                ...(payload as CanvasElement),
            };
        case "text":
            return {
                id,
                type,
                name,
                x: 180,
                y: 180,
                width: 240,
                height: 80,
                text: "Edit me",
                fontSize: 28,
                fontFamily: "Inter, system-ui",
                ...baseDefaults(),
                fill: "#e2e8f0",
                stroke: "transparent",
                ...(payload as CanvasElement),
            };
        case "freehand":
            return {
                id,
                type,
                name,
                points: (payload as FreehandElement)?.points ?? ([
                    { x: 200, y: 200 },
                    { x: 240, y: 240 },
                ] as Point[]),
                ...baseDefaults(),
                fill: "transparent",
                ...(payload as CanvasElement),
            };
        case "group":
            return {
                id,
                type,
                name,
                children: [],
                ...baseDefaults(),
                fill: "transparent",
                stroke: "transparent",
                ...(payload as CanvasElement),
            };
        default:
            throw new Error(`Unsupported element type: ${type}`);
    }
};
