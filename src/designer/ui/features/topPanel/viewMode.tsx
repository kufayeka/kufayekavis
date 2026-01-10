"use client";

import { Button } from "@mui/material";
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
          <Button onClick={() => engine.setViewMode(!state.viewMode)}>
            {state.viewMode ? "Edit Mode" : "View Mode"}
          </Button>
        );
      },
    }),
  );

  return disposers;
}
