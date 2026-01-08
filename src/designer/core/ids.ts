import type { ElementId } from "./types";

export function createId(prefix: string = "el"): ElementId {
  // Good-enough unique id for client-side designer.
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
