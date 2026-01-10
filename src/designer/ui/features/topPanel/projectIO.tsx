"use client";

import { useRef } from "react";
import { Button } from "@mui/material";
import type { DesignerEngine, DesignerState } from "../../../core/engine";
import type { DesignerHost } from "../../../core/host";
import { exportProjectToSvgString } from "../../components/ribbon/exportSvg";
import { downloadSvg, downloadText } from "../utils/download";

function ImportJsonButton({ engine }: { engine: DesignerEngine }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <Button onClick={() => inputRef.current?.click()}>
        Import JSON
      </Button>
      <input
        title="importProject"
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          engine.importProjectJson(text);
          e.target.value = "";
        }}
      />
    </>
  );
}

type RibbonCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  host: DesignerHost;
};

export function registerTopPanelProjectIO(opts: { host: DesignerHost; engine: DesignerEngine }): Array<() => void> {
  const { host, engine } = opts;
  const disposers: Array<() => void> = [];

  disposers.push(
    host.registry.registerTopRibbonItem({
      kind: "render",
      id: "builtin.project.importJson",
      placement: "left",
      order: 10,
      render: (ctxUnknown: unknown) => {
        const { engine } = ctxUnknown as RibbonCtx;
        return <ImportJsonButton engine={engine} />;
      },
    }),
  );

  disposers.push(
    host.registry.registerTopRibbonItem({
      kind: "button",
      id: "builtin.project.exportJson",
      placement: "left",
      order: 20,
      label: "Export JSON",
      onClick: () => downloadText("project.json", engine.exportProjectJson()),
    }),
  );

  disposers.push(
    host.registry.registerTopRibbonItem({
      kind: "button",
      id: "builtin.project.exportSvg",
      placement: "left",
      order: 30,
      label: "Export SVG",
      onClick: () => {
        const svg = exportProjectToSvgString({
          engine: host.engine,
          api: host.api,
          host,
          document: host.engine.getState().doc,
        });
        downloadSvg("project.svg", svg);
      },
    }),
  );

  disposers.push(
    host.registry.registerTopRibbonItem({
      kind: "button",
      id: "builtin.project.publishOnline",
      placement: "left",
      order: 40,
      label: "Publish Online",
      onClick: () => {
        void (async () => {
          try {
            const jsonText = engine.exportProjectJson();
            const res = await fetch("/api/onlineProjects", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ jsonText }),
            });
            const data = (await res.json().catch(() => null)) as unknown;
            if (!data || typeof data !== "object") throw new Error("Invalid response");
            const rec = data as Record<string, unknown>;
            if (!rec.ok) throw new Error(typeof rec.error === "string" ? rec.error : "Publish failed");
            const viewerUrl = typeof rec.viewerUrl === "string" ? rec.viewerUrl : "";
            if (!viewerUrl) throw new Error("Missing viewerUrl");

            const absolute = `${window.location.origin}${viewerUrl}`;

            try {
              await navigator.clipboard.writeText(absolute);
            } catch {
              // ignore clipboard errors (e.g. non-secure context)
            }

            try {
              window.open(absolute, "_blank", "noopener,noreferrer");
            } catch {
              // ignore popup blockers
            }

            // Always show the URL for manual copy.
            window.prompt("Online viewer URL (copied if possible):", absolute);
          } catch (e) {
            window.alert(e instanceof Error ? e.message : "Failed to publish online");
          }
        })();
      },
    }),
  );

  return disposers;
}
