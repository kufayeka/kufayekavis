"use client";

import { Button } from "@mui/material";
import type { DesignerEngine, DesignerState } from "../../../core/engine";
import type { DesignerHost } from "../../../core/host";

type RibbonCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  host: DesignerHost;
};

function simpleAction(
  host: DesignerHost,
  id: string,
  order: number,
  label: string,
  onClick: (ctx: RibbonCtx) => void,
  disabled?: (ctx: RibbonCtx) => boolean,
) {
  return host.registry.registerTopRibbonItem({
    kind: "render",
    id,
    placement: "right",
    order,
    render: (ctxUnknown: unknown) => {
      const ctx = ctxUnknown as RibbonCtx;
      return (
        <Button onClick={() => onClick(ctx)} disabled={disabled ? disabled(ctx) : false}>
          {label}
        </Button>
      );
    },
  });
}

export function registerTopPanelEditActions(opts: { host: DesignerHost }): Array<() => void> {
  const { host } = opts;
  const disposers: Array<() => void> = [];

  // Tools
  disposers.push(
    simpleAction(host, "builtin.tool.magnifier", 15, "Magnifier", ({ engine }) => engine.setTool("magnifier")),
  );

  // Panel toggles (so canvas can be free while using tools)
  disposers.push(
    host.registry.registerTopRibbonItem({
      kind: "render",
      id: "builtin.ui.focusCanvas",
      placement: "right",
      order: 11,
      render: () => {
        const layout = host.registry.getUiLayout();
        return (
          <Button onClick={() => host.registry.toggleFocusCanvas()} title="Focus canvas (hide both panels)">
            {layout.focusCanvas ? "Exit Focus" : "Focus Canvas"}
          </Button>
        );
      },
    }),
  );

  disposers.push(
    host.registry.registerTopRibbonItem({
      kind: "render",
      id: "builtin.ui.toggleLeftPanel",
      placement: "right",
      order: 12,
      render: () => {
        const layout = host.registry.getUiLayout();
        return (
          <Button onClick={() => host.registry.toggleLeftPanel()} title="Toggle Left Panel">
            {layout.leftPanelVisible ? "Hide Left" : "Show Left"}
          </Button>
        );
      },
    }),
  );

  disposers.push(
    host.registry.registerTopRibbonItem({
      kind: "render",
      id: "builtin.ui.toggleRightPanel",
      placement: "right",
      order: 13,
      render: () => {
        const layout = host.registry.getUiLayout();
        return (
          <Button onClick={() => host.registry.toggleRightPanel()} title="Toggle Right Panel">
            {layout.rightPanelVisible ? "Hide Right" : "Show Right"}
          </Button>
        );
      },
    }),
  );

  disposers.push(simpleAction(host, "builtin.edit.copy", 20, "Copy", ({ engine }) => engine.copySelection()));
  disposers.push(simpleAction(host, "builtin.edit.paste", 30, "Paste", ({ engine }) => engine.pasteClipboard()));
  disposers.push(simpleAction(host, "builtin.edit.duplicate", 40, "Duplicate", ({ engine }) => engine.duplicateSelection()));

  disposers.push(
    simpleAction(
      host,
      "builtin.edit.group",
      50,
      "Group",
      ({ engine }) => engine.groupSelection(),
      ({ state }) => state.selection.ids.length < 2,
    ),
  );

  disposers.push(
    simpleAction(
      host,
      "builtin.edit.ungroup",
      60,
      "Ungroup",
      ({ engine }) => engine.ungroupSelection(),
      ({ state }) => !state.selection.ids.some((id) => state.doc.elements[id]?.type === "group"),
    ),
  );

  disposers.push(
    simpleAction(
      host,
      "builtin.edit.erase",
      70,
      "Erase",
      ({ engine, state }) => engine.deleteElements(state.selection.ids),
      ({ state }) => state.selection.ids.length === 0,
    ),
  );

  return disposers;
}
