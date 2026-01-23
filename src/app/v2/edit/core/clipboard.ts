import { CanvasElement } from "./models";
import { createId } from "./ids";

const cloneElement = (element: CanvasElement, idMap: Map<string, string>): CanvasElement => {
    const newId = createId(element.type);
    idMap.set(element.id, newId);

    if (element.type === "group") {
        return {
            ...element,
            id: newId,
            children: element.children.map((childId) => idMap.get(childId) || childId),
        };
    }

    return { ...element, id: newId } as CanvasElement;
};

export const cloneElementsWithOffset = (
    elements: CanvasElement[],
    offset: { x: number; y: number }
): CanvasElement[] => {
    const idMap = new Map<string, string>();
    const cloned = elements.map((element) => cloneElement(element, idMap));

    return cloned.map((element) => {
        switch (element.type) {
            case "rect":
            case "circle":
            case "image":
            case "text":
                return {
                    ...element,
                    x: element.x + offset.x,
                    y: element.y + offset.y,
                };
            case "line":
                return {
                    ...element,
                    x1: element.x1 + offset.x,
                    y1: element.y1 + offset.y,
                    x2: element.x2 + offset.x,
                    y2: element.y2 + offset.y,
                };
            case "freehand":
                return {
                    ...element,
                    points: element.points.map((p) => ({
                        x: p.x + offset.x,
                        y: p.y + offset.y,
                    })),
                };
            case "group":
                return element;
            default:
                return element;
        }
    });
};
