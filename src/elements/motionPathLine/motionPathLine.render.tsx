"use client";

import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

import type { CustomElement } from "../../designer/core/types";
import { coerceMotionPathLineProps } from "./motionPathLine.model";

export function renderMotionPathLine(ctxUnknown: unknown): React.ReactNode {
  const ctx = ctxUnknown as {
    element: CustomElement;
    engine?: {
      getState?: () => { viewMode?: boolean };
    };
  };
  const el = ctx.element;
  const isOnline = ctx.engine?.getState?.()?.viewMode ?? false;
  return <MotionPathLineInner el={el} isOnline={isOnline} />;
}

function MotionPathLineInner({ el, isOnline }: { el: CustomElement; isOnline: boolean }) {
  const p = coerceMotionPathLineProps(el.props);

  const pathRef = useRef<SVGPathElement | null>(null);
  const particleRefs = useRef<Array<SVGElement | null>>([]);
  const tickerFnRef = useRef<(() => void) | null>(null);

  const d = `M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}`;

  const lineLength = useMemo(() => {
    const dx = p.x2 - p.x1;
    const dy = p.y2 - p.y1;
    return Math.max(1, Math.hypot(dx, dy));
  }, [p.x1, p.y1, p.x2, p.y2]);

  const particleCount = useMemo(() => {
    if (p.particlePlacement === "single") return 1;
    // Interpret gap as empty spacing BETWEEN particles; center-to-center step becomes (size + gap).
    const stepPx = Math.max(1, p.particleSize + Math.max(0, p.particleGap));
    // Use rounding to avoid a big "remainder" segment that looks like particle grouping.
    // Actual pixel spacing becomes (totalLength / n), which stays uniform.
    const n = Math.round(lineLength / stepPx);
    // Safety clamp to avoid creating thousands of nodes.
    return Math.max(1, Math.min(80, n));
  }, [p.particlePlacement, p.particleGap, p.particleSize, lineLength]);

  useEffect(() => {
    // Cleanup previous ticker update
    if (tickerFnRef.current) {
      gsap.ticker.remove(tickerFnRef.current);
      tickerFnRef.current = null;
    }

    const path = pathRef.current;
    if (!path) return;

    // Ensure we have exactly particleCount refs slots
    particleRefs.current = particleRefs.current.slice(0, particleCount);

    const nodes = particleRefs.current.filter(Boolean) as SVGElement[];
    if (nodes.length === 0) return;

    const duration = p.particlePlacement === "single"
      ? Math.max(0.05, lineLength / Math.max(0.1, p.particleSpeed)) // pixel per second for single particle
      : Math.max(0.05, p.particleSpeed); // seconds per traversal for along path

    let totalLength = 1;
    try {
      totalLength = Math.max(1, path.getTotalLength());
    } catch {
      totalLength = 1;
    }

    const forward = p.particleDirection !== "reverse";
    // IMPORTANT: Keep gaps uniform by distributing particles evenly along [0..1).
    // Gap input only controls how many particles we choose to place.
    const stepProgress = p.particlePlacement === "along" && nodes.length > 0 ? 1 / nodes.length : 0;

    const setParticleAtProgress = (node: SVGElement, progress01: number) => {
      const t = ((progress01 % 1) + 1) % 1;
      const along = forward ? t : 1 - t;
      const dist = along * totalLength;
      const pt = path.getPointAtLength(dist);
      node.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
    };

    // Always place particles initially
    nodes.forEach((node, i) => {
      const offset = stepProgress > 0 ? i * stepProgress : 0;
      setParticleAtProgress(node, offset);
    });

    // If animate disabled and not online: stop here.
    if (!p.animate && !isOnline) {
      return;
    }

    const startTime = gsap.ticker.time;
    const tick = () => {
      const now = gsap.ticker.time;
      const base = ((now - startTime) / duration) % 1;
      for (let i = 0; i < nodes.length; i++) {
        const offset = stepProgress > 0 ? i * stepProgress : 0;
        setParticleAtProgress(nodes[i], base + offset);
      }
    };

    tickerFnRef.current = tick;
    gsap.ticker.add(tick);
    tick();

    return () => {
      if (tickerFnRef.current) {
        gsap.ticker.remove(tickerFnRef.current);
        tickerFnRef.current = null;
      }
    };
  }, [
    d,
    p.animate,
    p.particlePlacement,
    p.particleGap,
    p.particleDirection,
    p.particleSpeed,
    p.particleShape,
    p.particleSize,
    p.particleColor,
    p.particleOpacity,
    isOnline,
    particleCount,
    lineLength,
  ]);

  return (
    <>
      <path ref={pathRef} d={d} fill="none" stroke={p.lineColor} strokeWidth={p.lineThickness} opacity={p.lineOpacity} />

      {Array.from({ length: particleCount }).map((_, i) => {
        const key = `particle-${i}`;
        const half = p.particleSize / 2;

        // Render particle centered at (x1,y1). MotionPathPlugin will translate it along the path.
        return (
          <g
            key={key}
            ref={(node) => {
              particleRefs.current[i] = node;
            }}
            opacity={p.particleOpacity}
          >
            {p.particleShape === "rect" ? (
              <rect x={-half} y={-half} width={p.particleSize} height={p.particleSize} rx={0} fill={p.particleColor} />
            ) : (
              <circle cx={0} cy={0} r={half} fill={p.particleColor} />
            )}
          </g>
        );
      })}
    </>
  );
}
