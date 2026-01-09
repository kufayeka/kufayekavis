import type { ElementDefinition } from "../../../designer/core/elements";
import { renderNativeFree } from "./free.render";

export const freeElementDefinition: ElementDefinition = {
  id: "free",
  type: "free",
  label: "Free Draw",
  palette: { label: "Free Draw", order: 35 },
  createInput: (pt) => ({ type: "free", d: `M ${pt.x} ${pt.y} L ${pt.x + 80} ${pt.y + 40}` }),
  render: renderNativeFree,
};
