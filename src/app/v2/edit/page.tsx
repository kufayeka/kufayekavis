"use client";

import EditorShell from "./components/EditorShell";
import styles from "./edit.module.css";

export default function KufayekaVisEditMode() {
    return (
        <div className={styles.page}>
            <EditorShell />
        </div>
    );
}