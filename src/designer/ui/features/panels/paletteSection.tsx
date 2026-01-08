"use client";

import type { ToolType } from "../../../core/types";
import type { DesignerHost } from "../../../core/host";
import type { LeftPanelCtx } from "../../components/LeftPanel";
import { PalettePanel } from "../../components/PalettePanel";

export function registerLeftPanelPaletteSection(opts: { host: DesignerHost }): Array<() => void> {
  const { host } = opts;
  const disposers: Array<() => void> = [];

  disposers.push(
    host.registry.registerLeftPanelSection({
      id: "builtin.left.palette",
      title: "Palette",
      description: "Tools and elements",
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
