"use client";

import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import { DesignerEngine } from "../../core/engine";

export function useDesignerEngine(engine?: DesignerEngine) {
  const instance = useMemo(() => engine ?? new DesignerEngine(), [engine]);

  const state = useSyncExternalStore(
    (listener) => instance.subscribe(listener),
    () => instance.getState(),
    () => instance.getState(),
  );

  return { engine: instance, state };
}
