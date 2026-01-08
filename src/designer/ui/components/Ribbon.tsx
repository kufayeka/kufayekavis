"use client";

import type React from "react";
import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { RibbonAction, TopRibbonItem } from "../../core/registry";
import { useDesignerHost } from "../hooks/useDesignerHost";

export function Ribbon({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const host = useDesignerHost();

  const topRibbonItems = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getTopRibbonItems(),
    () => host.registry.getTopRibbonItems(),
  ) as TopRibbonItem[];

  const legacyRibbonActions = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getRibbonActions(),
    () => host.registry.getRibbonActions(),
  ) as RibbonAction[];

  const ctx = useMemo(
    () => ({ engine, state, api: host.api, host }),
    [engine, host, state],
  );

  const visibleTopItems = useMemo(() => {
    return topRibbonItems.filter((it) => (it.when ? it.when(ctx) : true));
  }, [ctx, topRibbonItems]);

  const left = useMemo(() => {
    return visibleTopItems
      .filter((it) => (it.placement ?? "left") === "left")
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  }, [visibleTopItems]);

  const right = useMemo(() => {
    const base = visibleTopItems
      .filter((it) => (it.placement ?? "left") === "right")
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
    // Back-compat: old ribbon actions are appended to the right.
    const legacy = legacyRibbonActions
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))
      .map(
        (a): TopRibbonItem => ({
          kind: "button",
          id: a.id,
          label: a.label,
          onClick: a.onClick,
          disabled: a.disabled,
          placement: "right",
          order: a.order,
        }),
      );
    return [...base, ...legacy];
  }, [legacyRibbonActions, visibleTopItems]);

  const renderItem = (it: TopRibbonItem): React.ReactNode => {
    if (it.kind === "button") {
      return (
        <button
          key={it.id}
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={it.onClick}
          disabled={it.disabled}
          title={it.label}
        >
          {it.label}
        </button>
      );
    }
    return <span key={it.id}>{it.render(ctx) as React.ReactNode}</span>;
  };

  return (
    <div className="h-full w-full flex items-center justify-between px-3 gap-3">
      <div className="flex items-center gap-2">{left.map(renderItem)}</div>
      <div className="flex items-center gap-2">{right.map(renderItem)}</div>
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => engine.setZoom({ scale: state.zoom.scale / 1.1 })}
        >
          -
        </button>
        <div className="min-w-[80px] text-center tabular-nums">
          {Math.round(state.zoom.scale * 100)}%
        </div>
        <button
          className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
          onClick={() => engine.setZoom({ scale: state.zoom.scale * 1.1 })}
        >
          +
        </button>
      </div>
    </div>
  );
}
