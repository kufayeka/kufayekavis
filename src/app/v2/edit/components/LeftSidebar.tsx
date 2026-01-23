"use client";

import styles from "../edit.module.css";
import ElementPalettePanel from "./panels/ElementPalettePanel";
import CanvasSettingsPanel from "./panels/CanvasSettingsPanel";
import ElementTreePanel from "./panels/ElementTreePanel";

export default function LeftSidebar() {
    return (
        <aside className={styles.sidebarLeft}>
            <ElementPalettePanel />
            <CanvasSettingsPanel />
            <ElementTreePanel />
        </aside>
    );
}
