import type { ElementActionCtx } from "../../designer/core/api";
import type { CustomElement } from "../../designer/core/types";

export const NUMERIC_DISPLAY_ACTION_IDS = {
  setValueToDefault: "setValueToDefault",
  setBoxColor: "setBoxColor",
} as const;

export type NumericDisplayActionId = (typeof NUMERIC_DISPLAY_ACTION_IDS)[keyof typeof NUMERIC_DISPLAY_ACTION_IDS];

export const numericDisplayActions: Record<NumericDisplayActionId, (ctx: unknown, ...args: unknown[]) => unknown> = {
  setValueToDefault: (ctx: unknown) => {
    const { api, element } = ctx as ElementActionCtx<CustomElement>;
    api.updateCustomProps(element.id, { value: 0 });
  },
  setBoxColor: (ctx: unknown, color?: unknown) => {
    const { api, element } = ctx as ElementActionCtx<CustomElement>;
    if (typeof color !== "string" || !color.trim()) return;
    api.updateCustomProps(element.id, { backgroundColor: color });
  },
};
