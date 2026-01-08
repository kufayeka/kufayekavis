"use client";

import type { DesignerEngine, DesignerState } from "../../../core/engine";
import type { DesignerHost } from "../../../core/host";

type RibbonCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  host: DesignerHost;
};

export function registerTopPanelViewModeToggle(opts: { host: DesignerHost }): Array<() => void> {
  const { host } = opts;
  const disposers: Array<() => void> = [];

  disposers.push(
    host.registry.registerTopRibbonItem({
      kind: "render",
      id: "builtin.mode.toggleView",
      placement: "right",
      order: 10,
      render: (ctxUnknown: unknown) => {
        const { engine, state } = ctxUnknown as RibbonCtx;
        return (
          <button
            className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
            onClick={() => engine.setViewMode(!state.viewMode)}
          >
            {state.viewMode ? "Edit Mode" : "View Mode"}
          </button>
        );
      },
    }),
  );

  return disposers;
}
