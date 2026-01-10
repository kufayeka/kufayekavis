import type { ElementDefinition } from "../../../designer/core/elements";
import { renderNativeFree } from "./free.render";

export const freeElementDefinition: ElementDefinition = {
  id: "free",
  type: "free",
  label: "Free Draw",
  render: renderNativeFree,
};
