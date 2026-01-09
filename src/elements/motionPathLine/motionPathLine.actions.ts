import type { ElementActionCtx } from "../../designer/core/api";
import type { CustomElement } from "../../designer/core/types";

export const MOTION_PATH_LINE_ACTION_IDS = {
  setAnimate: "setAnimate",
  toggleAnimate: "toggleAnimate",
} as const;

export type MotionPathLineActionId = (typeof MOTION_PATH_LINE_ACTION_IDS)[keyof typeof MOTION_PATH_LINE_ACTION_IDS];

export const motionPathLineActions: Record<MotionPathLineActionId, (ctx: unknown, ...args: unknown[]) => unknown> = {
  setAnimate: (ctx: unknown, value?: unknown) => {
    const { api, element } = ctx as ElementActionCtx<CustomElement>;
    api.updateCustomProps(element.id, { animate: Boolean(value) });
  },
  toggleAnimate: (ctx: unknown) => {
    const { api, element } = ctx as ElementActionCtx<CustomElement>;
    const props = (element.props || {}) as Record<string, unknown>;
    api.updateCustomProps(element.id, { animate: !Boolean(props.animate) });
  },
};
