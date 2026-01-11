"use client";

import type { DesignerHost } from "../../../core/host";
import type { LeftPanelCtx } from "../../components/LeftPanel";
import { CanvasesPanel } from "../../components/CanvasesPanel";

export function registerLeftPanelCanvasesTab(opts: { host: DesignerHost }): Array<() => void> {
  const { host } = opts;
  const disposers: Array<() => void> = [];

  disposers.push(
    host.registry.registerLeftPanelTab({
      id: "builtin.left.canvases",
      slot: 3,
      label: "Canvases",
      order: 15,
      render: (ctxUnknown: unknown) => {
        const ctx = ctxUnknown as LeftPanelCtx;
        return <CanvasesPanel engine={ctx.engine} state={ctx.state} />;
      },
    }),
  );

  return disposers;
}
