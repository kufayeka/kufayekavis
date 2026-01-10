"use client";

import type React from "react";
import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { RightPanelSection } from "../../core/registry";
import { useDesignerHost } from "../hooks/useDesignerHost";

export type RightPanelCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  host: ReturnType<typeof useDesignerHost>;
};

export function RightPanel({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const host = useDesignerHost();

  const sections = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getRightPanelSections(),
    () => host.registry.getRightPanelSections(),
  ) as RightPanelSection[];

  const ctx = useMemo(() => ({ engine, state, host }), [engine, host, state]);

  const visible = useMemo(() => {
    return sections
      .filter((s) => (s.when ? s.when(ctx) : true))
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  }, [ctx, sections]);

  if (visible.length === 0) return null;

  return (
    <div className="w-[22vw] h-full border-l border-black/10 overflow-auto">
      <div className="p-3 space-y-4 mb-4">
        {visible.map((s) => (
          <div key={s.id} className="rounded border border-black/10 overflow-hidden">
            <div className="px-3 py-2 border-b border-black/10">
              <div className="font-medium text-sm">{s.title}</div>
              {s.description && <div className="text-xs text-black/60 mt-0.5">{s.description}</div>}
            </div>
            <div className="p-1 mb-50">{s.render(ctx) as React.ReactNode}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
