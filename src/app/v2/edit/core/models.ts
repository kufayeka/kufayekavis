export type Tool = "select" | "rect" | "circle" | "line" | "image" | "text" | "freehand";

export type ElementType =
    | "rect"
    | "circle"
    | "line"
    | "image"
    | "text"
    | "freehand"
    | "group";

export interface Point {
    x: number;
    y: number;
}

export interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface BaseElement {
    id: string;
    type: ElementType;
    name: string;
    rotation: number;
    flipX: boolean;
    flipY: boolean;
    opacity: number;
    stroke: string;
    fill: string;
    strokeWidth: number;
    visible: boolean;
    locked: boolean;
    parentId?: string | null;
}

export interface RectElement extends BaseElement {
    type: "rect";
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
}

export interface CircleElement extends BaseElement {
    type: "circle";
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ImageElement extends BaseElement {
    type: "image";
    x: number;
    y: number;
    width: number;
    height: number;
    src: string;
}

export interface TextElement extends BaseElement {
    type: "text";
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    fontSize: number;
    fontFamily: string;
}

export interface LineElement extends BaseElement {
    type: "line";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface FreehandElement extends BaseElement {
    type: "freehand";
    points: Point[];
}

export interface GroupElement extends BaseElement {
    type: "group";
    children: string[];
}

export type CanvasElement =
    | RectElement
    | CircleElement
    | ImageElement
    | TextElement
    | LineElement
    | FreehandElement
    | GroupElement;

export type ResizeHandle =
    | "nw"
    | "n"
    | "ne"
    | "e"
    | "se"
    | "s"
    | "sw"
    | "w";

export interface CanvasSettings {
    width: number;
    height: number;
    background: string;
    gridEnabled: boolean;
    gridSize: number;
}
