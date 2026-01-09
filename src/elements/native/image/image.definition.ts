import type { ElementDefinition } from "../../../designer/core/elements";
import { renderNativeImage } from "./image.render";

export const imageElementDefinition: ElementDefinition = {
  id: "image",
  type: "image",
  label: "Image",
  palette: { label: "Image", order: 40 },
  createInput: (pt) => ({ type: "image", x: pt.x, y: pt.y, href: "" }),
  render: renderNativeImage,
};
