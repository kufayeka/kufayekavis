"use client";

import type React from "react";
import { useState } from "react";

import { Button, Checkbox, FormControlLabel, MenuItem, TextField } from "@mui/material";

import type { CustomElement } from "../../designer/core/types";
import type { PropertiesSectionRenderCtx } from "../../designer/ui/components/properties/types";
import { ColorInput } from "../../designer/ui/components/properties/controls";
import { coerceGaugeProps } from "./gauge.model";

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

export function renderGaugeProperties(ctxUnknown: unknown): React.ReactNode {
  const ctx = ctxUnknown as PropertiesSectionRenderCtx;

  const selectedId = ctx.state.selection.ids.length === 1 ? ctx.state.selection.ids[0] : null;
  // Key forces remount when the selection changes, so draft state re-initializes from props.
  return <GaugeProperties key={selectedId ?? "none"} ctx={ctx} />;
}

function GaugeProperties({ ctx }: { ctx: PropertiesSectionRenderCtx }): React.ReactNode {
  const { api, state } = ctx;

  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? api.getElement(selectedId) : null;
  const isGauge = el && el.type === "custom" && el.kind === "gauge";

  // Hooks must always run
  const c = (isGauge ? (el as CustomElement) : null) as CustomElement | null;
  const propsRaw = ((c?.props ?? {}) as Record<string, unknown>) ?? {};
  const p = coerceGaugeProps(propsRaw, c ?? undefined);

  const [zonesCode, setZonesCode] = useState<string>(p.zonesCode ?? "[]");
  const [zonesError, setZonesError] = useState<string | null>(null);

  if (!isGauge || !c) return null;

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
      <div className="text-sm font-medium">Gauge</div>

      <div className="grid grid-cols-3 gap-2 items-center">
        <TextField
          label="value"
          type="number"
          value={p.value}
          onChange={(e) => api.updateCustomProps(c.id, { value: Number(e.target.value) })}
          size="small"
        />
        <TextField
          label="min"
          type="number"
          value={p.min}
          onChange={(e) => api.updateCustomProps(c.id, { min: Number(e.target.value) })}
          size="small"
        />
        <TextField
          label="max"
          type="number"
          value={p.max}
          onChange={(e) => api.updateCustomProps(c.id, { max: Number(e.target.value) })}
          size="small"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <TextField label="startAngle" type="number" value={p.startAngle} onChange={(e) => api.updateCustomProps(c.id, { startAngle: Number(e.target.value) })} size="small" />
        <TextField label="endAngle" type="number" value={p.endAngle} onChange={(e) => api.updateCustomProps(c.id, { endAngle: Number(e.target.value) })} size="small" />
        <TextField
          label="numTicks"
          type="number"
          value={p.numTicks}
          onChange={(e) => api.updateCustomProps(c.id, { numTicks: clamp(Math.floor(Number(e.target.value)), 2, 50) })}
          size="small"
        />
        <TextField label="diameter" type="number" value={p.diameter} onChange={(e) => api.updateCustomProps(c.id, { diameter: Math.max(20, Number(e.target.value)) })} size="small" />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <TextField
          select
          label="fitMode"
          value={p.fitMode}
          onChange={(e) => api.updateCustomProps(c.id, { fitMode: e.target.value })}
          size="small"
        >
          <MenuItem value="contain">contain</MenuItem>
          <MenuItem value="stretch">stretch</MenuItem>
        </TextField>
        <TextField
          label="padding"
          type="number"
          value={p.padding}
          onChange={(e) => api.updateCustomProps(c.id, { padding: Math.max(0, Number(e.target.value)) })}
          size="small"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <ColorInput label="backgroundColor" id={`${c.id}-backgroundColor`} value={p.backgroundColor} onChange={(v) => api.updateCustomProps(c.id, { backgroundColor: v })} />
        <ColorInput label="trackColor" id={`${c.id}-trackColor`} value={p.trackColor} onChange={(v) => api.updateCustomProps(c.id, { trackColor: v })} />
        <ColorInput label="fillColor" id={`${c.id}-fillColor`} value={p.fillColor} onChange={(v) => api.updateCustomProps(c.id, { fillColor: v })} />
        <TextField label="arcWidth" type="number" value={p.arcWidth} onChange={(e) => api.updateCustomProps(c.id, { arcWidth: Math.max(1, Number(e.target.value)) })} size="small" />
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
          onBlur={applyZones}
          error={Boolean(zonesError)}
          helperText={zonesError ?? "Example: [{\"from\":0,\"to\":60,\"color\":\"#00ff00\"}, ...]"}
        />
        <div className="flex items-center gap-2">
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
            label="zoneArcWidth"
            type="number"
            size="small"
            value={p.zoneArcWidth}
            onChange={(e) => api.updateCustomProps(c.id, { zoneArcWidth: Math.max(1, Number(e.target.value)) })}
          />
          <TextField
            label="zoneArcGap"
            type="number"
            size="small"
            value={p.zoneArcGap}
            onChange={(e) => api.updateCustomProps(c.id, { zoneArcGap: Math.max(0, Number(e.target.value)) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <FormControlLabel control={<Checkbox checked={p.showTicks} onChange={(e) => api.updateCustomProps(c.id, { showTicks: e.target.checked })} />} label="showTicks" />
        <FormControlLabel control={<Checkbox checked={p.showLabels} onChange={(e) => api.updateCustomProps(c.id, { showLabels: e.target.checked })} />} label="showLabels" />
        <ColorInput label="tickColor" id={`${c.id}-tickColor`} value={p.tickColor} onChange={(v) => api.updateCustomProps(c.id, { tickColor: v })} />
        <TextField label="tickLength" type="number" value={p.tickLength} onChange={(e) => api.updateCustomProps(c.id, { tickLength: Math.max(0, Number(e.target.value)) })} size="small" />
        <TextField label="tickWidth" type="number" value={p.tickWidth} onChange={(e) => api.updateCustomProps(c.id, { tickWidth: Math.max(0.5, Number(e.target.value)) })} size="small" />
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
        <ColorInput label="minorTickColor" id={`${c.id}-minorTickColor`} value={p.minorTickColor} onChange={(v) => api.updateCustomProps(c.id, { minorTickColor: v })} />
        <TextField
          label="minorTickLength"
          type="number"
          value={p.minorTickLength}
          onChange={(e) => api.updateCustomProps(c.id, { minorTickLength: Math.max(0, Number(e.target.value)) })}
          size="small"
        />
        <TextField
          label="minorTickWidth"
          type="number"
          value={p.minorTickWidth}
          onChange={(e) => api.updateCustomProps(c.id, { minorTickWidth: Math.max(0.25, Number(e.target.value)) })}
          size="small"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <ColorInput label="labelColor" id={`${c.id}-labelColor`} value={p.labelColor} onChange={(v) => api.updateCustomProps(c.id, { labelColor: v })} />
        <TextField label="labelFontSize" type="number" value={p.labelFontSize} onChange={(e) => api.updateCustomProps(c.id, { labelFontSize: Math.max(6, Number(e.target.value)) })} size="small" />
        <TextField label="labelOffset" type="number" value={p.labelOffset} onChange={(e) => api.updateCustomProps(c.id, { labelOffset: Math.max(0, Number(e.target.value)) })} size="small" />
        <TextField label="labelDecimals" type="number" value={p.labelDecimals} onChange={(e) => api.updateCustomProps(c.id, { labelDecimals: clamp(Math.floor(Number(e.target.value)), 0, 10) })} size="small" />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <FormControlLabel control={<Checkbox checked={p.showNeedle} onChange={(e) => api.updateCustomProps(c.id, { showNeedle: e.target.checked })} />} label="showNeedle" />
        <TextField
          select
          label="needleType"
          value={p.needleType}
          onChange={(e) => api.updateCustomProps(c.id, { needleType: e.target.value })}
          size="small"
        >
          <MenuItem value="simple">simple</MenuItem>
          <MenuItem value="arrow">arrow</MenuItem>
          <MenuItem value="circle">circle</MenuItem>
        </TextField>
        <ColorInput label="needleColor" id={`${c.id}-needleColor`} value={p.needleColor} onChange={(v) => api.updateCustomProps(c.id, { needleColor: v })} />
        <TextField
          label="needleLengthRatio"
          type="number"
          value={p.needleLengthRatio}
          onChange={(e) => api.updateCustomProps(c.id, { needleLengthRatio: clamp(Number(e.target.value), 0, 1) })}
          size="small"
        />
        <TextField
          label="needleWidth"
          type="number"
          value={p.needleWidth}
          onChange={(e) => api.updateCustomProps(c.id, { needleWidth: Math.max(0.5, Number(e.target.value)) })}
          size="small"
        />
        <TextField label="needleBaseRadius" type="number" value={p.needleBaseRadius} onChange={(e) => api.updateCustomProps(c.id, { needleBaseRadius: Math.max(0, Number(e.target.value)) })} size="small" />
        <TextField label="needleTipRadius" type="number" value={p.needleTipRadius} onChange={(e) => api.updateCustomProps(c.id, { needleTipRadius: Math.max(0, Number(e.target.value)) })} size="small" />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <FormControlLabel control={<Checkbox checked={p.showValueText} onChange={(e) => api.updateCustomProps(c.id, { showValueText: e.target.checked })} />} label="showValueText" />
        <TextField
          select
          label="valuePosition"
          value={p.valuePosition}
          onChange={(e) => api.updateCustomProps(c.id, { valuePosition: e.target.value })}
          size="small"
        >
          <MenuItem value="center">center</MenuItem>
          <MenuItem value="bottom">bottom</MenuItem>
        </TextField>
        <ColorInput label="valueColor" id={`${c.id}-valueColor`} value={p.valueColor} onChange={(v) => api.updateCustomProps(c.id, { valueColor: v })} />
        <TextField label="valueFontSize" type="number" value={p.valueFontSize} onChange={(e) => api.updateCustomProps(c.id, { valueFontSize: Math.max(6, Number(e.target.value)) })} size="small" />
        <TextField label="valueFontWeight" type="number" value={p.valueFontWeight} onChange={(e) => api.updateCustomProps(c.id, { valueFontWeight: clamp(Math.floor(Number(e.target.value)), 100, 900) })} size="small" />
        <TextField label="valueDecimals" type="number" value={p.valueDecimals} onChange={(e) => api.updateCustomProps(c.id, { valueDecimals: clamp(Math.floor(Number(e.target.value)), 0, 10) })} size="small" />
        <TextField label="valuePrefix" value={p.valuePrefix} onChange={(e) => api.updateCustomProps(c.id, { valuePrefix: e.target.value })} size="small" />
        <TextField label="valueSuffix" value={p.valueSuffix} onChange={(e) => api.updateCustomProps(c.id, { valueSuffix: e.target.value })} size="small" />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <FormControlLabel control={<Checkbox checked={p.animate} onChange={(e) => api.updateCustomProps(c.id, { animate: e.target.checked })} />} label="animate" />
        <FormControlLabel control={<Checkbox checked={p.animateArc} onChange={(e) => api.updateCustomProps(c.id, { animateArc: e.target.checked })} />} label="animateArc" />
        <FormControlLabel control={<Checkbox checked={p.animateNeedle} onChange={(e) => api.updateCustomProps(c.id, { animateNeedle: e.target.checked })} />} label="animateNeedle" />
        <FormControlLabel control={<Checkbox checked={p.animateValueText} onChange={(e) => api.updateCustomProps(c.id, { animateValueText: e.target.checked })} />} label="animateValueText" />
        <TextField
          label="animationDuration"
          type="number"
          value={p.animationDuration}
          onChange={(e) => api.updateCustomProps(c.id, { animationDuration: Math.max(0, Number(e.target.value)) })}
          size="small"
        />
        <TextField
          label="animationEase"
          value={p.animationEase}
          onChange={(e) => api.updateCustomProps(c.id, { animationEase: e.target.value })}
          size="small"
        />
      </div>
    </div>
  );
}
