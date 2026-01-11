"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";

import type { CustomElement } from "../../designer/core/types";
import { coerceBarGaugeProps } from "./barGauge.model";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatNumber(value: number, decimals: number): string {
  const d = Math.max(0, Math.min(10, decimals));
  return Number.isFinite(value) ? value.toFixed(d) : "0";
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function renderBarGauge(ctxUnknown: unknown): React.ReactNode {
  const ctx = ctxUnknown as { element: CustomElement };
  return <BarGaugeInner el={ctx.element} />;
}

function BarGaugeInner({ el }: { el: CustomElement }) {
  const p = coerceBarGaugeProps(el.props, el);

  const w = Math.max(1, el.width);
  const h = Math.max(1, el.height);

  const pad = Math.max(0, p.padding);
  const tx = pad;
  const ty = pad;
  const tw = Math.max(1, w - pad * 2);
  const th = Math.max(1, h - pad * 2);

  const denom = p.max - p.min;
  const fraction = useMemo(() => {
    if (!Number.isFinite(denom) || denom === 0) return 0;
    return clamp((p.value - p.min) / denom, 0, 1);
  }, [p.value, p.min, denom]);

  const frac = p.direction === "reverse" ? 1 - fraction : fraction;

  const targetFill = useMemo(() => {
    if (p.orientation === "horizontal") {
      const fw = Math.max(0, tw * frac);
      const fx = p.direction === "reverse" ? tx + (tw - fw) : tx;
      return { x: fx, y: ty, width: fw, height: th };
    }

    const fh = Math.max(0, th * frac);
    const fy = p.direction === "reverse" ? ty : ty + (th - fh);
    return { x: tx, y: fy, width: tw, height: fh };
  }, [p.orientation, p.direction, tx, ty, tw, th, frac]);

  const safeTrackRadius = Math.max(0, p.trackRadius);

  const fillRef = useRef<SVGRectElement | null>(null);
  const fillTweenRef = useRef<gsap.core.Tween | null>(null);

  const [animatedValue, setAnimatedValue] = useState<number>(p.value);
  const animatedValueRef = useRef<number>(p.value);
  const valueTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const duration = p.animate ? p.animationDuration : 0;
    const ease = p.animationEase || "none";

    const fillEl = fillRef.current;
    if (fillEl) {
      fillTweenRef.current?.kill();
      fillTweenRef.current = null;

      if (p.animate && p.animateFill && duration > 0) {
        fillTweenRef.current = gsap.to(fillEl, {
          duration,
          ease,
          overwrite: "auto",
          attr: {
            x: targetFill.x,
            y: targetFill.y,
            width: targetFill.width,
            height: targetFill.height,
          },
        });
      } else {
        gsap.set(fillEl, {
          attr: {
            x: targetFill.x,
            y: targetFill.y,
            width: targetFill.width,
            height: targetFill.height,
          },
        });
      }
    }

    if (p.showValueText && p.animate && p.animateValueText && duration > 0) {
      valueTweenRef.current?.kill();
      valueTweenRef.current = null;

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

    return () => {
      fillTweenRef.current?.kill();
      fillTweenRef.current = null;
      valueTweenRef.current?.kill();
      valueTweenRef.current = null;
    };
  }, [
    p.animate,
    p.animateFill,
    p.animateValueText,
    p.animationDuration,
    p.animationEase,
    p.showValueText,
    p.value,
    targetFill.x,
    targetFill.y,
    targetFill.width,
    targetFill.height,
  ]);

  const displayValue = p.animate && p.animateValueText ? animatedValue : p.value;

  const valueTextPos = useMemo(() => {
    const center = { x: tx + tw / 2, y: ty + th / 2 };
    if (p.valuePosition === "inside-center") return center;

    if (p.orientation === "horizontal") {
      if (p.valuePosition === "inside-top") return { x: tx + tw / 2, y: ty + th * 0.25 };
      if (p.valuePosition === "inside-bottom") return { x: tx + tw / 2, y: ty + th * 0.75 };
      if (p.valuePosition === "top-outside") return { x: tx + tw / 2, y: ty - th * 0.25 };
      if (p.valuePosition === "below-outside") return { x: tx + tw / 2, y: ty + th * 1.25 };
      // fallback to end
      const x = p.direction === "reverse" ? tx + tw * 0.1 : tx + tw * 0.9;
      return { x, y: center.y };
    }

    // vertical
    if (p.valuePosition === "inside-top") return { x: tx + tw / 2, y: ty + th * 0.25 };
    if (p.valuePosition === "inside-bottom") return { x: tx + tw / 2, y: ty + th * 0.75 };
    if (p.valuePosition === "top-outside") return { x: tx + tw / 2, y: ty - th * 0.25 };
    if (p.valuePosition === "below-outside") return { x: tx + tw / 2, y: ty + th * 1.25 };
    // fallback
    const y = p.direction === "reverse" ? ty + th * 0.9 : ty + th * 0.1;
    return { x: center.x, y };
  }, [p.valuePosition, p.orientation, p.direction, tx, ty, tw, th]);

  const valueString = `${p.valuePrefix}${formatNumber(displayValue, p.valueDecimals)}${p.valueSuffix}`;

  // Start fill rect at current target (prevents flash on mount).
  const initFill = targetFill;

  const maxRx = Math.min(safeTrackRadius, tw / 2, th / 2);
  const fillMaxRx = Math.min(p.fillBorderRadius, Math.max(0, initFill.width) / 2, Math.max(0, initFill.height) / 2);

  const axisPos = useMemo(() => {
    const majorCount = Math.max(2, p.numTicks);
    const majors = Array.from({ length: majorCount }, (_, i) => (majorCount === 1 ? 0 : i / (majorCount - 1)));

    const minor: number[] = [];
    if (p.showMinorTicks) {
      const per = Math.max(1, p.minorTicksPerInterval);
      for (let seg = 0; seg < majorCount - 1; seg++) {
        const t0 = seg / (majorCount - 1);
        const t1 = (seg + 1) / (majorCount - 1);
        for (let j = 1; j <= per; j++) {
          minor.push(lerp(t0, t1, j / (per + 1)));
        }
      }
    }

    const mapT = (t: number) => {
      if (p.orientation === "horizontal") {
        return p.direction === "reverse" ? 1 - t : t;
      }
      // vertical: forward means bottom->top; reverse means top->bottom
      return p.direction === "reverse" ? t : 1 - t;
    };

    const toPoint = (t: number) => {
      const tt = clamp(mapT(t), 0, 1);
      if (p.orientation === "horizontal") return { x: tx + tw * tt, y: ty + th / 2 };
      return { x: tx + tw / 2, y: ty + th * tt };
    };

    return { majors, minor, toPoint };
  }, [p.numTicks, p.showMinorTicks, p.minorTicksPerInterval, p.orientation, p.direction, tx, ty, tw, th]);

  const zoneThickness = Math.max(1, Math.min(p.zoneThickness, p.orientation === "horizontal" ? th : tw));
  const zoneRect = useMemo(() => {
    if (p.orientation === "horizontal") {
      let y: number;
      switch (p.zonePosition) {
        case "start":
          y = ty;
          break;
        case "end":
          y = ty + th - zoneThickness;
          break;
        case "center":
        case "auto":
        default:
          y = ty + (th - zoneThickness) / 2;
          break;
      }
      return { x: tx, y, width: tw, height: zoneThickness };
    }
    let x: number;
    switch (p.zonePosition) {
      case "start":
        x = tx;
        break;
      case "end":
        x = tx + tw - zoneThickness;
        break;
      case "center":
      case "auto":
      default:
        x = tx + (tw - zoneThickness) / 2;
        break;
    }
    return { x, y: ty, width: zoneThickness, height: th };
  }, [p.orientation, p.zonePosition, tx, ty, tw, th, zoneThickness]);

  return (
    <>
      <rect x={0} y={0} width={w} height={h} rx={p.borderRadius} ry={p.borderRadius} fill={p.backgroundColor} />

      <rect
        x={tx}
        y={ty}
        width={tw}
        height={th}
        rx={maxRx}
        ry={maxRx}
        fill={p.trackColor}
        stroke={p.trackStrokeColor}
        strokeWidth={p.trackStrokeWidth}
      />

      <rect
        ref={fillRef}
        x={initFill.x}
        y={initFill.y}
        width={initFill.width}
        height={initFill.height}
        rx={fillMaxRx}
        ry={fillMaxRx}
        fill={p.fillColor}
      />

      {p.zones.length > 0 && (
        <g opacity={p.zonesOpacity}>
          {p.zones.map((z, idx) => {
            if (!Number.isFinite(denom) || denom === 0) return null;
            const t0 = clamp((z.from - p.min) / denom, 0, 1);
            const t1 = clamp((z.to - p.min) / denom, 0, 1);

            const p0 = axisPos.toPoint(t0);
            const p1 = axisPos.toPoint(t1);

            if (p.orientation === "horizontal") {
              const x0 = Math.min(p0.x, p1.x);
              const x1 = Math.max(p0.x, p1.x);
              return (
                <rect
                  key={`zone-${idx}-${z.from}-${z.to}`}
                  x={x0}
                  y={zoneRect.y + p.zoneOffsetY}
                  width={Math.max(0, x1 - x0)}
                  height={zoneRect.height}
                  rx={p.zoneBorderRadius}
                  ry={p.zoneBorderRadius}
                  fill={z.color}
                />
              );
            }

            const y0 = Math.min(p0.y, p1.y);
            const y1 = Math.max(p0.y, p1.y);
            return (
              <rect
                key={`zone-${idx}-${z.from}-${z.to}`}
                x={zoneRect.x + p.zoneOffsetX}
                y={y0 + p.zoneOffsetY}
                width={zoneRect.width}
                height={Math.max(0, y1 - y0)}
                rx={p.zoneBorderRadius}
                ry={p.zoneBorderRadius}
                fill={z.color}
              />
            );
          })}
        </g>
      )}

      {p.showTicks &&
        axisPos.majors.map((t) => {
          const pt = axisPos.toPoint(t);
          const key = `tick-${t}`;

          if (p.orientation === "horizontal") {
            const x = pt.x;
            let y0: number, y1: number, labelY: number;
            switch (p.tickPosition) {
              case "start":
                y0 = ty;
                y1 = ty + p.tickLength;
                labelY = y1 + p.labelOffset;
                break;
              case "end":
                y0 = ty + th;
                y1 = ty + th - p.tickLength;
                labelY = y1 - p.labelOffset;
                break;
              case "outside":
                y0 = ty - p.tickLength;
                y1 = ty;
                labelY = y0 - p.labelOffset;
                break;
              case "auto":
              default:
                y0 = ty;
                y1 = ty - p.tickLength;
                labelY = y1 - p.labelOffset;
                break;
            }
            const val = lerp(p.min, p.max, t);
            return (
              <g key={key}>
                <line x1={x + p.tickOffsetX} y1={y0 + p.tickOffsetY} x2={x + p.tickOffsetX} y2={y1 + p.tickOffsetY} stroke={p.tickColor} strokeWidth={p.tickWidth} />
                {p.showLabels && (
                  <text
                    x={x + p.labelOffsetX}
                    y={labelY + p.labelOffsetY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={p.labelColor}
                    fontSize={p.labelFontSize}
                    fontWeight={500}
                  >
                    {formatNumber(val, p.labelDecimals)}
                  </text>
                )}
              </g>
            );
          }

          const y = pt.y;
          let x0: number, x1: number, labelX: number;
          switch (p.tickPosition) {
            case "start":
              x0 = tx;
              x1 = tx - p.tickLength;
              labelX = x1 - p.labelOffset;
              break;
            case "end":
              x0 = tx + tw;
              x1 = tx + tw + p.tickLength;
              labelX = x1 + p.labelOffset;
              break;
            case "outside":
              x0 = tx + tw + p.tickLength;
              x1 = tx + tw;
              labelX = x0 + p.labelOffset;
              break;
            case "auto":
            default:
              x0 = tx + tw;
              x1 = tx + tw + p.tickLength;
              labelX = x1 + p.labelOffset;
              break;
          }
          const val = lerp(p.min, p.max, t);
          return (
            <g key={key}>
              <line x1={x0 + p.tickOffsetX} y1={y + p.tickOffsetY} x2={x1 + p.tickOffsetX} y2={y + p.tickOffsetY} stroke={p.tickColor} strokeWidth={p.tickWidth} />
              {p.showLabels && (
                <text
                  x={labelX + p.labelOffsetX}
                  y={y + p.labelOffsetY}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fill={p.labelColor}
                  fontSize={p.labelFontSize}
                  fontWeight={500}
                >
                  {formatNumber(val, p.labelDecimals)}
                </text>
              )}
            </g>
          );
        })}

      {p.showTicks &&
        p.showMinorTicks &&
        axisPos.minor.map((t, idx) => {
          const pt = axisPos.toPoint(t);
          const key = `minor-${idx}-${t}`;

          if (p.orientation === "horizontal") {
            const x = pt.x;
            let y0: number, y1: number;
            switch (p.minorTickPosition) {
              case "start":
                y0 = ty;
                y1 = ty + p.minorTickLength;
                break;
              case "end":
                y0 = ty + th;
                y1 = ty + th - p.minorTickLength;
                break;
              case "outside":
                y0 = ty - p.minorTickLength;
                y1 = ty;
                break;
              case "auto":
              default:
                y0 = ty;
                y1 = ty - p.minorTickLength;
                break;
            }
            return <line key={key} x1={x + p.minorTickOffsetX} y1={y0 + p.minorTickOffsetY} x2={x + p.minorTickOffsetX} y2={y1 + p.minorTickOffsetY} stroke={p.minorTickColor} strokeWidth={p.minorTickWidth} opacity={0.85} />;
          }

          const y = pt.y;
          let x0: number, x1: number;
          switch (p.minorTickPosition) {
            case "start":
              x0 = tx;
              x1 = tx - p.minorTickLength;
              break;
            case "end":
              x0 = tx + tw;
              x1 = tx + tw + p.minorTickLength;
              break;
            case "outside":
              x0 = tx + tw + p.minorTickLength;
              x1 = tx + tw;
              break;
            case "auto":
            default:
              x0 = tx + tw;
              x1 = tx + tw + p.minorTickLength;
              break;
          }
          return <line key={key} x1={x0 + p.minorTickOffsetX} y1={y + p.minorTickOffsetY} x2={x1 + p.minorTickOffsetX} y2={y + p.minorTickOffsetY} stroke={p.minorTickColor} strokeWidth={p.minorTickWidth} opacity={0.85} />;
        })}

      {p.showValueText && (
        <text
          x={valueTextPos.x + p.valueOffsetX}
          y={valueTextPos.y + p.valueOffsetY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={p.valueColor}
          fontSize={p.valueFontSize}
          fontWeight={p.valueFontWeight}
        >
          {valueString}
        </text>
      )}
    </>
  );
}
