import type { CustomElement } from "../../designer/core/types";

export const MOTION_PATH_LINE_KIND = "motionPathLine" as const;

export type MotionPathLineDirection = "forward" | "reverse";
export type MotionPathLineParticleShape = "circle" | "rect";
export type MotionPathLineParticlePlacement = "single" | "along";

export type MotionPathLineProps = {
  // Geometry in local SVG coordinates (inside the element's <svg viewBox>)
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  // Line style
  lineColor: string;
  lineOpacity: number;
  lineThickness: number;

  // Particles
  particleSize: number;
  particleShape: MotionPathLineParticleShape;
  particlePlacement: MotionPathLineParticlePlacement;
  particleColor: string;
  particleOpacity: number;
  particleGap: number; // px spacing between particles along the path
  particleDirection: MotionPathLineDirection;
  particleSpeed: number; // seconds per traversal (independent of line length)

  // Animation
  animate: boolean;
};

export function coerceMotionPathLineProps(raw: unknown): MotionPathLineProps {
  const p = (raw ?? {}) as Partial<MotionPathLineProps>;
  const num = (v: unknown, fallback: number) => {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };

  const dir = p.particleDirection === "reverse" ? "reverse" : "forward";
  const shape = p.particleShape === "rect" ? "rect" : "circle";

  // Back-compat: legacy configs might still have particleCount.
  // If no placement provided, infer from particleCount.
  const legacyCountRaw = (raw as { particleCount?: unknown } | null)?.particleCount;
  const legacyCount = Math.max(1, Math.floor(num(legacyCountRaw, 1)));

  const placement: MotionPathLineParticlePlacement =
    p.particlePlacement === "single" || p.particlePlacement === "along"
      ? p.particlePlacement
      : legacyCount >= 2
        ? "along"
        : "single";

  return {
    x1: num(p.x1, 0),
    y1: num(p.y1, 0),
    x2: num(p.x2, 220),
    y2: num(p.y2, 60),

    lineColor: typeof p.lineColor === "string" ? p.lineColor : "var(--foreground)",
    lineOpacity: Math.max(0, Math.min(1, num(p.lineOpacity, 1))),
    lineThickness: Math.max(1, num(p.lineThickness, 3)),

    particleSize: Math.max(1, num(p.particleSize, 8)),
    particleShape: shape,
    particlePlacement: placement,
    particleColor: typeof p.particleColor === "string" ? p.particleColor : "var(--foreground)",
    particleOpacity: Math.max(0, Math.min(1, num(p.particleOpacity, 0.9))),
    particleGap: Math.max(0, num(p.particleGap, 20)),
    particleDirection: dir,
    particleSpeed: Math.max(0.05, num(p.particleSpeed, 5.0)),

    animate: typeof p.animate === "boolean" ? p.animate : true,
  };
}

export function patchMotionPathLineEndpoint(opts: {
  el: CustomElement;
  end: "p1" | "p2";
  nextLocal: { x: number; y: number };
}): { x: number; y: number; width: number; height: number; props: Record<string, unknown> } {
  const props = coerceMotionPathLineProps(opts.el.props);

  let x1 = props.x1;
  let y1 = props.y1;
  let x2 = props.x2;
  let y2 = props.y2;

  if (opts.end === "p1") {
    x1 = opts.nextLocal.x;
    y1 = opts.nextLocal.y;
  } else {
    x2 = opts.nextLocal.x;
    y2 = opts.nextLocal.y;
  }

  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  // Shift origin so endpoints are always non-negative local coords.
  const x = opts.el.x + minX;
  const y = opts.el.y + minY;

  const nextProps: Record<string, unknown> = {
    ...opts.el.props,
    x1: x1 - minX,
    y1: y1 - minY,
    x2: x2 - minX,
    y2: y2 - minY,
  };

  return { x, y, width, height, props: nextProps };
}
