export type ElementId = string;

export type Vec2 = { x: number; y: number };

export type CanvasSettings = {
  width: number;
  height: number;
  background: string;
  gridEnabled: boolean;
  gridSize: number;
  snapToGrid: boolean;
};

export type BaseElement = {
  id: ElementId;
  type: DesignerElementType;
  name?: string;
  locked?: boolean;
  hidden?: boolean;
  parentId?: ElementId; // group id
  zIndex: number;
  rotation: number; // degrees
  // allow simple flips
  flipH?: boolean;
  flipV?: boolean;
  opacity: number; // 0..1
  stroke: string;
  strokeWidth: number;
  fill: string;
  // Event listeners
  enableOnMouseHoverEventListener?: boolean;
  enableOnMouseClickEventListener?: boolean;
  enableOnMouseLeaveEventListener?: boolean;
  // MQTT topic for event publishing
  mqttTopic?: string;
};

export type RectElement = BaseElement & {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  ry: number;
};

export type CircleElement = BaseElement & {
  type: "circle";
  cx: number;
  cy: number;
  r: number;
};

export type LineElement = BaseElement & {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type FreeDrawElement = BaseElement & {
  type: "free";
  d: string; // SVG path 'd'
};

export type ImageElement = BaseElement & {
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  href: string; // data url or url
  preserveAspectRatio: string;
  // fit mode controls how the image is rendered within the element box.
  // 'none' means raw pixel sizing, 'contain' will letterbox inside the box,
  // 'cover' will crop to fill the box.
  fit?: "none" | "contain" | "cover" | "stretch";
  // natural dimensions from the source image when available
  naturalWidth?: number;
  naturalHeight?: number;
};

export type TextElement = BaseElement & {
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontWeight: string; // 'normal'|'bold' etc
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  fill: string; // text color
};

export type GroupElement = BaseElement & {
  type: "group";
  childIds: ElementId[];
};

// Custom/pluggable element kind. Plugins can register render/export logic keyed by `kind`.
// We keep it box-based so it can be moved/resized like a rect by default.
export type CustomElement = BaseElement & {
  type: "custom";
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
};

export type DesignerElementType =
  | "rect"
  | "circle"
  | "line"
  | "free"
  | "image"
  | "text"
  | "custom"
  | "group";

export type DesignerElement =
  | RectElement
  | CircleElement
  | LineElement
  | FreeDrawElement
  | ImageElement
  | TextElement
  | CustomElement
  | GroupElement;

export type DesignerDocumentSnapshot = {
  version: 1;
  canvas: CanvasSettings;
  elements: Record<ElementId, DesignerElement>;
  rootIds: ElementId[];
  nextZ: number;
};

export type DesignerHistory = {
  limit: number;
  past: DesignerDocumentSnapshot[];
  future: DesignerDocumentSnapshot[];
};

export type DesignerDocument = {
  version: 1;
  canvas: CanvasSettings;
  elements: Record<ElementId, DesignerElement>;
  rootIds: ElementId[];
  nextZ: number;

  // Optional to keep backward compatibility with older exported JSON.
  history?: DesignerHistory;
};

export type ZoomState = {
  scale: number;
  panX: number;
  panY: number;
};

export type SelectionState = {
  ids: ElementId[];
};
export type BuiltinTool =
  | "select"
  | "rect"
  | "circle"
  | "line"
  | "free"
  | "image"
  | "text"
  | "magnifier";

// Tool ids are intentionally string so plugins can introduce new tools.
export type ToolType = string;

export type ClipboardPayload = {
  version: 1;
  elements: DesignerElement[];
};
