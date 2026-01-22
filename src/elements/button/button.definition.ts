import type { ElementDefinition } from "../../designer/core/elements";
import { renderButton, exportButtonSvg } from "./button.render";
import { buttonActions } from "./button.actions";

export const BUTTON_KIND = "button" as const;

export const buttonElementDefinition: ElementDefinition = {
    id: `custom:${BUTTON_KIND}`,
    type: "custom",
    kind: BUTTON_KIND,
    label: "Button",
    palette: { label: "Button", order: 62 },
    createInput: (pt) => ({
        type: "custom",
        kind: BUTTON_KIND,
        x: pt.x,
        y: pt.y,
        width: 120,
        height: 40,
        enableOnMouseHoverEventListener: false,
        enableOnMouseClickEventListener: true, // Enable click for button
        enableOnMouseLeaveEventListener: false,
        mqttTopic: "",
        props: {
            text: "Click Me",
            backgroundColor: "#007bff",
            textColor: "#ffffff",
            fontSize: 14,
            fontWeight: 400,
            bold: false,
            italic: false,
            underline: false,
            borderRadius: 4,
            onClickAction: "",

            // Confirmation dialog
            useConfirmationDialog: false,
            confirmationDialogText: "Are you sure?",
            okAlias: "OK",
            cancelAlias: "Cancel",
        },
    }),

    render: renderButton,
    exportSvg: exportButtonSvg, // For simplicity, same as render

    actions: buttonActions,
};