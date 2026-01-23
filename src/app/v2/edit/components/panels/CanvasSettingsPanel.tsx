"use client";

import { FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import styles from "../../edit.module.css";
import { useEditor } from "../../state/EditorContext";

export default function CanvasSettingsPanel() {
    const { state, dispatch } = useEditor();
    const { canvas } = state;

    return (
        <section className={styles.panel}>
            <Typography variant="overline" color="#93c5fd" fontWeight={600}>
                Canvas Settings
            </Typography>
            <Stack spacing={1.5} mt={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                        label="Width"
                        type="number"
                        size="small"
                        value={canvas.width}
                        onChange={(event) =>
                            dispatch({
                                type: "UPDATE_CANVAS",
                                payload: { width: Number(event.target.value) || 0 },
                            })
                        }
                    />
                    <TextField
                        label="Height"
                        type="number"
                        size="small"
                        value={canvas.height}
                        onChange={(event) =>
                            dispatch({
                                type: "UPDATE_CANVAS",
                                payload: { height: Number(event.target.value) || 0 },
                            })
                        }
                    />
                </Stack>
                <TextField
                    label="Background"
                    type="color"
                    size="small"
                    value={canvas.background}
                    onChange={(event) =>
                        dispatch({
                            type: "UPDATE_CANVAS",
                            payload: { background: event.target.value },
                        })
                    }
                />
                <Stack direction="row" spacing={1} alignItems="center">
                    <FormControlLabel
                        control={
                            <Switch
                                checked={canvas.gridEnabled}
                                onChange={() =>
                                    dispatch({
                                        type: "UPDATE_CANVAS",
                                        payload: { gridEnabled: !canvas.gridEnabled },
                                    })
                                }
                            />
                        }
                        label="Grid Snap"
                    />
                    <TextField
                        label="Grid Size"
                        type="number"
                        size="small"
                        value={canvas.gridSize}
                        onChange={(event) =>
                            dispatch({
                                type: "UPDATE_CANVAS",
                                payload: { gridSize: Number(event.target.value) || 1 },
                            })
                        }
                    />
                </Stack>
            </Stack>
        </section>
    );
}
