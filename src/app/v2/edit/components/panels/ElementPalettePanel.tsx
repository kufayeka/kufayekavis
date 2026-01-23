"use client";

import type React from "react";
import clsx from "clsx";
import { Paper, Typography } from "@mui/material";
import styles from "../../edit.module.css";
import { ElementType, Tool } from "../../core/models";
import { useEditor } from "../../state/EditorContext";

const tools: { id: Tool; label: string; draggable?: boolean }[] = [
    { id: "select", label: "Select", draggable: false },
    { id: "rect", label: "Rectangle" },
    { id: "circle", label: "Circle" },
    { id: "line", label: "Line" },
    { id: "image", label: "Image" },
    { id: "text", label: "Text" },
];

export default function ElementPalettePanel() {
    const { state, dispatch } = useEditor();
    const handleDragStart = (event: React.DragEvent<HTMLDivElement>, type: ElementType) => {
        event.dataTransfer.setData("application/x-kufayeka-element", type);
        event.dataTransfer.effectAllowed = "copy";
        dispatch({ type: "SET_ACTIVE_TOOL", tool: "select" });
    };

    return (
        <section className={styles.panel}>
            <Typography variant="overline" color="#93c5fd" fontWeight={600}>
                Element Palette
            </Typography>
            <div className={styles.toolGrid}>
                {tools.map((tool) => (
                    <Paper
                        key={tool.id}
                        className={clsx(
                            styles.paletteCard,
                            state.activeTool === tool.id && styles.paletteCardActive
                        )}
                        draggable={tool.draggable !== false}
                        onClick={() =>
                            dispatch({ type: "SET_ACTIVE_TOOL", tool: tool.id })
                        }
                        onDragStart={(event) => {
                            if (tool.draggable === false) return;
                            handleDragStart(event, tool.id as ElementType);
                        }}
                    >
                        {tool.label}
                    </Paper>
                ))}
            </div>
            <div className={`${styles.row} ${styles.rowTopMd}`}>
                <Typography variant="caption" color="#9ca3af">
                    Drag an element into the canvas.
                </Typography>
            </div>
        </section>
    );
}
