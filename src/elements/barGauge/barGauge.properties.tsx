"use client";

import type React from "react";
import { useState } from "react";

import { Button, Checkbox, FormControlLabel, MenuItem, TextField } from "@mui/material";

import type { CustomElement } from "../../designer/core/types";
import type { PropertiesSectionRenderCtx } from "../../designer/ui/components/properties/types";
import { ColorInput } from "../../designer/ui/components/properties/controls";
import { coerceBarGaugeProps } from "./barGauge.model";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseZonesJson(text: string): { ok: true; value: unknown[] } | { ok: false; error: string } {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { ok: true, value: [] };
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return { ok: false, error: "Zones must be a JSON array" };
    return { ok: true, value: parsed as unknown[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function renderBarGaugeProperties(ctxUnknown: unknown): React.ReactNode {
  const ctx = ctxUnknown as PropertiesSectionRenderCtx;
  const selectedId = ctx.state.selection.ids.length === 1 ? ctx.state.selection.ids[0] : null;
  return <BarGaugeProperties key={selectedId ?? "none"} ctx={ctx} />;
}

function BarGaugeProperties({ ctx }: { ctx: PropertiesSectionRenderCtx }): React.ReactNode {
  const { api, state } = ctx;

  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? api.getElement(selectedId) : null;
  const isBarGauge = el && el.type === "custom" && el.kind === "barGauge";

  // Hooks must always run
  const c = (isBarGauge ? (el as CustomElement) : null) as CustomElement | null;
  const propsRaw = ((c?.props ?? {}) as Record<string, unknown>) ?? {};
  const p = coerceBarGaugeProps(propsRaw, c ?? undefined);

  const [zonesCode, setZonesCode] = useState<string>(p.zonesCode ?? "[]");
  const [zonesError, setZonesError] = useState<string | null>(null);

  if (!isBarGauge || !c) return null;

  const applyZones = () => {
    const parsed = parseZonesJson(zonesCode);
    if (!parsed.ok) {
      setZonesError(parsed.error);
      return;
    }
    setZonesError(null);
    api.updateCustomProps(c.id, {
      zonesCode,
      zones: parsed.value,
    });
  };

  return (
    <div className="rounded border border-black/10 p-2 space-y-3">
      <div className="text-sm font-medium">Bar Gauge</div>

      <div className="grid grid-cols-3 gap-2 items-center">
        <TextField label="value" type="number" value={p.value} onChange={(e) => api.updateCustomProps(c.id, { value: Number(e.target.value) })} size="small" />
        <TextField label="min" type="number" value={p.min} onChange={(e) => api.updateCustomProps(c.id, { min: Number(e.target.value) })} size="small" />
        <TextField label="max" type="number" value={p.max} onChange={(e) => api.updateCustomProps(c.id, { max: Number(e.target.value) })} size="small" />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <TextField select label="orientation" value={p.orientation} onChange={(e) => api.updateCustomProps(c.id, { orientation: e.target.value })} size="small">
          <MenuItem value="horizontal">horizontal</MenuItem>
          <MenuItem value="vertical">vertical</MenuItem>
        </TextField>
        <TextField select label="direction" value={p.direction} onChange={(e) => api.updateCustomProps(c.id, { direction: e.target.value })} size="small">
          <MenuItem value="forward">forward</MenuItem>
          <MenuItem value="reverse">reverse</MenuItem>
        </TextField>
        <TextField label="padding" type="number" value={p.padding} onChange={(e) => api.updateCustomProps(c.id, { padding: Math.max(0, Number(e.target.value)) })} size="small" />
        <TextField label="trackRadius" type="number" value={p.trackRadius} onChange={(e) => api.updateCustomProps(c.id, { trackRadius: Math.max(0, Number(e.target.value)) })} size="small" />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <ColorInput label="backgroundColor" id={`${c.id}-bar-bg`} value={p.backgroundColor} onChange={(v) => api.updateCustomProps(c.id, { backgroundColor: v })} />
        <ColorInput label="trackColor" id={`${c.id}-bar-track`} value={p.trackColor} onChange={(v) => api.updateCustomProps(c.id, { trackColor: v })} />
        <ColorInput label="fillColor" id={`${c.id}-bar-fill`} value={p.fillColor} onChange={(v) => api.updateCustomProps(c.id, { fillColor: v })} />
        <TextField label="trackStrokeWidth" type="number" value={p.trackStrokeWidth} onChange={(e) => api.updateCustomProps(c.id, { trackStrokeWidth: Math.max(0, Number(e.target.value)) })} size="small" />
        <ColorInput label="trackStrokeColor" id={`${c.id}-bar-trackStroke`} value={p.trackStrokeColor} onChange={(v) => api.updateCustomProps(c.id, { trackStrokeColor: v })} />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium">zones (JSON array)</div>
        <TextField
          fullWidth
          multiline
          minRows={6}
          size="small"
          value={zonesCode}
          onChange={(e) => setZonesCode(e.target.value)}
          error={Boolean(zonesError)}
          helperText={zonesError ?? "Example: [{\"from\":0,\"to\":60,\"color\":\"#00ff00\"}, ...]"}
        />
        <div className="flex items-end gap-2 flex-wrap">
          <Button size="small" variant="outlined" onClick={applyZones}>
            Apply zones
          </Button>
          <TextField
            label="zonesOpacity"
            type="number"
            size="small"
            value={p.zonesOpacity}
            onChange={(e) => api.updateCustomProps(c.id, { zonesOpacity: clamp(Number(e.target.value), 0, 1) })}
          />
          <TextField
            label="zoneThickness"
            type="number"
            size="small"
            value={p.zoneThickness}
            onChange={(e) => api.updateCustomProps(c.id, { zoneThickness: Math.max(1, Number(e.target.value)) })}
          />
          <TextField select label="zonePosition" value={p.zonePosition} onChange={(e) => api.updateCustomProps(c.id, { zonePosition: e.target.value })} size="small">
            <MenuItem value="auto">auto</MenuItem>
            <MenuItem value="start">start</MenuItem>
            <MenuItem value="end">end</MenuItem>
            <MenuItem value="center">center</MenuItem>
          </TextField>
          <TextField label="zoneOffsetX" type="number" value={p.zoneOffsetX} onChange={(e) => api.updateCustomProps(c.id, { zoneOffsetX: clamp(Number(e.target.value), -200, 200) })} size="small" />
          <TextField label="zoneOffsetY" type="number" value={p.zoneOffsetY} onChange={(e) => api.updateCustomProps(c.id, { zoneOffsetY: clamp(Number(e.target.value), -200, 200) })} size="small" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 items-center">
        <TextField label="borderRadius" type="number" value={p.borderRadius} onChange={(e) => api.updateCustomProps(c.id, { borderRadius: clamp(Number(e.target.value), 0, 200) })} size="small" />
        <TextField label="fillBorderRadius" type="number" value={p.fillBorderRadius} onChange={(e) => api.updateCustomProps(c.id, { fillBorderRadius: clamp(Number(e.target.value), 0, 200) })} size="small" />
        <TextField label="zoneBorderRadius" type="number" value={p.zoneBorderRadius} onChange={(e) => api.updateCustomProps(c.id, { zoneBorderRadius: clamp(Number(e.target.value), 0, 200) })} size="small" />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <FormControlLabel control={<Checkbox checked={p.showTicks} onChange={(e) => api.updateCustomProps(c.id, { showTicks: e.target.checked })} />} label="showTicks" />
        <TextField
          label="numTicks"
          type="number"
          value={p.numTicks}
          onChange={(e) => api.updateCustomProps(c.id, { numTicks: clamp(Math.floor(Number(e.target.value)), 2, 50) })}
          size="small"
        />
        <ColorInput label="tickColor" id={`${c.id}-bar-tickColor`} value={p.tickColor} onChange={(v) => api.updateCustomProps(c.id, { tickColor: v })} />
        <TextField label="tickLength" type="number" value={p.tickLength} onChange={(e) => api.updateCustomProps(c.id, { tickLength: Math.max(0, Number(e.target.value)) })} size="small" />
        <TextField label="tickWidth" type="number" value={p.tickWidth} onChange={(e) => api.updateCustomProps(c.id, { tickWidth: Math.max(0.5, Number(e.target.value)) })} size="small" />
        <TextField select label="tickPosition" value={p.tickPosition} onChange={(e) => api.updateCustomProps(c.id, { tickPosition: e.target.value })} size="small">
          <MenuItem value="auto">auto</MenuItem>
          <MenuItem value="start">start</MenuItem>
          <MenuItem value="end">end</MenuItem>
          <MenuItem value="outside">outside</MenuItem>
        </TextField>
        <TextField label="tickOffsetX" type="number" value={p.tickOffsetX} onChange={(e) => api.updateCustomProps(c.id, { tickOffsetX: clamp(Number(e.target.value), -200, 200) })} size="small" />
        <TextField label="tickOffsetY" type="number" value={p.tickOffsetY} onChange={(e) => api.updateCustomProps(c.id, { tickOffsetY: clamp(Number(e.target.value), -200, 200) })} size="small" />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <FormControlLabel
          control={<Checkbox checked={p.showMinorTicks} onChange={(e) => api.updateCustomProps(c.id, { showMinorTicks: e.target.checked })} />}
          label="showMinorTicks"
        />
        <TextField
          label="minorTicksPerInterval"
          type="number"
          value={p.minorTicksPerInterval}
          onChange={(e) => api.updateCustomProps(c.id, { minorTicksPerInterval: clamp(Math.floor(Number(e.target.value)), 1, 20) })}
          size="small"
        />
        <ColorInput label="minorTickColor" id={`${c.id}-bar-minorTickColor`} value={p.minorTickColor} onChange={(v) => api.updateCustomProps(c.id, { minorTickColor: v })} />
        <TextField label="minorTickLength" type="number" value={p.minorTickLength} onChange={(e) => api.updateCustomProps(c.id, { minorTickLength: Math.max(0, Number(e.target.value)) })} size="small" />
        <TextField label="minorTickWidth" type="number" value={p.minorTickWidth} onChange={(e) => api.updateCustomProps(c.id, { minorTickWidth: Math.max(0.25, Number(e.target.value)) })} size="small" />
        <TextField select label="minorTickPosition" value={p.minorTickPosition} onChange={(e) => api.updateCustomProps(c.id, { minorTickPosition: e.target.value })} size="small">
          <MenuItem value="auto">auto</MenuItem>
          <MenuItem value="start">start</MenuItem>
          <MenuItem value="end">end</MenuItem>
          <MenuItem value="outside">outside</MenuItem>
        </TextField>
        <TextField label="minorTickOffsetX" type="number" value={p.minorTickOffsetX} onChange={(e) => api.updateCustomProps(c.id, { minorTickOffsetX: clamp(Number(e.target.value), -200, 200) })} size="small" />
        <TextField label="minorTickOffsetY" type="number" value={p.minorTickOffsetY} onChange={(e) => api.updateCustomProps(c.id, { minorTickOffsetY: clamp(Number(e.target.value), -200, 200) })} size="small" />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <FormControlLabel control={<Checkbox checked={p.showLabels} onChange={(e) => api.updateCustomProps(c.id, { showLabels: e.target.checked })} />} label="showLabels" />
        <ColorInput label="labelColor" id={`${c.id}-bar-labelColor`} value={p.labelColor} onChange={(v) => api.updateCustomProps(c.id, { labelColor: v })} />
        <TextField label="labelFontSize" type="number" value={p.labelFontSize} onChange={(e) => api.updateCustomProps(c.id, { labelFontSize: Math.max(6, Number(e.target.value)) })} size="small" />
        <TextField label="labelOffset" type="number" value={p.labelOffset} onChange={(e) => api.updateCustomProps(c.id, { labelOffset: Math.max(0, Number(e.target.value)) })} size="small" />
        <TextField label="labelOffsetX" type="number" value={p.labelOffsetX} onChange={(e) => api.updateCustomProps(c.id, { labelOffsetX: clamp(Number(e.target.value), -200, 200) })} size="small" />
        <TextField label="labelOffsetY" type="number" value={p.labelOffsetY} onChange={(e) => api.updateCustomProps(c.id, { labelOffsetY: clamp(Number(e.target.value), -200, 200) })} size="small" />
        <TextField label="labelDecimals" type="number" value={p.labelDecimals} onChange={(e) => api.updateCustomProps(c.id, { labelDecimals: clamp(Math.floor(Number(e.target.value)), 0, 10) })} size="small" />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <FormControlLabel control={<Checkbox checked={p.showValueText} onChange={(e) => api.updateCustomProps(c.id, { showValueText: e.target.checked })} />} label="showValueText" />
        <TextField select label="valuePosition" value={p.valuePosition} onChange={(e) => api.updateCustomProps(c.id, { valuePosition: e.target.value })} size="small">
          <MenuItem value="top-outside">top outside</MenuItem>
          <MenuItem value="below-outside">below outside</MenuItem>
          <MenuItem value="inside-center">inside center</MenuItem>
          <MenuItem value="inside-top">inside top</MenuItem>
          <MenuItem value="inside-bottom">inside bottom</MenuItem>
        </TextField>
        <ColorInput label="valueColor" id={`${c.id}-bar-valueColor`} value={p.valueColor} onChange={(v) => api.updateCustomProps(c.id, { valueColor: v })} />
        <TextField label="valueFontSize" type="number" value={p.valueFontSize} onChange={(e) => api.updateCustomProps(c.id, { valueFontSize: Math.max(6, Number(e.target.value)) })} size="small" />
        <TextField label="valueFontWeight" type="number" value={p.valueFontWeight} onChange={(e) => api.updateCustomProps(c.id, { valueFontWeight: clamp(Math.floor(Number(e.target.value)), 100, 900) })} size="small" />
        <TextField label="valueOffsetX" type="number" value={p.valueOffsetX} onChange={(e) => api.updateCustomProps(c.id, { valueOffsetX: clamp(Number(e.target.value), -200, 200) })} size="small" />
        <TextField label="valueOffsetY" type="number" value={p.valueOffsetY} onChange={(e) => api.updateCustomProps(c.id, { valueOffsetY: clamp(Number(e.target.value), -200, 200) })} size="small" />
        <TextField label="valueDecimals" type="number" value={p.valueDecimals} onChange={(e) => api.updateCustomProps(c.id, { valueDecimals: clamp(Math.floor(Number(e.target.value)), 0, 10) })} size="small" />
        <TextField label="valuePrefix" value={p.valuePrefix} onChange={(e) => api.updateCustomProps(c.id, { valuePrefix: e.target.value })} size="small" />
        <TextField label="valueSuffix" value={p.valueSuffix} onChange={(e) => api.updateCustomProps(c.id, { valueSuffix: e.target.value })} size="small" />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <FormControlLabel control={<Checkbox checked={p.animate} onChange={(e) => api.updateCustomProps(c.id, { animate: e.target.checked })} />} label="animate" />
        <FormControlLabel control={<Checkbox checked={p.animateFill} onChange={(e) => api.updateCustomProps(c.id, { animateFill: e.target.checked })} />} label="animateFill" />
        <FormControlLabel control={<Checkbox checked={p.animateValueText} onChange={(e) => api.updateCustomProps(c.id, { animateValueText: e.target.checked })} />} label="animateValueText" />
        <TextField label="animationDuration" type="number" value={p.animationDuration} onChange={(e) => api.updateCustomProps(c.id, { animationDuration: Math.max(0, Number(e.target.value)) })} size="small" />
        <TextField label="animationEase" value={p.animationEase} onChange={(e) => api.updateCustomProps(c.id, { animationEase: e.target.value })} size="small" />
      </div>
    </div>
  );
}
