import type { CustomElement } from "../../designer/core/types";

export const GAUGE_KIND = "gauge" as const;

export type GaugeNeedleType = "simple" | "arrow" | "circle";
export type GaugeValuePosition = "center" | "bottom";
export type GaugeFitMode = "contain" | "stretch";

export type GaugeZone = {
  from: number;
  to: number;
  color: string;
};

export type GaugeProps = {
  // Data
  value: number;
  min: number;
  max: number;

  // use-gauge inputs
  startAngle: number;
  endAngle: number;
  numTicks: number;
  diameter: number;

  // Layout / sizing
  fitMode: GaugeFitMode;
  padding: number;

  // Arc
  backgroundColor: string;
  trackColor: string;
  fillColor: string;
  arcWidth: number;

  // Zones
  zones: GaugeZone[];
  zonesCode: string;
  zonesOpacity: number;
  zoneArcWidth: number;
  zoneArcGap: number;

  // Ticks + labels
  showTicks: boolean;
  tickColor: string;
  tickLength: number;
  tickWidth: number;

  // Minor ticks (between major ticks)
  showMinorTicks: boolean;
  minorTicksPerInterval: number; // per major interval
  minorTickColor: string;
  minorTickLength: number;
  minorTickWidth: number;

  showLabels: boolean;
  labelColor: string;
  labelFontSize: number;
  labelOffset: number;
  labelDecimals: number;

  // Needle
  showNeedle: boolean;
  needleType: GaugeNeedleType;
  needleColor: string;
  needleLengthRatio: number; // 0..1
  needleWidth: number;
  needleBaseRadius: number;
  needleTipRadius: number;

  // Value text
  showValueText: boolean;
  valuePosition: GaugeValuePosition;
  valueColor: string;
  valueFontSize: number;
  valueFontWeight: number;
  valueDecimals: number;
  valuePrefix: string;
  valueSuffix: string;

  // Animation (GSAP)
  animate: boolean;
  animateArc: boolean;
  animateNeedle: boolean;
  animateValueText: boolean;
  animationDuration: number;
  animationEase: string;
};

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== "string") return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeZones(zones: unknown, domainMin: number, domainMax: number): GaugeZone[] {
  if (!Array.isArray(zones)) return [];
  const out: GaugeZone[] = [];
  for (const z of zones) {
    if (!isRecord(z)) continue;
    const from = num(z["from"], NaN);
    const to = num(z["to"], NaN);
    const color = str(z["color"], "");
    if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
    if (!color) continue;

    const a = clamp(Math.min(from, to), domainMin, domainMax);
    const b = clamp(Math.max(from, to), domainMin, domainMax);
    if (a === b) continue;
    out.push({ from: a, to: b, color });
  }
  out.sort((a, b) => a.from - b.from || a.to - b.to);
  return out;
}

export function coerceGaugeProps(raw: Record<string, unknown> | undefined, el?: Pick<CustomElement, "width" | "height">): GaugeProps {
  const props = raw ?? {};

  const min = num(props.min, 0);
  const max = num(props.max, 100);
  const domainMin = Math.min(min, max);
  const domainMax = Math.max(min, max);

  const fallbackDiameter = Math.max(20, Math.floor(Math.min(el?.width ?? 160, el?.height ?? 160)));

  const diameter = Math.max(20, num(props.diameter, fallbackDiameter));
  const startAngle = num(props.startAngle, 90);
  const endAngle = num(props.endAngle, 270);
  const numTicks = clamp(Math.floor(num(props.numTicks, 5)), 2, 50);
  const value = clamp(num(props.value, domainMin), domainMin, domainMax);

  const arcWidth = clamp(num(props.arcWidth, 24), 1, 200);

  const zonesOpacity = clamp(num(props.zonesOpacity, 1), 0, 1);
  const zoneArcWidth = clamp(num(props.zoneArcWidth, Math.max(2, arcWidth * 0.5)), 1, 200);
  const zoneArcGap = clamp(num(props.zoneArcGap, 4), 0, 200);
  const zonesCode = str(props.zonesCode, "");
  const zonesFromCode = zonesCode.trim() ? normalizeZones(safeJsonParse(zonesCode), domainMin, domainMax) : [];
  const zonesFromObj = normalizeZones(props["zones"], domainMin, domainMax);
  const zones = zonesFromCode.length > 0 ? zonesFromCode : zonesFromObj;
  const normalizedZonesCode = zonesCode.trim()
    ? zonesCode
    : zonesFromObj.length > 0
      ? JSON.stringify(zonesFromObj, null, 2)
      : "[]";

  const labelFontSize = clamp(num(props.labelFontSize, 10), 6, 64);
  const labelOffset = clamp(num(props.labelOffset, 20), 0, 200);
  const labelDecimals = clamp(Math.floor(num(props.labelDecimals, 0)), 0, 10);

  const tickLength = clamp(num(props.tickLength, 8), 0, 200);
  const tickWidth = clamp(num(props.tickWidth, 2), 0.5, 50);

  const showMinorTicks = bool(props.showMinorTicks, false);
  const minorTicksPerInterval = clamp(Math.floor(num(props.minorTicksPerInterval, 4)), 1, 20);
  const minorTickLength = clamp(num(props.minorTickLength, Math.max(1, tickLength * 0.55)), 0, 200);
  const minorTickWidth = clamp(num(props.minorTickWidth, Math.max(0.5, tickWidth * 0.6)), 0.25, 50);

  const needleBaseRadius = clamp(num(props.needleBaseRadius, 12), 0, 200);
  const needleTipRadius = clamp(num(props.needleTipRadius, 8), 0, 200);

  const valueFontSize = clamp(num(props.valueFontSize, 18), 6, 200);
  const valueFontWeight = clamp(Math.floor(num(props.valueFontWeight, 700)), 100, 900);
  const valueDecimals = clamp(Math.floor(num(props.valueDecimals, 0)), 0, 10);

  const fitMode = oneOf(props.fitMode, ["contain", "stretch"] as const, "contain");
  const padding = clamp(num(props.padding, 0), 0, 200);

  const needleType = oneOf(props.needleType, ["simple", "arrow", "circle"] as const, "simple");
  const needleLengthRatio = clamp(num(props.needleLengthRatio, 0.9), 0, 1);
  const needleWidth = clamp(num(props.needleWidth, Math.max(1, arcWidth / 6)), 0.5, 100);

  const valuePosition = oneOf(props.valuePosition, ["center", "bottom"] as const, "center");

  const animationDuration = clamp(num(props.animationDuration, 0.5), 0, 10);
  const animationEase = str(props.animationEase, "power2.out");

  return {
    value,
    min: domainMin,
    max: domainMax,

    startAngle,
    endAngle,
    numTicks,
    diameter,

    fitMode,
    padding,

    backgroundColor: str(props.backgroundColor, "transparent"),
    trackColor: str(props.trackColor, "color-mix(in_srgb,var(--foreground)_20%,transparent)"),
    fillColor: str(props.fillColor, "var(--foreground)"),
    arcWidth,

    zones,
    zonesCode: normalizedZonesCode,
    zonesOpacity,
    zoneArcWidth,
    zoneArcGap,

    showTicks: bool(props.showTicks, true),
    tickColor: str(props.tickColor, "var(--foreground)"),
    tickLength,
    tickWidth,

    showMinorTicks,
    minorTicksPerInterval,
    minorTickColor: str(props.minorTickColor, str(props.tickColor, "var(--foreground)")),
    minorTickLength,
    minorTickWidth,

    showLabels: bool(props.showLabels, true),
    labelColor: str(props.labelColor, "var(--foreground)"),
    labelFontSize,
    labelOffset,
    labelDecimals,

    showNeedle: bool(props.showNeedle, true),
    needleType,
    needleColor: str(props.needleColor, "var(--foreground)"),
    needleLengthRatio,
    needleWidth,
    needleBaseRadius,
    needleTipRadius,

    showValueText: bool(props.showValueText, true),
    valuePosition,
    valueColor: str(props.valueColor, "var(--foreground)"),
    valueFontSize,
    valueFontWeight,
    valueDecimals,
    valuePrefix: str(props.valuePrefix, ""),
    valueSuffix: str(props.valueSuffix, ""),

    animate: bool(props.animate, true),
    animateArc: bool(props.animateArc, true),
    animateNeedle: bool(props.animateNeedle, true),
    animateValueText: bool(props.animateValueText, false),
    animationDuration,
    animationEase,
  };
}
