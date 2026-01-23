import {
    Bounds,
    CanvasElement,
    Point,
    ResizeHandle,
} from "./models";

export const getBounds = (
    element: CanvasElement,
    elementsById: Record<string, CanvasElement> = {}
): Bounds => {
    switch (element.type) {
        case "rect":
        case "circle":
        case "image":
        case "text":
            return normalizeBounds({
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
            });
        case "line":
            return normalizeBounds({
                x: Math.min(element.x1, element.x2),
                y: Math.min(element.y1, element.y2),
                width: Math.abs(element.x2 - element.x1),
                height: Math.abs(element.y2 - element.y1),
            });
        case "freehand":
            return getBoundsFromPoints(element.points);
        case "group": {
            const childBounds = element.children
                .map((childId) => elementsById[childId])
                .filter(Boolean)
                .map((child) => getBounds(child, elementsById));
            if (!childBounds.length) {
                return { x: 0, y: 0, width: 0, height: 0 };
            }
            const minX = Math.min(...childBounds.map((b) => b.x));
            const minY = Math.min(...childBounds.map((b) => b.y));
            const maxX = Math.max(...childBounds.map((b) => b.x + b.width));
            const maxY = Math.max(...childBounds.map((b) => b.y + b.height));
            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
            };
        }
        default:
            return { x: 0, y: 0, width: 0, height: 0 };
    }
};

export const normalizeBounds = (bounds: Bounds): Bounds => ({
    x: bounds.width < 0 ? bounds.x + bounds.width : bounds.x,
    y: bounds.height < 0 ? bounds.y + bounds.height : bounds.y,
    width: Math.abs(bounds.width),
    height: Math.abs(bounds.height),
});

export const getBoundsFromPoints = (points: Point[]): Bounds => {
    if (!points.length) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
};

export const getCenter = (bounds: Bounds): Point => ({
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
});

export const snapValue = (value: number, gridSize: number) =>
    Math.round(value / gridSize) * gridSize;

export const snapPoint = (point: Point, gridSize: number): Point => ({
    x: snapValue(point.x, gridSize),
    y: snapValue(point.y, gridSize),
});

export const pointInBounds = (point: Point, bounds: Bounds) =>
    point.x >= bounds.x &&
    point.y >= bounds.y &&
    point.x <= bounds.x + bounds.width &&
    point.y <= bounds.y + bounds.height;

export const getHandlePositions = (bounds: Bounds): Record<ResizeHandle, Point> => {
    const { x, y, width, height } = bounds;
    return {
        nw: { x, y },
        n: { x: x + width / 2, y },
        ne: { x: x + width, y },
        e: { x: x + width, y: y + height / 2 },
        se: { x: x + width, y: y + height },
        s: { x: x + width / 2, y: y + height },
        sw: { x, y: y + height },
        w: { x, y: y + height / 2 },
    };
};

export const getHandleAtPoint = (
    bounds: Bounds,
    point: Point,
    size = 8
): ResizeHandle | null => {
    const handles = getHandlePositions(bounds);
    return (
        (Object.keys(handles) as ResizeHandle[]).find((key) => {
            const handle = handles[key];
            return (
                point.x >= handle.x - size &&
                point.x <= handle.x + size &&
                point.y >= handle.y - size &&
                point.y <= handle.y + size
            );
        }) ?? null
    );
};

export const translateElement = (
    element: CanvasElement,
    delta: Point
): CanvasElement => {
    switch (element.type) {
        case "rect":
        case "circle":
        case "image":
        case "text":
            return {
                ...element,
                x: element.x + delta.x,
                y: element.y + delta.y,
            };
        case "line":
            return {
                ...element,
                x1: element.x1 + delta.x,
                y1: element.y1 + delta.y,
                x2: element.x2 + delta.x,
                y2: element.y2 + delta.y,
            };
        case "freehand":
            return {
                ...element,
                points: element.points.map((p) => ({
                    x: p.x + delta.x,
                    y: p.y + delta.y,
                })),
            };
        case "group":
            return element;
        default:
            return element;
    }
};

export const resizeBoundsFromHandle = (
    bounds: Bounds,
    handle: ResizeHandle,
    point: Point
): Bounds => {
    const next = { ...bounds };
    switch (handle) {
        case "nw":
            next.width = bounds.x + bounds.width - point.x;
            next.height = bounds.y + bounds.height - point.y;
            next.x = point.x;
            next.y = point.y;
            break;
        case "n":
            next.height = bounds.y + bounds.height - point.y;
            next.y = point.y;
            break;
        case "ne":
            next.width = point.x - bounds.x;
            next.height = bounds.y + bounds.height - point.y;
            next.y = point.y;
            break;
        case "e":
            next.width = point.x - bounds.x;
            break;
        case "se":
            next.width = point.x - bounds.x;
            next.height = point.y - bounds.y;
            break;
        case "s":
            next.height = point.y - bounds.y;
            break;
        case "sw":
            next.width = bounds.x + bounds.width - point.x;
            next.height = point.y - bounds.y;
            next.x = point.x;
            break;
        case "w":
            next.width = bounds.x + bounds.width - point.x;
            next.x = point.x;
            break;
        default:
            break;
    }
    return normalizeBounds(next);
};

const scalePoints = (points: Point[], from: Bounds, to: Bounds): Point[] => {
    const scaleX = from.width === 0 ? 1 : to.width / from.width;
    const scaleY = from.height === 0 ? 1 : to.height / from.height;
    return points.map((p) => ({
        x: to.x + (p.x - from.x) * scaleX,
        y: to.y + (p.y - from.y) * scaleY,
    }));
};

export const resizeElement = (
    element: CanvasElement,
    from: Bounds,
    to: Bounds
): CanvasElement => {
    switch (element.type) {
        case "rect":
        case "circle":
        case "image":
        case "text":
            return {
                ...element,
                x: to.x,
                y: to.y,
                width: to.width,
                height: to.height,
            };
        case "line": {
            const points = scalePoints(
                [
                    { x: element.x1, y: element.y1 },
                    { x: element.x2, y: element.y2 },
                ],
                from,
                to
            );
            return {
                ...element,
                x1: points[0].x,
                y1: points[0].y,
                x2: points[1].x,
                y2: points[1].y,
            };
        }
        case "freehand":
            return {
                ...element,
                points: scalePoints(element.points, from, to),
            };
        case "group":
            return element;
        default:
            return element;
    }
};

export const scaleElementWithinBounds = (
    element: CanvasElement,
    from: Bounds,
    to: Bounds
): CanvasElement => {
    const scaleX = from.width === 0 ? 1 : to.width / from.width;
    const scaleY = from.height === 0 ? 1 : to.height / from.height;
    const scalePoint = (point: Point): Point => ({
        x: to.x + (point.x - from.x) * scaleX,
        y: to.y + (point.y - from.y) * scaleY,
    });

    switch (element.type) {
        case "rect":
        case "circle":
        case "image":
        case "text":
            return {
                ...element,
                x: to.x + (element.x - from.x) * scaleX,
                y: to.y + (element.y - from.y) * scaleY,
                width: element.width * scaleX,
                height: element.height * scaleY,
            };
        case "line":
            return {
                ...element,
                x1: scalePoint({ x: element.x1, y: element.y1 }).x,
                y1: scalePoint({ x: element.x1, y: element.y1 }).y,
                x2: scalePoint({ x: element.x2, y: element.y2 }).x,
                y2: scalePoint({ x: element.x2, y: element.y2 }).y,
            };
        case "freehand":
            return {
                ...element,
                points: element.points.map(scalePoint),
            };
        case "group":
            return element;
        default:
            return element;
    }
};
