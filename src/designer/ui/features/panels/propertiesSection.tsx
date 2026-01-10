"use client";

import type { DesignerHost } from "../../../core/host";
import type { RightPanelCtx } from "../../components/RightPanel";
import { PropertiesPanel } from "../../components/PropertiesPanel";

export function registerRightPanelPropertiesSection(opts: { host: DesignerHost }): Array<() => void> {
  const { host } = opts;
  const disposers: Array<() => void> = [];

  disposers.push(
    host.registry.registerRightPanelTab({
      id: "builtin.right.properties",
      slot: 1,
      label: "Properties",
      order: 10,
      when: (ctxUnknown: unknown) => {
        const ctx = ctxUnknown as RightPanelCtx;
        return !ctx.state.viewMode;
      },
      render: (ctxUnknown: unknown) => {
        const ctx = ctxUnknown as RightPanelCtx;
        return <PropertiesPanel engine={ctx.engine} state={ctx.state} />;
      },
    }),
  );

  return disposers;
}
