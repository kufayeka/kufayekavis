"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";

import type { CustomElement } from "../../designer/core/types";
import { coerceGaugeProps } from "./gauge.model";

function formatNumber(value: number, decimals: number): string {
  const d = Math.max(0, Math.min(10, decimals));
  return Number.isFinite(value) ? value.toFixed(d) : "0";
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const a = degToRad(angleDeg);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function polarToCartesianEllipse(cx: number, cy: number, rx: number, ry: number, angleDeg: number): { x: number; y: number } {
  const a = degToRad(angleDeg);
  return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
}

function describeArcEllipse(cx: number, cy: number, rx: number, ry: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesianEllipse(cx, cy, rx, ry, startAngle);
  const end = polarToCartesianEllipse(cx, cy, rx, ry, endAngle);

  const sweep = endAngle - startAngle;
  const largeArcFlag = Math.abs(sweep) > 180 ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${rx} ${ry} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function renderGauge(ctxUnknown: unknown): React.ReactNode {
  const ctx = ctxUnknown as { element: CustomElement };
  return <GaugeInner el={ctx.element} />;
}

function GaugeInner({ el }: { el: CustomElement }) {
  const p = coerceGaugeProps(el.props, el);

  const [animatedValue, setAnimatedValue] = useState<number>(p.value);
  const animatedValueRef = useRef<number>(p.value);

  const w = Math.max(1, el.width);
  const h = Math.max(1, el.height);
  const cx = w / 2;
  const cy = h / 2;

  const pad = Math.max(0, p.padding);
  const availW = Math.max(1, w - pad * 2);
  const availH = Math.max(1, h - pad * 2);

  // Cap size by diameter (lets you keep the gauge smaller than the box)
  const cap = Math.max(20, p.diameter);

  const rawRx = availW / 2;
  const rawRy = availH / 2;
  const maxRx = Math.min(rawRx, cap / 2);
  const maxRy = Math.min(rawRy, cap / 2);

  const baseR = Math.max(1, Math.min(maxRx, maxRy) - p.arcWidth / 2);
  const rx = Math.max(1, (p.fitMode === "stretch" ? maxRx : baseR));
  const ry = Math.max(1, (p.fitMode === "stretch" ? maxRy : baseR));

  // Keep stroke inside the box
  const arcInnerRx = Math.max(1, rx - p.arcWidth / 2);
  const arcInnerRy = Math.max(1, ry - p.arcWidth / 2);

  // Zones render as an inner arc (closer to center) so they sit "under" the main arc/ticks.
  const zoneRx = Math.max(1, arcInnerRx - p.arcWidth / 2 - p.zoneArcGap - p.zoneArcWidth / 2);
  const zoneRy = Math.max(1, arcInnerRy - p.arcWidth / 2 - p.zoneArcGap - p.zoneArcWidth / 2);

  const fullArcD = useMemo(
    () => describeArcEllipse(cx, cy, arcInnerRx, arcInnerRy, p.startAngle, p.endAngle),
    [cx, cy, arcInnerRx, arcInnerRy, p.startAngle, p.endAngle],
  );

  const fraction = useMemo(() => {
    const denom = p.max - p.min;
    if (!Number.isFinite(denom) || denom === 0) return 0;
    return clamp((p.value - p.min) / denom, 0, 1);
  }, [p.value, p.min, p.max]);

  const valueAngle = useMemo(() => lerp(p.startAngle, p.endAngle, fraction), [p.startAngle, p.endAngle, fraction]);

  const progressPathRef = useRef<SVGPathElement | null>(null);
  const needleRef = useRef<SVGGElement | null>(null);
  const lastNeedleAngleRef = useRef<number>(valueAngle);
  const valueTweenRef = useRef<gsap.core.Tween | null>(null);
  const needleTweenRef = useRef<gsap.core.Tween | null>(null);

  // Animate to new value
  useEffect(() => {
    const duration = p.animate ? p.animationDuration : 0;
    const ease = p.animationEase || "none";

    const path = progressPathRef.current;
    if (path) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      const targetOffset = len * (1 - fraction);
      if (p.animate && p.animateArc) {
        gsap.killTweensOf(path);
        gsap.to(path, { strokeDashoffset: targetOffset, duration, ease, overwrite: "auto" });
      } else {
        gsap.killTweensOf(path);
        gsap.set(path, { strokeDashoffset: targetOffset });
      }
    }

    const needleEl = needleRef.current;
    if (needleEl) {
      const from = lastNeedleAngleRef.current;
      const to = valueAngle;
      lastNeedleAngleRef.current = to;

      needleTweenRef.current?.kill();
      needleTweenRef.current = null;

      if (p.animate && p.animateNeedle && duration > 0) {
        const obj = { a: from };
        needleTweenRef.current = gsap.to(obj, {
          a: to,
          duration,
          ease,
          overwrite: "auto",
          onUpdate: () => {
            needleEl.setAttribute("transform", `rotate(${obj.a} ${cx} ${cy})`);
          },
          onComplete: () => {
            needleEl.setAttribute("transform", `rotate(${to} ${cx} ${cy})`);
          },
        });
      } else {
        needleEl.setAttribute("transform", `rotate(${to} ${cx} ${cy})`);
      }
    }

    if (p.showValueText) {
      valueTweenRef.current?.kill();
      valueTweenRef.current = null;

      if (p.animate && p.animateValueText && duration > 0) {
        const obj = { v: animatedValueRef.current };
        valueTweenRef.current = gsap.to(obj, {
          v: p.value,
          duration,
          ease,
          overwrite: "auto",
          onUpdate: () => {
            animatedValueRef.current = obj.v;
            setAnimatedValue(obj.v);
          },
          onComplete: () => {
            animatedValueRef.current = p.value;
            setAnimatedValue(p.value);
          },
        });
      }
    }

    return () => {
      valueTweenRef.current?.kill();
      valueTweenRef.current = null;
      needleTweenRef.current?.kill();
      needleTweenRef.current = null;
    };
  }, [
    p.animate,
    p.animateArc,
    p.animateNeedle,
    p.animateValueText,
    p.animationDuration,
    p.animationEase,
    p.showValueText,
    p.value,
    p.valueDecimals,
    p.valuePrefix,
    p.valueSuffix,
    cx,
    cy,
    fraction,
    valueAngle,
  ]);

  const displayValue = p.animate && p.animateValueText ? animatedValue : p.value;

  const ticks = useMemo(() => {
    const count = Math.max(2, p.numTicks);
    const out: Array<{ angle: number; value: number }> = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      out.push({
        angle: lerp(p.startAngle, p.endAngle, t),
        value: lerp(p.min, p.max, t),
      });
    }
    return out;
  }, [p.numTicks, p.startAngle, p.endAngle, p.min, p.max]);

  const minorTicks = useMemo(() => {
    if (!p.showMinorTicks) return [] as number[];
    const majors = Math.max(2, p.numTicks);
    const per = Math.max(1, p.minorTicksPerInterval);
    const out: number[] = [];
    for (let seg = 0; seg < majors - 1; seg++) {
      const t0 = seg / (majors - 1);
      const t1 = (seg + 1) / (majors - 1);
      for (let j = 1; j <= per; j++) {
        const tt = lerp(t0, t1, j / (per + 1));
        out.push(lerp(p.startAngle, p.endAngle, tt));
      }
    }
    return out;
  }, [p.showMinorTicks, p.minorTicksPerInterval, p.numTicks, p.startAngle, p.endAngle]);

  const arcExtents = useMemo(() => {
    // Sample points along the arc to find approximate extents.
    const steps = 36;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = lerp(p.startAngle, p.endAngle, t);
      const pt = polarToCartesianEllipse(cx, cy, arcInnerRx, arcInnerRy, a);
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y);
      maxY = Math.max(maxY, pt.y);
    }
    return { minX, maxX, minY, maxY };
  }, [cx, cy, arcInnerRx, arcInnerRy, p.startAngle, p.endAngle]);

  const valueTextPos = useMemo(() => {
    const x = cx;
    if (p.valuePosition === "center") return { x, y: cy };
    // "bottom" means: inside the arc area, not literally below the gauge.
    // Place between center and the arc bottom extents.
    const y = cy + (arcExtents.maxY - cy) * 0.5;
    return { x, y };
  }, [p.valuePosition, cx, cy, arcExtents.maxY]);

  const needleLen = Math.max(0, Math.min(1, p.needleLengthRatio));
  const needleR = Math.max(1, Math.min(arcInnerRx, arcInnerRy) * needleLen);
  const needleTip = polarToCartesian(cx, cy, needleR, 0);

  const arrowSize = Math.max(4, Math.min(30, p.needleWidth * 2.5));
  const arrowPoints = `${needleTip.x},${needleTip.y} ${needleTip.x - arrowSize},${needleTip.y - arrowSize * 0.6} ${needleTip.x - arrowSize},${needleTip.y + arrowSize * 0.6}`;

  return (
    <>
      <rect x={0} y={0} width={w} height={h} fill={p.backgroundColor} />

      {p.zones.length > 0 && (
        <g opacity={p.zonesOpacity}>
          {p.zones.map((z, idx) => {
            const denom = p.max - p.min;
            if (!Number.isFinite(denom) || denom === 0) return null;
            const t0 = clamp((z.from - p.min) / denom, 0, 1);
            const t1 = clamp((z.to - p.min) / denom, 0, 1);
            const a0 = lerp(p.startAngle, p.endAngle, t0);
            const a1 = lerp(p.startAngle, p.endAngle, t1);
            const d = describeArcEllipse(cx, cy, zoneRx, zoneRy, a0, a1);
            return (
              <path
                key={`zone-${idx}-${z.from}-${z.to}`}
                d={d}
                stroke={z.color}
                strokeWidth={p.zoneArcWidth}
                strokeLinecap="butt"
                fill="none"
              />
            );
          })}
        </g>
      )}

      <path
        d={fullArcD}
        stroke={p.trackColor}
        strokeWidth={p.arcWidth}
        strokeLinecap="round"
        fill="none"
      />

      <path
        ref={progressPathRef}
        d={fullArcD}
        stroke={p.fillColor}
        strokeWidth={p.arcWidth}
        strokeLinecap="round"
        fill="none"
      />

      {p.showTicks &&
        ticks.map((t) => {
          const tickKey = `tick-${t.angle}`;
          const a = t.angle;
          const tickInRx = Math.max(1, arcInnerRx - p.tickLength);
          const tickInRy = Math.max(1, arcInnerRy - p.tickLength);
          const tickOutRx = Math.max(1, arcInnerRx + p.tickLength);
          const tickOutRy = Math.max(1, arcInnerRy + p.tickLength);
          const inner = polarToCartesianEllipse(cx, cy, tickInRx, tickInRy, a);
          const outer = polarToCartesianEllipse(cx, cy, tickOutRx, tickOutRy, a);
          const labelPos = polarToCartesianEllipse(cx, cy, arcInnerRx + p.labelOffset, arcInnerRy + p.labelOffset, a);
          return (
            <g key={tickKey}>
              <line
                stroke={p.tickColor}
                strokeWidth={p.tickWidth}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
              />
              {p.showLabels && (
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={p.labelColor}
                  fontSize={p.labelFontSize}
                  fontWeight={500}
                >
                  {formatNumber(t.value, p.labelDecimals)}
                </text>
              )}
            </g>
          );
        })}

      {p.showTicks &&
        p.showMinorTicks &&
        minorTicks.map((a, idx) => {
          const tickKey = `minor-${idx}-${a}`;
          const tickInRx = Math.max(1, arcInnerRx - p.minorTickLength);
          const tickInRy = Math.max(1, arcInnerRy - p.minorTickLength);
          const tickOutRx = Math.max(1, arcInnerRx + p.minorTickLength);
          const tickOutRy = Math.max(1, arcInnerRy + p.minorTickLength);
          const inner = polarToCartesianEllipse(cx, cy, tickInRx, tickInRy, a);
          const outer = polarToCartesianEllipse(cx, cy, tickOutRx, tickOutRy, a);
          return (
            <line
              key={tickKey}
              stroke={p.minorTickColor}
              strokeWidth={p.minorTickWidth}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              opacity={0.85}
            />
          );
        })}

      {p.showNeedle && (
        <g ref={needleRef} transform={`rotate(${valueAngle} ${cx} ${cy})`}>
          {p.needleType !== "circle" && (
            <line
              x1={cx}
              y1={cy}
              x2={cx + needleR}
              y2={cy}
              stroke={p.needleColor}
              strokeWidth={p.needleWidth}
              strokeLinecap="round"
            />
          )}

          {p.needleType === "arrow" && <polygon points={arrowPoints} fill={p.needleColor} />}

          {p.needleType === "circle" && (
            <circle cx={cx + needleR} cy={cy} r={Math.max(1, p.needleTipRadius)} fill={p.needleColor} />
          )}

          {p.needleBaseRadius > 0 && <circle cx={cx} cy={cy} r={Math.max(0, p.needleBaseRadius)} fill={p.needleColor} />}

          {p.needleType === "simple" && p.needleTipRadius > 0 && (
            <circle cx={cx + needleR} cy={cy} r={Math.max(0, p.needleTipRadius)} fill={p.needleColor} opacity={0.9} />
          )}
        </g>
      )}

      {p.showValueText && (
        <text
          x={valueTextPos.x}
          y={valueTextPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={p.valueColor}
          fontSize={p.valueFontSize}
          fontWeight={p.valueFontWeight}
        >
          {p.valuePrefix}
          {formatNumber(displayValue, p.valueDecimals)}
          {p.valueSuffix}
        </text>
      )}
    </>
  );
}
