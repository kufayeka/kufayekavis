import type { ElementDefinition } from "../../designer/core/elements";
import type { DesignerAPI } from "../../designer/core/api";
import type { DesignerEngine } from "../../designer/core/engine";
import type { DesignerDocument, CustomElement } from "../../designer/core/types";
import type { ElementRegistry } from "../../designer/core/elements";
import { exportNumericDisplaySvg, renderNumericDisplay } from "./numericDisplay.render";

export const NUMERIC_DISPLAY_KIND = "numericDisplay" as const;

type NumericDisplayActionCtx = {
    api: DesignerAPI;
    engine: DesignerEngine;
    elements: ElementRegistry;
    element: CustomElement;
    document: DesignerDocument;
};

export const numericDisplayElementDefinition: ElementDefinition = {
    id: `custom:${NUMERIC_DISPLAY_KIND}`,
    type: "custom",
    kind: NUMERIC_DISPLAY_KIND,
    label: "Numeric Display",
    palette: { label: "Numeric Display", order: 61 },
    createInput: (pt) => ({
        type: "custom",
        kind: NUMERIC_DISPLAY_KIND,
        x: pt.x,
        y: pt.y,
        width: 180,
        height: 120,
        enableOnMouseHoverEventListener: false,
        enableOnMouseClickEventListener: false,
        enableOnMouseLeaveEventListener: false,
        mqttTopic: "",
        props: {
            value: 0,
            label: "",
            backgroundColor: "var(--background)",
            valueColor: "var(--foreground)",
            labelColor: "var(--foreground)",
        },
    }),

    render: renderNumericDisplay,
    exportSvg: exportNumericDisplaySvg,

    actions: {
        setValueToDefault: (ctx: unknown) => {
            const { api, element } = ctx as NumericDisplayActionCtx;
            api.updateCustomProps(element.id, { value: 0 });
        },
        setBoxColor: (ctx: unknown, color?: unknown) => {
            const { api, element } = ctx as NumericDisplayActionCtx;
            if (typeof color !== "string" || !color.trim()) return;
            api.updateCustomProps(element.id, { backgroundColor: color });
        },
    },
};