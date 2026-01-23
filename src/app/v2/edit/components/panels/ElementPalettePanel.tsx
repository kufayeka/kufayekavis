"use client";

import type React from "react";
import clsx from "clsx";
import { Paper, Typography } from "@mui/material";
import styles from "../../edit.module.css";
import { ElementType } from "../../core/models";

const tools: { id: ElementType; label: string }[] = [
    { id: "rect", label: "Rectangle" },
    { id: "circle", label: "Circle" },
    { id: "line", label: "Line" },
    { id: "image", label: "Image" },
    { id: "text", label: "Text" },
    { id: "freehand", label: "Freehand" },
];

export default function ElementPalettePanel() {
    const handleDragStart = (event: React.DragEvent<HTMLDivElement>, type: ElementType) => {
        event.dataTransfer.setData("application/x-kufayeka-element", type);
        event.dataTransfer.effectAllowed = "copy";
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
                        className={clsx(styles.paletteCard)}
                        draggable
                        onDragStart={(event) => handleDragStart(event, tool.id)}
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
