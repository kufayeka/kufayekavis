import type { DesignerPlugin } from "../core/plugins";
import type { DesignerAPI } from "../core/api";
import type { DesignerState } from "../core/engine";
import React from "react";

// Example plugin: adds a small section in the Properties > Plugins area.
// This file is intentionally NOT auto-registered; see plugins README for wiring.
export const testPropertiesPanelPlugin: DesignerPlugin = {
  id: "example.test-properties-panel",
  activate: ({ api, registry }) => {
    const disposeSection = registry.registerPropertiesSection({
      id: "example.test-properties-panel.section",
      render: (ctx: unknown) => {
        const { state } = ctx as { api: DesignerAPI; state: DesignerState };
        const selectedCount = state.selection.ids.length;

        return React.createElement(
          "div",
          { className: "space-y-2" },
          React.createElement("div", { className: "text-sm font-medium" }, "Example Plugin"),
          React.createElement("div", { className: "text-xs text-black/60" }, `selected: ${selectedCount}`),
          React.createElement(
            "button",
            {
              className: "px-3 py-1 rounded border border-black/15 hover:bg-black/5",
              onClick: () => api.clearSelection(),
            },
            "Clear Selection",
          ),
        );
      },
    });

    return [disposeSection];
  },
};