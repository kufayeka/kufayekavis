import type { ElementDefinition } from "../../../designer/core/elements";
import { renderNativeRect } from "./rect.render";

export const rectElementDefinition: ElementDefinition = {
  id: "rect",
  type: "rect",
  label: "Rect",
  palette: { label: "Rect", order: 10 },
  createInput: (pt) => ({ type: "rect", x: pt.x, y: pt.y }),
  render: renderNativeRect,
};
