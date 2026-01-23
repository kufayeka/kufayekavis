import { CanvasElement, Point } from "./models";
import { getBounds, pointInBounds } from "./geometry";

const distanceToSegment = (p: Point, a: Point, b: Point) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    const clamped = Math.max(0, Math.min(1, t));
    const proj = { x: a.x + clamped * dx, y: a.y + clamped * dy };
    return Math.hypot(p.x - proj.x, p.y - proj.y);
};

const hitTestElement = (
    element: CanvasElement,
    elementsById: Record<string, CanvasElement>,
    point: Point
): CanvasElement | null => {
    if (!element.visible || element.locked) return null;

    if (element.type === "group") {
        for (let i = element.children.length - 1; i >= 0; i -= 1) {
            const child = elementsById[element.children[i]];
            if (!child) continue;
            const hit = hitTestElement(child, elementsById, point);
            if (hit) return hit;
        }
        return null;
    }

    const bounds = getBounds(element, elementsById);
    if (!pointInBounds(point, bounds)) return null;

    switch (element.type) {
        case "line": {
            const dist = distanceToSegment(
                point,
                { x: element.x1, y: element.y1 },
                { x: element.x2, y: element.y2 }
            );
            return dist <= 6 ? element : null;
        }
        case "freehand": {
            for (let i = 0; i < element.points.length - 1; i += 1) {
                const dist = distanceToSegment(
                    point,
                    element.points[i],
                    element.points[i + 1]
                );
                if (dist <= 6) return element;
            }
            return null;
        }
        default:
            return element;
    }
};

export const hitTest = (
    rootIds: string[],
    elementsById: Record<string, CanvasElement>,
    point: Point
): CanvasElement | null => {
    for (let i = rootIds.length - 1; i >= 0; i -= 1) {
        const element = elementsById[rootIds[i]];
        if (!element) continue;
        const hit = hitTestElement(element, elementsById, point);
        if (hit) return hit;
    }
    return null;
};
