"use client";

import { useRef } from "react";
import { Button } from "@mui/material";
import type { DesignerEngine, DesignerState } from "../../../core/engine";
import type { DesignerHost } from "../../../core/host";
import { exportProjectToSvgString } from "../../components/ribbon/exportSvg";
import { downloadSvg, downloadText } from "../utils/download";

function buildPublishJsonText(rawJsonText: string): string {
  try {
    const parsed = JSON.parse(rawJsonText) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return rawJsonText;
    const doc = parsed as Record<string, unknown>;

    // Online publish is for viewing; remove undo history (can be huge).
    if (doc.history && typeof doc.history === "object" && !Array.isArray(doc.history)) {
      const hist = doc.history as Record<string, unknown>;
      hist.past = [];
      hist.future = [];
      doc.history = hist;
    }

    // Background removal stores `originalHref` which can duplicate large data URLs.
    if (doc.elements && typeof doc.elements === "object" && !Array.isArray(doc.elements)) {
      const els = doc.elements as Record<string, unknown>;
      for (const key of Object.keys(els)) {
        const el = els[key];
        if (!el || typeof el !== "object" || Array.isArray(el)) continue;
        const rec = el as Record<string, unknown>;
        if (typeof rec.originalHref === "string") delete rec.originalHref;
      }
      doc.elements = els;
    }

    return JSON.stringify(doc);
  } catch {
    return rawJsonText;
  }
}

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
            const jsonText = buildPublishJsonText(engine.exportProjectJson());
            const res = await fetch("/api/onlineProjects", {
              method: "POST",
              headers: { "content-type": "text/plain; charset=utf-8" },
              body: jsonText,
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
