"use client";

import type React from "react";

import type { CustomElement } from "../../designer/core/types";
import type { PropertiesSectionRenderCtx } from "../../designer/ui/components/properties/types";
import { NUMERIC_DISPLAY_ACTION_IDS } from "./numericDisplay.actions";

export function renderNumericDisplayProperties(ctxUnknown: unknown): React.ReactNode {
  const { api, state } = ctxUnknown as PropertiesSectionRenderCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? api.getElement(selectedId) : null;
  const isNumeric = el && el.type === "custom" && el.kind === "numericDisplay";
  if (!isNumeric) return null;

  const c = el as CustomElement;
  const props = (c.props ?? {}) as Record<string, unknown>;
  const value = Number(props.value ?? 0);
  const label = String(props.label ?? "");

  return (
    <div className="rounded border border-black/10 p-2 space-y-2">
      <div className="text-sm font-medium">Numeric Display</div>
      <div className="text-xs text-black/60">value: {Number.isFinite(value) ? value : 0}</div>
      <div className="text-xs text-black/60">label: {label || "(empty)"}</div>

      <div className="flex items-center gap-2 flex-wrap">
        <button className="px-2 py-1 rounded border border-black/15 hover:bg-black/5" onClick={() => api.callElementAction(c.id, NUMERIC_DISPLAY_ACTION_IDS.setValueToDefault)}>
          Reset (action)
        </button>
        <button className="px-2 py-1 rounded border border-black/15 hover:bg-black/5" onClick={() => api.updateCustomProps(c.id, { label: "RPM" })}>
          Set label=RPM
        </button>
        <button className="px-2 py-1 rounded border border-black/15 hover:bg-black/5" onClick={() => api.callElementAction(c.id, NUMERIC_DISPLAY_ACTION_IDS.setBoxColor, "#111827")}>
          Box #111827
        </button>
        <button className="px-2 py-1 rounded border border-black/15 hover:bg-black/5" onClick={() => api.updateCustomProps(c.id, { valueColor: "#22c55e" })}>
          Value green
        </button>
      </div>
    </div>
  );
}
