"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import { Button, TextField } from "@mui/material";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { RibbonAction, TopRibbonItem } from "../../core/registry";
import { useDesignerHost } from "../hooks/useDesignerHost";

export function Ribbon({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const host = useDesignerHost();

  const derivedZoomPercent = Math.round(state.zoom.scale * 100);
  const [isZoomEditing, setIsZoomEditing] = useState(false);
  const [zoomPercentText, setZoomPercentText] = useState(() => String(derivedZoomPercent));

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
        <Button
          key={it.id}
          onClick={it.onClick}
          disabled={it.disabled}
          title={it.label}
        >
          {it.label}
        </Button>
      );
    }
    return <span key={it.id}>{it.render(ctx) as React.ReactNode}</span>;
  };

  return (
    <div className="h-full w-full px-3">
      <div className="h-full w-full overflow-x-auto overflow-y-hidden">
        <div className="h-full min-w-max flex flex-nowrap items-center gap-3 whitespace-nowrap">
          <div className="flex flex-nowrap items-center gap-2">{left.map(renderItem)}</div>
          <div className="flex flex-nowrap items-center gap-2">{right.map(renderItem)}</div>
          <div className="flex flex-nowrap items-center gap-2">
            <Button onClick={() => engine.setZoom({ scale: state.zoom.scale / 1.1 })}>
              -
            </Button>
            <TextField
              id="zoom-textfield"
              inputMode="numeric"
              type="number"
              value={isZoomEditing ? zoomPercentText : String(derivedZoomPercent)}
              onFocus={() => {
                setIsZoomEditing(true);
                setZoomPercentText(String(derivedZoomPercent));
              }}
              onBlur={() => {
                setIsZoomEditing(false);
                const n = Number(zoomPercentText);
                if (!Number.isFinite(n)) {
                  setZoomPercentText(String(derivedZoomPercent));
                  return;
                }
                const clamped = Math.max(10, Math.min(800, n));
                engine.setZoom({ scale: clamped / 100 });
                setZoomPercentText(String(Math.round(clamped)));
              }}
              onChange={(e) => setZoomPercentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setIsZoomEditing(false);
                  setZoomPercentText(String(derivedZoomPercent));
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }}
              aria-label="Zoom percent"
              title="Zoom (%)"
              sx={{ width: 90 }}
              slotProps={{
                htmlInput: {
                  min: 10,
                  max: 800,
                  step: 1,
                  style: { textAlign: "center", fontVariantNumeric: "tabular-nums" },
                },
              }}
            />
            <Button onClick={() => engine.setZoom({ scale: state.zoom.scale * 1.1 })}>
              +
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
