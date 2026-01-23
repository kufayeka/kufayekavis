"use client";

import styles from "../edit.module.css";
import PropertiesPanel from "./panels/PropertiesPanel";

export default function RightSidebar() {
    return (
        <aside className={styles.sidebarRight}>
            <PropertiesPanel />
        </aside>
    );
}
