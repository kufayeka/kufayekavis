import type { DesignerPlugin } from "../core/plugins";
import type { DesignerAPI } from "../core/api";
import type { DesignerState } from "../core/engine";

// Example plugin using TSX (JSX in render callback).
export const myPlugin: DesignerPlugin = {
  id: "my.myPlugin",
  activate: ({ api, registry }) => {
    const disposers: Array<() => void> = [];

    disposers.push(
      registry.registerRibbonAction({
        id: "my.myPlugin.hello",
        label: "Hello",
        onClick: () => {
          api.createElement({ type: "text", x: 100, y: 100, text: "Hello" });
        },
      }),
    );

    disposers.push(
      registry.registerPropertiesSection({
        id: "my.myPlugin.section",
        render: (ctx: unknown) => {
          const { state } = ctx as { api: DesignerAPI; state: DesignerState };
          return (
            <div className="space-y-2">
              <div className="text-sm font-medium">My Plugin</div>
              <div className="text-xs text-black/60">selected: {state.selection.ids.length}</div>
              <button
                className="px-2 py-1 rounded border border-black/15 hover:bg-black/5"
                onClick={() => api.clearSelection()}
              >
                Clear Selection
              </button>
            </div>
          );
        },
      }),
    );

    return disposers;
  },
};
