import type { ElementDefinition } from "../../designer/core/elements";
import type { DesignerAPI } from "../../designer/core/api";
import type { DesignerEngine } from "../../designer/core/engine";
import type { DesignerDocument, CustomElement } from "../../designer/core/types";
import type { ElementRegistry } from "../../designer/core/elements";
import { exportWebEmbedSvg, renderWebEmbed } from "./webEmbed.render";

export const WEB_EMBED_KIND = "webEmbed" as const;

type WebEmbedActionCtx = {
    api: DesignerAPI;
    engine: DesignerEngine;
    elements: ElementRegistry;
    element: CustomElement;
    document: DesignerDocument;
};

export const webEmbedElementDefinition: ElementDefinition = {
    id: `custom:${WEB_EMBED_KIND}`,
    type: "custom",
    kind: WEB_EMBED_KIND,
    label: "Web Embed",
    palette: { label: "Web Embed", order: 70 },
    createInput: (pt) => ({
        type: "custom",
        kind: WEB_EMBED_KIND,
        x: pt.x,
        y: pt.y,
        width: 400,
        height: 300,
        enableOnMouseHoverEventListener: false,
        enableOnMouseClickEventListener: false,
        enableOnMouseLeaveEventListener: false,
        mqttTopic: "",
        props: {
            url: "https://example.com",
            allowFullscreen: false,
            allowScripts: false,
            title: "Embedded Web Content",
        },
    }),

    render: renderWebEmbed,
    exportSvg: exportWebEmbedSvg,

    actions: {
        setUrl: (ctx: unknown, url?: unknown) => {
            const { api, element } = ctx as WebEmbedActionCtx;
            if (typeof url === "string" && url.trim()) {
                api.updateCustomProps(element.id, { url: url.trim() });
            }
        },
        reload: (ctx: unknown) => {
            const { api, element } = ctx as WebEmbedActionCtx;
            // Force reload by updating a timestamp prop
            const currentProps = element.props || {};
            api.updateCustomProps(element.id, {
                ...currentProps,
                reloadTrigger: Date.now()
            });
        },
    },
};