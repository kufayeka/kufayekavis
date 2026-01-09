import type { ElementDefinition } from "../../designer/core/elements";
import type { CustomElement } from "../../designer/core/types";
import { exportWebEmbedSvg, renderWebEmbed } from "./webEmbed.render";
import { webEmbedActions } from "./webEmbed.actions";

export const WEB_EMBED_KIND = "webEmbed" as const;

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

    actions: webEmbedActions,
};