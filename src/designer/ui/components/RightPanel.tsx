"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { PanelTabSlot, RightPanelSection, RightPanelTab } from "../../core/registry";
import { useDesignerHost } from "../hooks/useDesignerHost";

export type RightPanelCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  host: ReturnType<typeof useDesignerHost>;
};

export function RightPanel({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const host = useDesignerHost();

  const tabs = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getRightPanelTabs(),
    () => host.registry.getRightPanelTabs(),
  ) as RightPanelTab[];

  const sections = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getRightPanelSections(),
    () => host.registry.getRightPanelSections(),
  ) as RightPanelSection[];

  const ctx = useMemo(() => ({ engine, state, host }), [engine, host, state]);

  const resolvedTabs = useMemo(() => {
    const visibleTabs = tabs
      .filter((t) => (t.when ? t.when(ctx) : true))
      .slice()
      .sort((a, b) => (a.slot - b.slot) || (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));

    const bySlot = new Map<PanelTabSlot, RightPanelTab>();
    for (const t of visibleTabs) {
      if (bySlot.has(t.slot)) continue;
      bySlot.set(t.slot, t);
    }

    const legacy = sections
      .filter((s) => (s.when ? s.when(ctx) : true))
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));

    const slots: PanelTabSlot[] = [1, 2, 3, 4, 5];
    const emptySlots = slots.filter((slot) => !bySlot.has(slot));

    for (let i = 0; i < legacy.length && i < emptySlots.length; i++) {
      const s = legacy[i];
      const slot = emptySlots[i];
      bySlot.set(slot, {
        id: `legacy.right.${s.id}`,
        slot,
        label: s.title,
        order: s.order,
        when: s.when,
        render: (ctxUnknown: unknown) => {
          return (
            <Box sx={{ p: 1 }}>
              <Box sx={{ px: 1, pt: 0.5, pb: 1 }}>
                {s.description && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {s.description}
                  </Typography>
                )}
              </Box>
              {s.render(ctxUnknown) as React.ReactNode}
            </Box>
          );
        },
      });
    }

    return slots
      .map((slot) => bySlot.get(slot))
      .filter(Boolean) as RightPanelTab[];
  }, [ctx, sections, tabs]);

  const [preferredSlot, setPreferredSlot] = useState<PanelTabSlot | null>(null);

  const activeSlot: PanelTabSlot | null = useMemo(() => {
    if (resolvedTabs.length === 0) return null;
    if (preferredSlot != null && resolvedTabs.some((t) => t.slot === preferredSlot)) return preferredSlot;
    return resolvedTabs[0]?.slot ?? null;
  }, [preferredSlot, resolvedTabs]);

  const activeTab = useMemo(() => {
    if (activeSlot == null) return null;
    return resolvedTabs.find((t) => t.slot === activeSlot) ?? null;
  }, [activeSlot, resolvedTabs]);

  if (resolvedTabs.length === 0) return null;

  return (
    <div className="w-[22vw] h-full border-l border-black/10 overflow-hidden flex flex-col">
      <div className="border-b border-black/10">
        <Tabs
          value={activeSlot}
          onChange={(_, v) => setPreferredSlot(v as PanelTabSlot)}
          variant="fullWidth"
          sx={{ minHeight: 40 }}
        >
          {resolvedTabs.map((t) => (
            <Tab key={t.id} value={t.slot} label={t.label} sx={{ minHeight: 40 }} />
          ))}
        </Tabs>
      </div>
      <div className="flex-1 overflow-auto">{activeTab ? (activeTab.render(ctx) as React.ReactNode) : null}</div>
    </div>
  );
}
