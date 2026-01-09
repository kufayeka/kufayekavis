import type { ElementDefinition } from "../../../designer/core/elements";
import { renderNativeLine } from "./line.render";

export const lineElementDefinition: ElementDefinition = {
  id: "line",
  type: "line",
  label: "Line",
  palette: { label: "Line", order: 30 },
  createInput: (pt) => ({ type: "line", x1: pt.x, y1: pt.y, x2: pt.x + 140, y2: pt.y + 60 }),
  render: renderNativeLine,
};
