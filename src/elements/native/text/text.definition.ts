import type { ElementDefinition } from "../../../designer/core/elements";
import { renderNativeText } from "./text.render";

export const textElementDefinition: ElementDefinition = {
  id: "text",
  type: "text",
  label: "Text",
  palette: { label: "Text", order: 50 },
  createInput: (pt) => ({ type: "text", x: pt.x, y: pt.y, text: "Text" }),
  render: renderNativeText,
};
