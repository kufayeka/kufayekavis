import type { ElementDefinition } from "../../designer/core/elements";

import { MOTION_PATH_LINE_KIND } from "./motionPathLine.model";
import { renderMotionPathLine } from "./motionPathLine.render";
import { motionPathLineActions } from "./motionPathLine.actions";

export const motionPathLineElementDefinition: ElementDefinition = {
  id: `custom:${MOTION_PATH_LINE_KIND}`,
  type: "custom",
  kind: MOTION_PATH_LINE_KIND,
  label: "Flow Particle Line",
  palette: { label: "Flow Particle Line", order: 72 },

  createInput: (pt) => ({
    type: "custom",
    kind: MOTION_PATH_LINE_KIND,
    x: pt.x,
    y: pt.y,
    width: 240,
    height: 80,

    enableOnMouseHoverEventListener: false,
    enableOnMouseClickEventListener: false,
    enableOnMouseLeaveEventListener: false,
    mqttTopic: "",

    // Base styling is still present, but this element uses its own props for line + particles.
    stroke: "var(--foreground)",
    strokeWidth: 2,
    fill: "transparent",
    opacity: 1,
    rotation: 0,
    zIndex: 0,

    props: {
      // Geometry in local coords
      x1: 0,
      y1: 0,
      x2: 220,
      y2: 60,

      lineColor: "var(--foreground)",
      lineOpacity: 0.8,
      lineThickness: 4,

      particleSize: 8,
      particleShape: "circle",
      particlePlacement: "along",
      particleColor: "var(--foreground)",
      particleOpacity: 0.9,
      particleGap: 20,
      particleDirection: "forward",
      particleSpeed: 5.0,

      animate: true,
    },
  }),

  render: renderMotionPathLine,
  actions: motionPathLineActions,
};
