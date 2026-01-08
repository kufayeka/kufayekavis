import type { ElementDefinition } from "../elements";

export function getBuiltInElementDefinitions(): ElementDefinition[] {
  // NOTE: this file is kept for backward compatibility.
  // The source of truth for built-ins is now `createBuiltInElementRegistry()`.
  // We define the same built-in definitions inline so this module doesn't rely
  // on missing per-element files.
  return [
    {
      id: "rect",
      type: "rect",
      label: "Rect",
      palette: { label: "Rect", order: 10 },
      createInput: (pt) => ({ type: "rect", x: pt.x, y: pt.y }),
    },
    {
      id: "circle",
      type: "circle",
      label: "Circle",
      palette: { label: "Circle", order: 20 },
      createInput: (pt) => ({ type: "circle", x: pt.x, y: pt.y }),
    },
    {
      id: "line",
      type: "line",
      label: "Line",
      palette: { label: "Line", order: 30 },
      createInput: (pt) => ({ type: "line", x1: pt.x, y1: pt.y, x2: pt.x + 140, y2: pt.y + 60 }),
    },
    {
      id: "image",
      type: "image",
      label: "Image",
      palette: { label: "Image", order: 40 },
      createInput: (pt) => ({ type: "image", x: pt.x, y: pt.y, href: "" }),
    },
    {
      id: "text",
      type: "text",
      label: "Text",
      palette: { label: "Text", order: 50 },
      createInput: (pt) => ({ type: "text", x: pt.x, y: pt.y, text: "Text" }),
    },
    {
      id: "custom:customSvg",
      type: "custom",
      kind: "customSvg",
      label: "Custom SVG",
      palette: { label: "Custom SVG", order: 60 },
      createInput: (pt) => ({ type: "custom", kind: "customSvg", x: pt.x, y: pt.y, width: 220, height: 160, props: {} }),
    },
  ];
}
