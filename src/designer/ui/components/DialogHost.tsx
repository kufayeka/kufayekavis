"use client";

import type React from "react";
import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { DialogDefinition, OpenDialogState } from "../../core/registry";
import { useDesignerHost } from "../hooks/useDesignerHost";

export function DialogHost({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const host = useDesignerHost();

  const dialogs = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getDialogs(),
    () => host.registry.getDialogs(),
  ) as DialogDefinition[];

  const open = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getOpenDialog(),
    () => host.registry.getOpenDialog(),
  ) as OpenDialogState;

  const def = useMemo(() => (open ? dialogs.find((d) => d.id === open.id) ?? null : null), [dialogs, open]);
  const ctx = useMemo(
    () => ({ engine, state, api: host.api, host, dialog: open }),
    [engine, host, open, state],
  );

  if (!open || !def) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/20"
        onMouseDown={() => host.registry.closeDialog()}
      />
      <div className="relative w-[min(720px,95vw)] max-w-[720px] h-[min(80vh,640px)] max-h-[80vh] bg-white rounded border border-black/15 shadow-sm overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-black/10 flex items-center justify-between shrink-0">
          <div className="font-medium text-sm">{def.title}</div>
          <button
            className="px-2 py-1 rounded border border-black/15 hover:bg-black/5 text-sm"
            onClick={() => host.registry.closeDialog()}
          >
            Close
          </button>
        </div>
        <div className="p-3 flex-1 min-h-0 overflow-x-auto overflow-y-auto">{def.render(ctx) as React.ReactNode}</div>
      </div>
    </div>
  );
}
