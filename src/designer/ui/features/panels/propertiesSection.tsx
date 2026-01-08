"use client";

import type { DesignerHost } from "../../../core/host";
import type { RightPanelCtx } from "../../components/RightPanel";
import { PropertiesPanel } from "../../components/PropertiesPanel";

export function registerRightPanelPropertiesSection(opts: { host: DesignerHost }): Array<() => void> {
  const { host } = opts;
  const disposers: Array<() => void> = [];

  disposers.push(
    host.registry.registerRightPanelSection({
      id: "builtin.right.properties",
      title: "Properties",
      description: "Selection and plugin tools",
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
