import type { ElementActionCtx } from "../../designer/core/api";
import type { CustomElement } from "../../designer/core/types";

export const WEB_EMBED_ACTION_IDS = {
  setUrl: "setUrl",
  reload: "reload",
} as const;

export type WebEmbedActionId = (typeof WEB_EMBED_ACTION_IDS)[keyof typeof WEB_EMBED_ACTION_IDS];

export const webEmbedActions: Record<WebEmbedActionId, (ctx: unknown, ...args: unknown[]) => unknown> = {
  setUrl: (ctx: unknown, url?: unknown) => {
    const { api, element } = ctx as ElementActionCtx<CustomElement>;
    if (typeof url === "string" && url.trim()) {
      api.updateCustomProps(element.id, { url: url.trim() });
    }
  },
  reload: (ctx: unknown) => {
    const { api, element } = ctx as ElementActionCtx<CustomElement>;
    const currentProps = element.props || {};
    api.updateCustomProps(element.id, {
      ...currentProps,
      reloadTrigger: Date.now(),
    });
  },
};
