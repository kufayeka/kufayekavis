"use client";

import type { DesignerHost } from "../../../core/host";
import type { LeftPanelCtx } from "../../components/LeftPanel";
import { ElementsPanel } from "../../components/ElementsPanel";

export function registerLeftPanelElementsTab(opts: { host: DesignerHost }): Array<() => void> {
  const { host } = opts;
  const disposers: Array<() => void> = [];

  disposers.push(
    host.registry.registerLeftPanelTab({
      id: "builtin.left.elements",
      slot: 2,
      label: "Elements",
      order: 20,
      render: (ctxUnknown: unknown) => {
        const ctx = ctxUnknown as LeftPanelCtx;
        return <ElementsPanel engine={ctx.engine} state={ctx.state} />;
      },
    }),
  );

  return disposers;
}
