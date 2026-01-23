"use client";

import { Button, Stack, Typography } from "@mui/material";
import styles from "../edit.module.css";
import { EditorProvider, useEditor } from "../state/EditorContext";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import CanvasWorkspace from "./CanvasWorkspace";

const WorkspaceHeader = () => {
    const { state, dispatch } = useEditor();
    return (
        <div className={styles.workspaceHeader}>
            <Typography variant="subtitle1" fontWeight={600}>
                Visual Canvas
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
                <Button
                    size="small"
                    variant="outlined"
                    onClick={() => dispatch({ type: "COPY_SELECTION" })}
                >
                    Copy
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    onClick={() => dispatch({ type: "PASTE_CLIPBOARD" })}
                >
                    Paste
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    onClick={() => dispatch({ type: "DUPLICATE_SELECTION" })}
                >
                    Duplicate
                </Button>
            </Stack>
        </div>
    );
};

export default function EditorShell() {
    return (
        <EditorProvider>
            <div className={styles.shell}>
                <LeftSidebar />
                <div className={styles.workspace}>
                    <WorkspaceHeader />
                    <CanvasWorkspace />
                </div>
                <RightSidebar />
            </div>
        </EditorProvider>
    );
}
