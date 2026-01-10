"use client";

import { useEffect, useMemo, useState } from "react";
import { createDesignerHost } from "../../designer/core/host";
import { useDesignerEngine } from "../../designer/ui/hooks/useDesignerEngine";
import { DesignerHostProvider } from "../../designer/ui/hooks/useDesignerHost";
import { SvgCanvas } from "../../designer/ui/components/SvgCanvas";
import { DialogHost } from "../../designer/ui/components/DialogHost";
import { PopupHost } from "../../designer/ui/components/PopupHost";
import { builtInElementPlugins } from "../../designer/plugins/builtinPlugins";
import { mqttScadaPlugin } from "../../designer/plugins/mqttScadaPlugin";

async function fetchOnlineProjectJsonText(id: string): Promise<string> {
  const res = await fetch(`/api/onlineProjects/${encodeURIComponent(id)}`, { cache: "no-store" });
  const data = (await res.json().catch(() => null)) as unknown;
  if (!data || typeof data !== "object") throw new Error("Invalid response");

  const rec = data as Record<string, unknown>;
  if (!rec.ok) throw new Error(typeof rec.error === "string" ? rec.error : "Failed to load");
  if (typeof rec.jsonText !== "string") throw new Error("Missing jsonText");
  return rec.jsonText;
}

export function OnlineViewer({ projectId }: { projectId: string }) {
  const host = useMemo(() => createDesignerHost(), []);
  const engine = host.engine;
  const { state } = useDesignerEngine(engine);

  const [status, setStatus] = useState<{ kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string }>({
    kind: "loading",
  });

  useEffect(() => {
    // Force view-only behavior.
    engine.setViewMode(true);
    engine.clearSelection();
    engine.setTool("select");

    // Register built-in elements + MQTT plugin.
    const disposers: Array<() => void> = [];
    for (const p of builtInElementPlugins) disposers.push(host.plugins.register(p));
    disposers.push(host.plugins.register(mqttScadaPlugin));
    host.plugins.activateAll({ api: host.api, registry: host.registry, elements: host.elements, host, engine });

    let alive = true;

    void (async () => {
      try {
        const jsonText = await fetchOnlineProjectJsonText(projectId);
        if (!alive) return;
        engine.importProjectJson(jsonText);
        engine.setViewMode(true);
        engine.clearSelection();
        setStatus({ kind: "ready" });
      } catch (e) {
        if (!alive) return;
        setStatus({ kind: "error", message: e instanceof Error ? e.message : "Failed to load project" });
      }
    })();

    return () => {
      alive = false;
      for (const d of disposers) {
        try {
          d();
        } catch {
          // ignore
        }
      }
    };
  }, [engine, host, projectId]);

  return (
    <DesignerHostProvider host={host}>
      <div className="h-screen w-screen relative">
        {status.kind === "error" && (
          <div className="absolute top-4 left-4 z-50 rounded border border-black/15 bg-white/90 px-3 py-2 text-sm">
            <div className="font-medium">Online viewer error</div>
            <div className="text-black/70">{status.message}</div>
          </div>
        )}
        <SvgCanvas engine={engine} state={state} />
        <DialogHost engine={engine} state={state} />
        <PopupHost engine={engine} state={state} />
      </div>
    </DesignerHostProvider>
  );
}
