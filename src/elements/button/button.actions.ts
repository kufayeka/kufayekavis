import type { ElementActionCtx } from "../../designer/core/api";
import type { CustomElement } from "../../designer/core/types";

export const BUTTON_ACTION_IDS = {
  setText: "setText",
  setBackgroundColor: "setBackgroundColor",
  setTextColor: "setTextColor",
  setOnClickAction: "setOnClickAction",
} as const;

export type ButtonActionId = (typeof BUTTON_ACTION_IDS)[keyof typeof BUTTON_ACTION_IDS];

export const buttonActions: Record<ButtonActionId, (ctx: unknown, ...args: unknown[]) => unknown> = {
  setText: (ctx: unknown, text?: unknown) => {
    const { api, element } = ctx as ElementActionCtx<CustomElement>;
    if (typeof text === "string") {
      api.updateCustomProps(element.id, { text });
    }
  },
  setBackgroundColor: (ctx: unknown, color?: unknown) => {
    const { api, element } = ctx as ElementActionCtx<CustomElement>;
    if (typeof color === "string" && color.trim()) {
      api.updateCustomProps(element.id, { backgroundColor: color });
    }
  },
  setTextColor: (ctx: unknown, color?: unknown) => {
    const { api, element } = ctx as ElementActionCtx<CustomElement>;
    if (typeof color === "string" && color.trim()) {
      api.updateCustomProps(element.id, { textColor: color });
    }
  },
  setOnClickAction: (ctx: unknown, action?: unknown) => {
    const { api, element } = ctx as ElementActionCtx<CustomElement>;
    if (typeof action === "string") {
      api.updateCustomProps(element.id, { onClickAction: action });
    }
  },
};