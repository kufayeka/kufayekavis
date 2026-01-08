"use client";

import type React from "react";
import { useRef } from "react";
import type { DesignerEngine, DesignerState } from "../../../core/engine";
import type { DesignerHost } from "../../../core/host";
import type { DesignerAPI } from "../../../core/api";
import type { ToolType } from "../../../core/types";
import type { LeftPanelCtx } from "../LeftPanel";
import { PalettePanel } from "../PalettePanel";
import { PropertiesPanel } from "../PropertiesPanel";
import { exportProjectToSvgString } from "../ribbon/exportSvg";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(filename: string, text: string, mime = "application/json") {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

function downloadSvg(filename: string, svg: string) {
  downloadBlob(filename, new Blob([svg], { type: "image/svg+xml" }));
}

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
  api: DesignerAPI;
  host: DesignerHost;
};

export function registerBuiltInUiContributions(opts: {
  host: DesignerHost;
  engine: DesignerEngine;
}): Array<() => void> {
  const { host, engine } = opts;
  const disposers: Array<() => void> = [];

  // ---- Top ribbon (left) ----
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

  // ---- Top ribbon (right) ----
  disposers.push(
    host.registry.registerTopRibbonItem({
      kind: "render",
      id: "builtin.mode.toggleView",
      placement: "right",
      order: 10,
      render: (ctxUnknown: unknown) => {
        const { engine, state } = ctxUnknown as RibbonCtx;
        return (
          <button
            className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
            onClick={() => engine.setViewMode(!state.viewMode)}
          >
            {state.viewMode ? "Edit Mode" : "View Mode"}
          </button>
        );
      },
    }),
  );

  const simpleAction = (
    id: string,
    order: number,
    label: string,
    onClick: (ctx: RibbonCtx) => void,
    disabled?: (ctx: RibbonCtx) => boolean,
  ) =>
    host.registry.registerTopRibbonItem({
      kind: "render",
      id,
      placement: "right",
      order,
      render: (ctxUnknown: unknown) => {
        const ctx = ctxUnknown as RibbonCtx;
        return (
          <button
            className="px-3 py-1.5 rounded border border-black/15 hover:bg-black/5"
            onClick={() => onClick(ctx)}
            disabled={disabled ? disabled(ctx) : false}
          >
            {label}
          </button>
        );
      },
    });

  disposers.push(simpleAction("builtin.edit.copy", 20, "Copy", ({ engine }) => engine.copySelection()));
  disposers.push(simpleAction("builtin.edit.paste", 30, "Paste", ({ engine }) => engine.pasteClipboard()));
  disposers.push(simpleAction("builtin.edit.duplicate", 40, "Duplicate", ({ engine }) => engine.duplicateSelection()));

  disposers.push(
    simpleAction(
      "builtin.edit.group",
      50,
      "Group",
      ({ engine }) => engine.groupSelection(),
      ({ state }) => state.selection.ids.length < 2,
    ),
  );

  disposers.push(
    simpleAction(
      "builtin.edit.ungroup",
      60,
      "Ungroup",
      ({ engine }) => engine.ungroupSelection(),
      ({ state }) => !state.selection.ids.some((id) => state.doc.elements[id]?.type === "group"),
    ),
  );

  disposers.push(
    simpleAction(
      "builtin.edit.erase",
      70,
      "Erase",
      ({ engine, state }) => engine.deleteElements(state.selection.ids),
      ({ state }) => state.selection.ids.length === 0,
    ),
  );

  // ---- Left panel sections ----
  disposers.push(
    host.registry.registerLeftPanelSection({
      id: "builtin.left.palette",
      title: "Palette",
      order: 10,
      render: (ctxUnknown: unknown) => {
        const ctx = ctxUnknown as LeftPanelCtx;
        return (
          <PalettePanel
            activeTool={ctx.state.tool}
            onToolChange={(t: ToolType) => ctx.setTool(t)}
          />
        );
      },
    }),
  );

  disposers.push(
    host.registry.registerLeftPanelSection({
      id: "builtin.left.properties",
      title: "Properties",
      order: 20,
      when: (ctxUnknown: unknown) => {
        const ctx = ctxUnknown as LeftPanelCtx;
        return !ctx.state.viewMode;
      },
      render: (ctxUnknown: unknown) => {
        const ctx = ctxUnknown as LeftPanelCtx;
        return <PropertiesPanel engine={ctx.engine} state={ctx.state} />;
      },
    }),
  );

  // NOTE: Bottom bar has no default items; plugins can register items.

  return disposers;
}
