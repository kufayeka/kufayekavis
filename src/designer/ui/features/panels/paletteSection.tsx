"use client";

import type { ToolType } from "../../../core/types";
import type { DesignerHost } from "../../../core/host";
import type { LeftPanelCtx } from "../../components/LeftPanel";
import { PalettePanel } from "../../components/PalettePanel";

export function registerLeftPanelPaletteSection(opts: { host: DesignerHost }): Array<() => void> {
  const { host } = opts;
  const disposers: Array<() => void> = [];

  disposers.push(
    host.registry.registerLeftPanelTab({
      id: "builtin.left.palette",
      slot: 1,
      label: "Palette",
      order: 10,
      render: (ctxUnknown: unknown) => {
        const ctx = ctxUnknown as LeftPanelCtx;
        return (
          <PalettePanel
            activeTool={ctx.state.tool}
            onToolChange={(t: ToolType) => ctx.setTool(t)}
          />
        );
      },
    }),
  );

  return disposers;
}
