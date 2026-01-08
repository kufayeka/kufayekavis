"use client";

import type { ToolType } from "../../core/types";
import { useDesignerHost } from "../hooks/useDesignerHost";
import { useSyncExternalStore } from "react";

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

  return (
    <div>
      <div className="font-semibold mb-2">Palette</div>
      <div className="text-xs text-black/60 mt-2 leading-5">
        Drag tool → canvas to place. Image: you can also drag an image file from OS → canvas.
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tools.map((t) => (
          <button
            key={t.tool}
            className={
              "px-3 py-2 rounded border text-left " +
              (activeTool === t.tool ? "border-black/40 bg-black/5" : "border-black/15 hover:bg-black/5")
            }
            onClick={() => onToolChange(t.tool)}
            draggable={Boolean(t.draggable)}
            onDragStart={(e) => {
              if (!t.draggable) return;
              e.dataTransfer.setData("application/x-designer-palette", t.dragId ?? String(t.tool));
              e.dataTransfer.effectAllowed = "copy";
            }}
          >
            {t.label}
          </button>
        ))}

        {elementItems.map((it) => (
          <button
            key={it.id}
            className={
              "px-3 py-2 rounded border text-left border-black/15 hover:bg-black/5"
            }
            onClick={() => onToolChange(it.id)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-designer-palette", it.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
