"use client";

import type React from "react";
import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { OpenPopupState, PopupDefinition } from "../../core/registry";
import { useDesignerHost } from "../hooks/useDesignerHost";
import { Button } from "@mui/material";

export function PopupHost({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const host = useDesignerHost();

  const popups = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getPopups(),
    () => host.registry.getPopups(),
  ) as PopupDefinition[];

  const open = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getOpenPopup(),
    () => host.registry.getOpenPopup(),
  ) as OpenPopupState;

  const def = useMemo(() => (open ? popups.find((p) => p.id === open.id) ?? null : null), [open, popups]);
  const ctx = useMemo(() => ({ engine, state, api: host.api, host, popup: open }), [engine, host, open, state]);

  if (!open || !def) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      <div className="absolute top-4 right-4 w-[min(420px,90vw)] pointer-events-auto rounded border border-black/15 bg-white shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-black/10 flex items-center justify-between">
          <div className="font-medium text-sm">{def.title}</div>
          <Button onClick={() => host.registry.closePopup()}>Close</Button>
        </div>
        <div className="p-3">{def.render(ctx) as React.ReactNode}</div>
      </div>
    </div>
  );
}
