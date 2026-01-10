"use client";

import type { ToolType } from "../../core/types";
import { useDesignerHost } from "../hooks/useDesignerHost";
import { useSyncExternalStore } from "react";
import clsx from "clsx";
import { Button } from "@mui/material";

const tools: Array<{ tool: ToolType; label: string; draggable?: boolean; dragId?: string }> = [
  { tool: "select", label: "Select", draggable: false },
  { tool: "free", label: "Free Draw", draggable: false },
];

export function PalettePanel({
  activeTool,
  onToolChange,
}: {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}) {
  const host = useDesignerHost();
  const elementItems = useSyncExternalStore(
    (listener) => host.elements.subscribe(listener),
    () => host.elements.getPaletteItems(),
    () => host.elements.getPaletteItems(),
  );

  // Free Draw is a tool (not a placeable palette element). If any plugin/registry
  // ever exposes it as a palette item, hide it to avoid showing it twice.
  const visibleElementItems = elementItems.filter((it) => it.id !== "free");

  return (
    <div>
      <div className="text-xs text-black/60 leading-5">
        Drag tool → canvas to place. Image: you can also drag an image file from OS → canvas.
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tools.map((t) => (
          <Button
            key={t.tool}
            variant={activeTool === t.tool ? "contained" : "outlined"}
            className={clsx("justify-start")}
            onClick={() => onToolChange(t.tool)}
            draggable={Boolean(t.draggable)}
            onDragStart={(e) => {
              if (!t.draggable) return;
              e.dataTransfer.setData("application/x-designer-palette", t.dragId ?? String(t.tool));
              e.dataTransfer.effectAllowed = "copy";
            }}
          >
            {t.label}
          </Button>
        ))}

        {visibleElementItems.map((it) => (
          <Button
            key={it.id}
            variant={activeTool === it.id ? "contained" : "outlined"}
            className={clsx("justify-start")}
            onClick={() => onToolChange(it.id)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-designer-palette", it.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
          >
            {it.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
