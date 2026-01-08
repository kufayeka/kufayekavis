"use client";

import type React from "react";
import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { BottomBarItem } from "../../core/registry";
import { useDesignerHost } from "../hooks/useDesignerHost";

export function BottomBar({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const host = useDesignerHost();

  const items = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getBottomBarItems(),
    () => host.registry.getBottomBarItems(),
  ) as BottomBarItem[];

  const ctx = useMemo(() => ({ engine, state, api: host.api, host }), [engine, host, state]);

  const visible = useMemo(() => {
    return items
      .filter((it) => (it.when ? it.when(ctx) : true))
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  }, [ctx, items]);

  return (
    <div className="h-10 w-full border-t border-black/10 px-3 flex items-center gap-2">
      {visible.map((it) => (
        <span key={it.id}>{it.render(ctx) as React.ReactNode}</span>
      ))}
    </div>
  );
}
