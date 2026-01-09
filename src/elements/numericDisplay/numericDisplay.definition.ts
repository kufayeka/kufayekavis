import type { ElementDefinition } from "../../designer/core/elements";
import { exportNumericDisplaySvg, renderNumericDisplay } from "./numericDisplay.render";
import { numericDisplayActions } from "./numericDisplay.actions";

export const NUMERIC_DISPLAY_KIND = "numericDisplay" as const;

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

    actions: numericDisplayActions,
};