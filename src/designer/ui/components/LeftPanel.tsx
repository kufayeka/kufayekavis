"use client";

import type React from "react";
import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { LeftPanelSection } from "../../core/registry";
import type { ToolType } from "../../core/types";
import { useDesignerHost } from "../hooks/useDesignerHost";

export type LeftPanelCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  host: ReturnType<typeof useDesignerHost>;
  setTool: (tool: ToolType) => void;
};

export function LeftPanel({ engine, state, setTool }: { engine: DesignerEngine; state: DesignerState; setTool: (tool: ToolType) => void }) {
  const host = useDesignerHost();

  const sections = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getLeftPanelSections(),
    () => host.registry.getLeftPanelSections(),
  ) as LeftPanelSection[];

  const ctx = useMemo(() => ({ engine, state, host, setTool }), [engine, host, setTool, state]);

  const visible = useMemo(() => {
    return sections
      .filter((s) => (s.when ? s.when(ctx) : true))
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  }, [ctx, sections]);

  return (
    <div className="w-[20vw] h-full border-r border-black/10 overflow-auto">
      <div className="p-3 space-y-4">
        {visible.map((s) => (
          <div key={s.id} className="rounded border border-black/10 overflow-hidden">
            <div className="px-3 py-2 border-b border-black/10 font-medium text-sm">{s.title}</div>
            <div className="p-3">{s.render(ctx) as React.ReactNode}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
