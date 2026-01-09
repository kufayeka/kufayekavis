import type { ElementDefinition } from "../../../designer/core/elements";
import { renderNativeCircle } from "./circle.render";

export const circleElementDefinition: ElementDefinition = {
  id: "circle",
  type: "circle",
  label: "Circle",
  palette: { label: "Circle", order: 20 },
  createInput: (pt) => ({ type: "circle", x: pt.x, y: pt.y }),
  render: renderNativeCircle,
};
