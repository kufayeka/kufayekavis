"use client";

import { useEffect, useMemo } from "react";
import { createDesignerHost } from "../../designer/core/host";
import { useDesignerEngine } from "../../designer/ui/hooks/useDesignerEngine";
import { DesignerHostProvider } from "../../designer/ui/hooks/useDesignerHost";
import { SvgCanvas } from "../../designer/ui/components/SvgCanvas";
import { numericDisplayElementDefinition } from "../../elements/numericDisplay/numericDisplay.definition";
import { webEmbedElementDefinition } from "../../elements/webEmbed/webEmbed.definition";

export default function OnlinePage() {
  const host = useMemo(() => createDesignerHost(), []);
  const engine = host.engine;
  const { state } = useDesignerEngine(engine);

  useEffect(() => {
    // Force view-only behavior (no selection/move/resize/delete) and hide grid.
    engine.setViewMode(true);
    engine.clearSelection();
    engine.setTool("select");

    // Register built-in custom elements so they render correctly.
    const disposers: Array<() => void> = [];
    disposers.push(host.elements.register(numericDisplayElementDefinition));
    disposers.push(host.elements.register(webEmbedElementDefinition));

    // Restore the last autosaved project (if any).
    const storageKey = "kufayekavis.designer.project.v1";
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved && saved.trim()) {
        engine.importProjectJson(saved);
        engine.setViewMode(true);
        engine.clearSelection();
      }
    } catch {
      // ignore
    }

    return () => {
      for (const d of disposers) {
        try {
          d();
        } catch {
          // ignore
        }
      }
    };
  }, [engine, host]);

  return (
    <DesignerHostProvider host={host}>
      <div className="h-screen w-screen">
        <SvgCanvas engine={engine} state={state} />
      </div>
    </DesignerHostProvider>
  );
}
