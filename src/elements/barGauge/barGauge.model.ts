import type { CustomElement } from "../../designer/core/types";

export const BAR_GAUGE_KIND = "barGauge" as const;

export type BarGaugeOrientation = "horizontal" | "vertical";
export type BarGaugeDirection = "forward" | "reverse";
export type BarGaugeValuePosition = "top-outside" | "below-outside" | "inside-center" | "inside-top" | "inside-bottom";
export type BarGaugeTickPosition = "auto" | "start" | "end" | "outside";
export type BarGaugeZonePosition = "auto" | "start" | "end" | "center";

export type BarGaugeZone = {
  from: number;
  to: number;
  color: string;
};

export type BarGaugeProps = {
  value: number;
  min: number;
  max: number;

  orientation: BarGaugeOrientation;
  direction: BarGaugeDirection;
  padding: number;
  borderRadius: number;

  backgroundColor: string;
  trackColor: string;
  fillColor: string;
  trackRadius: number;
  trackStrokeColor: string;
  trackStrokeWidth: number;
  fillBorderRadius: number;

  // Zones
  zones: BarGaugeZone[];
  zonesCode: string;
  zonesOpacity: number;
  zoneThickness: number;
  zonePosition: BarGaugeZonePosition;
  zoneOffsetX: number;
  zoneOffsetY: number;
  zoneBorderRadius: number;

  // Ticks + labels
  showTicks: boolean;
  numTicks: number;
  tickColor: string;
  tickLength: number;
  tickWidth: number;
  tickPosition: BarGaugeTickPosition;
  tickOffsetX: number;
  tickOffsetY: number;

  // Minor ticks (between major ticks)
  showMinorTicks: boolean;
  minorTicksPerInterval: number;
  minorTickColor: string;
  minorTickLength: number;
  minorTickWidth: number;
  minorTickPosition: BarGaugeTickPosition;
  minorTickOffsetX: number;
  minorTickOffsetY: number;

  showLabels: boolean;
  labelColor: string;
  labelFontSize: number;
  labelOffset: number;
  labelDecimals: number;
  labelOffsetX: number;
  labelOffsetY: number;

  showValueText: boolean;
  valuePosition: BarGaugeValuePosition;
  valueColor: string;
  valueFontSize: number;
  valueFontWeight: number;
  valueDecimals: number;
  valuePrefix: string;
  valueSuffix: string;
  valueOffsetX: number;
  valueOffsetY: number;

  animate: boolean;
  animateFill: boolean;
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

function normalizeZones(zones: unknown, domainMin: number, domainMax: number): BarGaugeZone[] {
  if (!Array.isArray(zones)) return [];
  const out: BarGaugeZone[] = [];
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

export function coerceBarGaugeProps(raw: Record<string, unknown> | undefined, el?: Pick<CustomElement, "width" | "height">): BarGaugeProps {
  const props = raw ?? {};

  const min = num(props.min, 0);
  const max = num(props.max, 100);
  const domainMin = Math.min(min, max);
  const domainMax = Math.max(min, max);

  const value = clamp(num(props.value, domainMin), domainMin, domainMax);

  const orientation = oneOf(props.orientation, ["horizontal", "vertical"] as const, "horizontal");
  const direction = oneOf(props.direction, ["forward", "reverse"] as const, "forward");

  const defaultPad = 0;
  const padding = clamp(num(props.padding, defaultPad), 0, 200);

  const trackRadius = clamp(num(props.trackRadius, 8), 0, 200);
  const trackStrokeWidth = clamp(num(props.trackStrokeWidth, 0), 0, 50);
  const fillBorderRadius = clamp(num(props.fillBorderRadius, 0), 0, 200);

  const zonesOpacity = clamp(num(props.zonesOpacity, 1), 0, 1);
  const zonesCode = str(props.zonesCode, "");
  const zonesFromCode = zonesCode.trim() ? normalizeZones(safeJsonParse(zonesCode), domainMin, domainMax) : [];
  const zonesFromObj = normalizeZones(props["zones"], domainMin, domainMax);
  const zones = zonesFromCode.length > 0 ? zonesFromCode : zonesFromObj;
  const normalizedZonesCode = zonesCode.trim()
    ? zonesCode
    : zonesFromObj.length > 0
      ? JSON.stringify(zonesFromObj, null, 2)
      : "[]";

  const zoneThickness = clamp(num(props.zoneThickness, Math.max(2, Math.round((el?.height ?? 48) * 0.25))), 1, 400);
  const zoneBorderRadius = clamp(num(props.zoneBorderRadius, 0), 0, 200);

  const numTicks = clamp(Math.floor(num(props.numTicks, 5)), 2, 50);
  const tickLength = clamp(num(props.tickLength, 8), 0, 200);
  const tickWidth = clamp(num(props.tickWidth, 2), 0.5, 50);

  const showMinorTicks = bool(props.showMinorTicks, false);
  const minorTicksPerInterval = clamp(Math.floor(num(props.minorTicksPerInterval, 4)), 1, 20);
  const minorTickLength = clamp(num(props.minorTickLength, Math.max(1, tickLength * 0.55)), 0, 200);
  const minorTickWidth = clamp(num(props.minorTickWidth, Math.max(0.5, tickWidth * 0.6)), 0.25, 50);

  const labelFontSize = clamp(num(props.labelFontSize, 10), 6, 64);
  const labelOffset = clamp(num(props.labelOffset, 10), 0, 200);
  const labelOffsetX = clamp(num(props.labelOffsetX, 0), -200, 200);
  const labelOffsetY = clamp(num(props.labelOffsetY, 0), -200, 200);
  const labelDecimals = clamp(Math.floor(num(props.labelDecimals, 0)), 0, 10);

  const fallbackFont = Math.max(8, Math.min(64, Math.round(Math.min(el?.width ?? 200, el?.height ?? 60) * 0.3)));
  const valueFontSize = clamp(num(props.valueFontSize, fallbackFont), 6, 200);
  const valueFontWeight = clamp(Math.floor(num(props.valueFontWeight, 700)), 100, 900);
  const valueOffsetX = clamp(num(props.valueOffsetX, 0), -200, 200);
  const valueOffsetY = clamp(num(props.valueOffsetY, 0), -200, 200);
  const valueDecimals = clamp(Math.floor(num(props.valueDecimals, 0)), 0, 10);

  const valuePosition = oneOf(props.valuePosition, ["top-outside", "below-outside", "inside-center", "inside-top", "inside-bottom"] as const, "inside-center");

  const tickOffsetX = clamp(num(props.tickOffsetX, 0), -200, 200);
  const tickOffsetY = clamp(num(props.tickOffsetY, 0), -200, 200);
  const minorTickOffsetX = clamp(num(props.minorTickOffsetX, 0), -200, 200);
  const minorTickOffsetY = clamp(num(props.minorTickOffsetY, 0), -200, 200);
  const zoneOffsetX = clamp(num(props.zoneOffsetX, 0), -200, 200);
  const zoneOffsetY = clamp(num(props.zoneOffsetY, 0), -200, 200);

  const borderRadius = clamp(num(props.borderRadius, 0), 0, 200);

  const animationDuration = clamp(num(props.animationDuration, 0.5), 0, 10);
  const animationEase = str(props.animationEase, "power2.out");

  return {
    value,
    min: domainMin,
    max: domainMax,

    orientation,
    direction,
    padding,

    backgroundColor: str(props.backgroundColor, "transparent"),
    trackColor: str(props.trackColor, "color-mix(in_srgb,var(--foreground)_20%,transparent)"),
    fillColor: str(props.fillColor, "var(--foreground)"),
    trackRadius,
    trackStrokeColor: str(props.trackStrokeColor, "transparent"),
    trackStrokeWidth,

    zones,
    zonesCode: normalizedZonesCode,
    zonesOpacity,
    zoneThickness,
    zonePosition: oneOf(props.zonePosition, ["auto", "start", "end", "center"] as const, "auto"),

    showTicks: bool(props.showTicks, true),
    numTicks,
    tickColor: str(props.tickColor, "var(--foreground)"),
    tickLength,
    tickWidth,
    tickPosition: oneOf(props.tickPosition, ["auto", "start", "end", "outside"] as const, "auto"),

    showMinorTicks,
    minorTicksPerInterval,
    minorTickColor: str(props.minorTickColor, str(props.tickColor, "var(--foreground)")),
    minorTickLength,
    minorTickWidth,
    minorTickPosition: oneOf(props.minorTickPosition, ["auto", "start", "end", "outside"] as const, "auto"),

    showLabels: bool(props.showLabels, false),
    labelColor: str(props.labelColor, "var(--foreground)"),
    labelFontSize,
    labelOffset,
    labelOffsetX,
    labelOffsetY,
    labelDecimals,

    showValueText: bool(props.showValueText, true),
    valuePosition,
    valueColor: str(props.valueColor, "var(--foreground)"),
    valueFontSize,
    valueFontWeight,
    valueOffsetX,
    valueOffsetY,
    valueDecimals,
    valuePrefix: str(props.valuePrefix, ""),
    valueSuffix: str(props.valueSuffix, ""),

    tickOffsetX,
    tickOffsetY,
    minorTickOffsetX,
    minorTickOffsetY,
    zoneOffsetX,
    zoneOffsetY,

    borderRadius,
    fillBorderRadius,
    zoneBorderRadius,

    animate: bool(props.animate, true),
    animateFill: bool(props.animateFill, true),
    animateValueText: bool(props.animateValueText, false),
    animationDuration,
    animationEase,
  };
}
