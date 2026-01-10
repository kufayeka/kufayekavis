"use client";

import type React from "react";

import type { CustomElement } from "../../designer/core/types";
import type { PropertiesSectionRenderCtx } from "../../designer/ui/components/properties/types";
import { ColorInput, Row, numberInput } from "../../designer/ui/components/properties/controls";
import { MOTION_PATH_LINE_ACTION_IDS } from "./motionPathLine.actions";
import { MOTION_PATH_LINE_KIND, coerceMotionPathLineProps } from "./motionPathLine.model";
import { Checkbox, FormControlLabel, MenuItem, TextField } from "@mui/material";

export function renderMotionPathLineProperties(ctxUnknown: unknown): React.ReactNode {
  const { api, engine, state } = ctxUnknown as PropertiesSectionRenderCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? state.doc.elements[selectedId] : null;
  if (!el || el.type !== "custom") return null;

  const c = el as CustomElement;
  if (c.kind !== MOTION_PATH_LINE_KIND) return null;

  const p = coerceMotionPathLineProps(c.props);
  const baseId = `el-${c.id}-mpl`;
  const animateId = `${baseId}-animate`;

  const setProps = (patch: Record<string, unknown>) => {
    engine.updateElement(c.id, { props: { ...(c.props || {}), ...patch } });
  };

  return (
    <div className="rounded border border-black/10 p-2 space-y-3">
      <div className="text-sm font-medium">Flow Particle Line</div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <Row
          id={`${baseId}-animate`}
          label="Animate"
          control={
            <FormControlLabel
              control={
                <Checkbox
                  id={animateId}
                  checked={Boolean(p.animate)}
                  onChange={(e) => api.callElementAction(c.id, MOTION_PATH_LINE_ACTION_IDS.setAnimate, e.target.checked)}
                />
              }
              label="Enabled"
            />
          }
        />

        <Row id={`${baseId}-speed`} label="Speed (s)" control={numberInput(`${baseId}-speed`, p.particleSpeed, (v) => setProps({ particleSpeed: Math.max(0.05, v) }))} />

        <Row
          id={`${baseId}-placement`}
          label="Particles"
          control={
            <TextField
              id={`${baseId}-placement`}
              select
              fullWidth
              value={p.particlePlacement}
              onChange={(e) => setProps({ particlePlacement: String(e.target.value) })}
            >
              <MenuItem value="single">Single</MenuItem>
              <MenuItem value="along">Along Path</MenuItem>
            </TextField>
          }
        />

        {p.particlePlacement === "along" ? (
          <Row id={`${baseId}-gap`} label="Gap (px)" control={numberInput(`${baseId}-gap`, p.particleGap, (v) => setProps({ particleGap: Math.max(0, v) }))} />
        ) : (
          <div className="col-span-2 text-xs text-black/60">Gap applies only in Along Path mode.</div>
        )}

        <Row
          id={`${baseId}-direction`}
          label="Direction"
          control={
            <TextField
              id={`${baseId}-direction`}
              select
              fullWidth
              value={p.particleDirection}
              onChange={(e) => setProps({ particleDirection: String(e.target.value) })}
            >
              <MenuItem value="forward">Forward</MenuItem>
              <MenuItem value="reverse">Reverse</MenuItem>
            </TextField>
          }
        />

        <Row
          id={`${baseId}-shape`}
          label="Shape"
          control={
            <TextField
              id={`${baseId}-shape`}
              select
              fullWidth
              value={p.particleShape}
              onChange={(e) => setProps({ particleShape: String(e.target.value) })}
            >
              <MenuItem value="circle">Circle</MenuItem>
              <MenuItem value="rect">Rectangle</MenuItem>
            </TextField>
          }
        />

        <Row id={`${baseId}-psize`} label="Size" control={numberInput(`${baseId}-psize`, p.particleSize, (v) => setProps({ particleSize: Math.max(1, v) }))} />

        <Row
          id={`${baseId}-pcolor`}
          label="P Color"
          control={<ColorInput id={`${baseId}-pcolor`} value={p.particleColor} onChange={(v) => setProps({ particleColor: v })} />}
        />

        <Row id={`${baseId}-pop`} label="P Opacity" control={numberInput(`${baseId}-pop`, p.particleOpacity, (v) => setProps({ particleOpacity: Math.max(0, Math.min(1, v)) }))} />

        <Row
          id={`${baseId}-lcolor`}
          label="Line Color"
          control={<ColorInput id={`${baseId}-lcolor`} value={p.lineColor} onChange={(v) => setProps({ lineColor: v })} />}
        />

        <Row id={`${baseId}-lop`} label="Line Op" control={numberInput(`${baseId}-lop`, p.lineOpacity, (v) => setProps({ lineOpacity: Math.max(0, Math.min(1, v)) }))} />
        <Row id={`${baseId}-lw`} label="Thickness" control={numberInput(`${baseId}-lw`, p.lineThickness, (v) => setProps({ lineThickness: Math.max(1, v) }))} />
      </div>
    </div>
  );
}
