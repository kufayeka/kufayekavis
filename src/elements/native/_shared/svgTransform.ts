import type { DesignerElement } from "../../../designer/core/types";

export function getFlipRotateTransform(el: DesignerElement, cx: number, cy: number): string | undefined {
  const parts: string[] = [];
  const meta = el as unknown as { flipH?: boolean; flipV?: boolean };

  if (meta.flipH || meta.flipV) {
    const sx = meta.flipH ? -1 : 1;
    const sy = meta.flipV ? -1 : 1;
    parts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
  }

  if ((el as unknown as { rotation?: number }).rotation) {
    const r = (el as unknown as { rotation: number }).rotation;
    if (r) parts.push(`rotate(${r} ${cx} ${cy})`);
  }

  return parts.length ? parts.join(" ") : undefined;
}
