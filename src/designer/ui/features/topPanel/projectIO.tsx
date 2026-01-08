"use client";

import { useRef } from "react";
import type { DesignerEngine, DesignerState } from "../../../core/engine";
import type { DesignerHost } from "../../../core/host";
import { exportProjectToSvgString } from "../../components/ribbon/exportSvg";
import { downloadSvg, downloadText } from "../utils/download";

function ImportJsonButton({ engine }: { engine: DesignerEngine }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <button
        className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
        onClick={() => inputRef.current?.click()}
      >
        Import JSON
      </button>
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

  return disposers;
}
