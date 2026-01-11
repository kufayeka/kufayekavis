"use client";

import type React from "react";
import { useState } from "react";

import { Button, Checkbox, MenuItem, TextField } from "@mui/material";

import type { CustomElement } from "../../designer/core/types";
import type { PropertiesSectionRenderCtx } from "../../designer/ui/components/properties/types";
import { ColorInput, numberInput, Row } from "../../designer/ui/components/properties/controls";
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

  const divider = <div className="border-t border-black/10" />;

  return (
    <div className="rounded border border-black/10 p-2 flex flex-col gap-3">
      <div className="text-sm font-medium">Gauge</div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 items-center">
        <Row
          id={`${c.id}-value`}
          label="value"
          control={numberInput(`${c.id}-value`, p.value, (v) => api.updateCustomProps(c.id, { value: v }))}
        />
        <Row
          id={`${c.id}-min`}
          label="min"
          control={numberInput(`${c.id}-min`, p.min, (v) => api.updateCustomProps(c.id, { min: v }))}
        />
        <Row
          id={`${c.id}-max`}
          label="max"
          control={numberInput(`${c.id}-max`, p.max, (v) => api.updateCustomProps(c.id, { max: v }))}
        />
        </div>
      </div>

      {divider}

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 items-center">
        <Row
          id={`${c.id}-startAngle`}
          label="startAngle"
          control={numberInput(`${c.id}-startAngle`, p.startAngle, (v) => api.updateCustomProps(c.id, { startAngle: v }))}
        />
        <Row
          id={`${c.id}-endAngle`}
          label="endAngle"
          control={numberInput(`${c.id}-endAngle`, p.endAngle, (v) => api.updateCustomProps(c.id, { endAngle: v }))}
        />
        <Row
          id={`${c.id}-numTicks`}
          label="numTicks"
          control={numberInput(`${c.id}-numTicks`, p.numTicks, (v) => api.updateCustomProps(c.id, { numTicks: clamp(Math.floor(v), 2, 50) }))}
        />
        <Row
          id={`${c.id}-diameter`}
          label="diameter"
          control={numberInput(`${c.id}-diameter`, p.diameter, (v) => api.updateCustomProps(c.id, { diameter: Math.max(20, v) }))}
        />
        <Row
          id={`${c.id}-fitMode`}
          label="fitMode"
          control={
            <TextField
              id={`${c.id}-fitMode`}
              select
              fullWidth
              value={p.fitMode}
              onChange={(e) => api.updateCustomProps(c.id, { fitMode: e.target.value })}
              size="small"
            >
              <MenuItem value="contain">contain</MenuItem>
              <MenuItem value="stretch">stretch</MenuItem>
            </TextField>
          }
        />
        <Row
          id={`${c.id}-padding`}
          label="padding"
          control={numberInput(`${c.id}-padding`, p.padding, (v) => api.updateCustomProps(c.id, { padding: Math.max(0, v) }))}
        />
        </div>
      </div>

      {divider}

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 items-center">
        <Row
          id={`${c.id}-backgroundColor`}
          label="backgroundColor"
          control={<ColorInput id={`${c.id}-backgroundColor`} value={p.backgroundColor} onChange={(v) => api.updateCustomProps(c.id, { backgroundColor: v })} />}
        />
        <Row
          id={`${c.id}-trackColor`}
          label="trackColor"
          control={<ColorInput id={`${c.id}-trackColor`} value={p.trackColor} onChange={(v) => api.updateCustomProps(c.id, { trackColor: v })} />}
        />
        <Row
          id={`${c.id}-fillColor`}
          label="fillColor"
          control={<ColorInput id={`${c.id}-fillColor`} value={p.fillColor} onChange={(v) => api.updateCustomProps(c.id, { fillColor: v })} />}
        />
        <Row
          id={`${c.id}-arcWidth`}
          label="arcWidth"
          control={numberInput(`${c.id}-arcWidth`, p.arcWidth, (v) => api.updateCustomProps(c.id, { arcWidth: Math.max(1, v) }))}
        />
        </div>
      </div>

      {divider}

      <div className="flex flex-col gap-2">
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
        </div>

        <div className="grid grid-cols-2 gap-2 items-center">
          <Row
            id={`${c.id}-zonesOpacity`}
            label="zonesOpacity"
            control={numberInput(`${c.id}-zonesOpacity`, p.zonesOpacity, (v) => api.updateCustomProps(c.id, { zonesOpacity: clamp(v, 0, 1) }))}
          />
          <Row
            id={`${c.id}-zoneArcWidth`}
            label="zoneArcWidth"
            control={numberInput(`${c.id}-zoneArcWidth`, p.zoneArcWidth, (v) => api.updateCustomProps(c.id, { zoneArcWidth: Math.max(1, v) }))}
          />
          <Row
            id={`${c.id}-zoneArcGap`}
            label="zoneArcGap"
            control={numberInput(`${c.id}-zoneArcGap`, p.zoneArcGap, (v) => api.updateCustomProps(c.id, { zoneArcGap: Math.max(0, v) }))}
          />
        </div>
      </div>

      {divider}

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 items-center">
          <Row
            id={`${c.id}-showTicks`}
            label="showTicks"
            control={
              <div className="flex items-center">
                <Checkbox id={`${c.id}-showTicks`} checked={p.showTicks} onChange={(e) => api.updateCustomProps(c.id, { showTicks: e.target.checked })} />
              </div>
            }
          />
          <Row
            id={`${c.id}-tickColor`}
            label="tickColor"
            control={<ColorInput id={`${c.id}-tickColor`} value={p.tickColor} onChange={(v) => api.updateCustomProps(c.id, { tickColor: v })} />}
          />
          <Row
            id={`${c.id}-tickLength`}
            label="tickLength"
            control={numberInput(`${c.id}-tickLength`, p.tickLength, (v) => api.updateCustomProps(c.id, { tickLength: Math.max(0, v) }))}
          />
          <Row
            id={`${c.id}-tickWidth`}
            label="tickWidth"
            control={numberInput(`${c.id}-tickWidth`, p.tickWidth, (v) => api.updateCustomProps(c.id, { tickWidth: Math.max(0.5, v) }))}
          />
          <Row
            id={`${c.id}-showMinorTicks`}
            label="showMinorTicks"
            control={
              <div className="flex items-center">
                <Checkbox
                  id={`${c.id}-showMinorTicks`}
                  checked={p.showMinorTicks}
                  onChange={(e) => api.updateCustomProps(c.id, { showMinorTicks: e.target.checked })}
                />
              </div>
            }
          />
          <Row
            id={`${c.id}-minorTicksPerInterval`}
            label="minorTicksPerInterval"
            control={numberInput(`${c.id}-minorTicksPerInterval`, p.minorTicksPerInterval, (v) =>
              api.updateCustomProps(c.id, { minorTicksPerInterval: clamp(Math.floor(v), 1, 20) })
            )}
          />
          <Row
            id={`${c.id}-minorTickColor`}
            label="minorTickColor"
            control={<ColorInput id={`${c.id}-minorTickColor`} value={p.minorTickColor} onChange={(v) => api.updateCustomProps(c.id, { minorTickColor: v })} />}
          />
          <Row
            id={`${c.id}-minorTickLength`}
            label="minorTickLength"
            control={numberInput(`${c.id}-minorTickLength`, p.minorTickLength, (v) => api.updateCustomProps(c.id, { minorTickLength: Math.max(0, v) }))}
          />
          <Row
            id={`${c.id}-minorTickWidth`}
            label="minorTickWidth"
            control={numberInput(`${c.id}-minorTickWidth`, p.minorTickWidth, (v) => api.updateCustomProps(c.id, { minorTickWidth: Math.max(0.25, v) }))}
          />
        </div>
      </div>

      {divider}

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 items-center">
          <Row
            id={`${c.id}-showLabels`}
            label="showLabels"
            control={
              <div className="flex items-center">
                <Checkbox id={`${c.id}-showLabels`} checked={p.showLabels} onChange={(e) => api.updateCustomProps(c.id, { showLabels: e.target.checked })} />
              </div>
            }
          />
          <Row
            id={`${c.id}-labelColor`}
            label="labelColor"
            control={<ColorInput id={`${c.id}-labelColor`} value={p.labelColor} onChange={(v) => api.updateCustomProps(c.id, { labelColor: v })} />}
          />
          <Row
            id={`${c.id}-labelFontSize`}
            label="labelFontSize"
            control={numberInput(`${c.id}-labelFontSize`, p.labelFontSize, (v) => api.updateCustomProps(c.id, { labelFontSize: Math.max(6, v) }))}
          />
          <Row
            id={`${c.id}-labelOffset`}
            label="labelOffset"
            control={numberInput(`${c.id}-labelOffset`, p.labelOffset, (v) => api.updateCustomProps(c.id, { labelOffset: Math.max(0, v) }))}
          />
          <Row
            id={`${c.id}-labelDecimals`}
            label="labelDecimals"
            control={numberInput(`${c.id}-labelDecimals`, p.labelDecimals, (v) => api.updateCustomProps(c.id, { labelDecimals: clamp(Math.floor(v), 0, 10) }))}
          />
        </div>
      </div>

      {divider}

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 items-center">
          <Row
            id={`${c.id}-showNeedle`}
            label="showNeedle"
            control={
              <div className="flex items-center">
                <Checkbox id={`${c.id}-showNeedle`} checked={p.showNeedle} onChange={(e) => api.updateCustomProps(c.id, { showNeedle: e.target.checked })} />
              </div>
            }
          />
          <Row
            id={`${c.id}-needleType`}
            label="needleType"
            control={
              <TextField
                id={`${c.id}-needleType`}
                select
                fullWidth
                value={p.needleType}
                onChange={(e) => api.updateCustomProps(c.id, { needleType: e.target.value })}
                size="small"
              >
                <MenuItem value="simple">simple</MenuItem>
                <MenuItem value="arrow">arrow</MenuItem>
                <MenuItem value="circle">circle</MenuItem>
              </TextField>
            }
          />
          <Row
            id={`${c.id}-needleColor`}
            label="needleColor"
            control={<ColorInput id={`${c.id}-needleColor`} value={p.needleColor} onChange={(v) => api.updateCustomProps(c.id, { needleColor: v })} />}
          />
        <Row
          id={`${c.id}-needleLengthRatio`}
          label="needleLengthRatio"
          control={numberInput(`${c.id}-needleLengthRatio`, p.needleLengthRatio, (v) => api.updateCustomProps(c.id, { needleLengthRatio: clamp(v, 0, 1) }))}
        />
        <Row
          id={`${c.id}-needleWidth`}
          label="needleWidth"
          control={numberInput(`${c.id}-needleWidth`, p.needleWidth, (v) => api.updateCustomProps(c.id, { needleWidth: Math.max(0.5, v) }))}
        />
        <Row
          id={`${c.id}-needleBaseRadius`}
          label="needleBaseRadius"
          control={numberInput(`${c.id}-needleBaseRadius`, p.needleBaseRadius, (v) => api.updateCustomProps(c.id, { needleBaseRadius: Math.max(0, v) }))}
        />
        <Row
          id={`${c.id}-needleTipRadius`}
          label="needleTipRadius"
          control={numberInput(`${c.id}-needleTipRadius`, p.needleTipRadius, (v) => api.updateCustomProps(c.id, { needleTipRadius: Math.max(0, v) }))}
        />
        </div>
      </div>

      {divider}

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 items-center">
          <Row
            id={`${c.id}-showValueText`}
            label="showValueText"
            control={
              <div className="flex items-center">
                <Checkbox
                  id={`${c.id}-showValueText`}
                  checked={p.showValueText}
                  onChange={(e) => api.updateCustomProps(c.id, { showValueText: e.target.checked })}
                />
              </div>
            }
          />
          <Row
            id={`${c.id}-valuePosition`}
            label="valuePosition"
            control={
              <TextField
                id={`${c.id}-valuePosition`}
                select
                fullWidth
                value={p.valuePosition}
                onChange={(e) => api.updateCustomProps(c.id, { valuePosition: e.target.value })}
                size="small"
              >
                <MenuItem value="center">center</MenuItem>
                <MenuItem value="bottom">bottom</MenuItem>
              </TextField>
            }
          />
          <Row
            id={`${c.id}-valueColor`}
            label="valueColor"
            control={<ColorInput id={`${c.id}-valueColor`} value={p.valueColor} onChange={(v) => api.updateCustomProps(c.id, { valueColor: v })} />}
          />
        <Row
          id={`${c.id}-valueFontSize`}
          label="valueFontSize"
          control={numberInput(`${c.id}-valueFontSize`, p.valueFontSize, (v) => api.updateCustomProps(c.id, { valueFontSize: Math.max(6, v) }))}
        />
        <Row
          id={`${c.id}-valueFontWeight`}
          label="valueFontWeight"
          control={numberInput(`${c.id}-valueFontWeight`, p.valueFontWeight, (v) =>
            api.updateCustomProps(c.id, { valueFontWeight: clamp(Math.floor(v), 100, 900) })
          )}
        />
        <Row
          id={`${c.id}-valueDecimals`}
          label="valueDecimals"
          control={numberInput(`${c.id}-valueDecimals`, p.valueDecimals, (v) => api.updateCustomProps(c.id, { valueDecimals: clamp(Math.floor(v), 0, 10) }))}
        />
          <Row
            id={`${c.id}-valuePrefix`}
            label="valuePrefix"
            control={
              <TextField
                id={`${c.id}-valuePrefix`}
                fullWidth
                value={p.valuePrefix}
                onChange={(e) => api.updateCustomProps(c.id, { valuePrefix: e.target.value })}
                size="small"
              />
            }
          />
          <Row
            id={`${c.id}-valueSuffix`}
            label="valueSuffix"
            control={
              <TextField
                id={`${c.id}-valueSuffix`}
                fullWidth
                value={p.valueSuffix}
                onChange={(e) => api.updateCustomProps(c.id, { valueSuffix: e.target.value })}
                size="small"
              />
            }
          />
        </div>
      </div>

      {divider}

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 items-center">
          <Row
            id={`${c.id}-animate`}
            label="animate"
            control={
              <div className="flex items-center">
                <Checkbox id={`${c.id}-animate`} checked={p.animate} onChange={(e) => api.updateCustomProps(c.id, { animate: e.target.checked })} />
              </div>
            }
          />
          <Row
            id={`${c.id}-animateArc`}
            label="animateArc"
            control={
              <div className="flex items-center">
                <Checkbox id={`${c.id}-animateArc`} checked={p.animateArc} onChange={(e) => api.updateCustomProps(c.id, { animateArc: e.target.checked })} />
              </div>
            }
          />
          <Row
            id={`${c.id}-animateNeedle`}
            label="animateNeedle"
            control={
              <div className="flex items-center">
                <Checkbox id={`${c.id}-animateNeedle`} checked={p.animateNeedle} onChange={(e) => api.updateCustomProps(c.id, { animateNeedle: e.target.checked })} />
              </div>
            }
          />
          <Row
            id={`${c.id}-animateValueText`}
            label="animateValueText"
            control={
              <div className="flex items-center">
                <Checkbox
                  id={`${c.id}-animateValueText`}
                  checked={p.animateValueText}
                  onChange={(e) => api.updateCustomProps(c.id, { animateValueText: e.target.checked })}
                />
              </div>
            }
          />
          <Row
            id={`${c.id}-animationDuration`}
            label="animationDuration"
            control={numberInput(`${c.id}-animationDuration`, p.animationDuration, (v) => api.updateCustomProps(c.id, { animationDuration: Math.max(0, v) }))}
          />
          <Row
            id={`${c.id}-animationEase`}
            label="animationEase"
            control={
              <TextField
                id={`${c.id}-animationEase`}
                fullWidth
                value={p.animationEase}
                onChange={(e) => api.updateCustomProps(c.id, { animationEase: e.target.value })}
                size="small"
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
