"use client";

import {
    Button,
    FormControlLabel,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import styles from "../../edit.module.css";
import { useEditor } from "../../state/EditorContext";
import { CanvasElement } from "../../core/models";
import { getBounds } from "../../core/geometry";

export default function PropertiesPanel() {
    const { state, dispatch } = useEditor();
    const selected = state.selectedIds
        .map((id) => state.elements[id])
        .filter(Boolean);

    if (selected.length === 0) {
        return (
            <section className={styles.panel}>
                <Typography variant="overline" color="#93c5fd" fontWeight={600}>
                    Properties
                </Typography>
                <Typography variant="caption" color="#9ca3af">
                    Select an element to edit properties.
                </Typography>
            </section>
        );
    }

    if (selected.length > 1) {
        return (
            <section className={styles.panel}>
                <Typography variant="overline" color="#93c5fd" fontWeight={600}>
                    Multi-selection
                </Typography>
                <Typography variant="caption" color="#9ca3af">
                    {selected.length} elements selected.
                </Typography>
                <Stack direction="row" spacing={1} mt={1}>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={() => dispatch({ type: "GROUP_SELECTION" })}
                    >
                        Group
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => dispatch({ type: "DUPLICATE_SELECTION" })}
                    >
                        Duplicate
                    </Button>
                    <Button
                        size="small"
                        color="error"
                        variant="contained"
                        onClick={() =>
                            dispatch({ type: "REMOVE_ELEMENTS", ids: state.selectedIds })
                        }
                    >
                        Delete
                    </Button>
                </Stack>
            </section>
        );
    }

    const element = selected[0];
    const update = (payload: Partial<CanvasElement>) =>
        dispatch({ type: "UPDATE_ELEMENT", id: element.id, payload });

    const bounds = getBounds(element, state.elements);

    return (
        <section className={styles.panel}>
            <Typography variant="overline" color="#93c5fd" fontWeight={600}>
                Element Properties
            </Typography>
            <Stack spacing={1.5} mt={1}>
                <TextField
                    label="Name"
                    size="small"
                    value={element.name}
                    onChange={(event) => update({ name: event.target.value })}
                />

                {"x" in element && "y" in element && "width" in element && "height" in element && (
                    <Stack direction="row" spacing={1}>
                        <TextField
                            label="X"
                            type="number"
                            size="small"
                            value={element.x}
                            onChange={(event) =>
                                update({ x: Number(event.target.value) || 0 } as CanvasElement)
                            }
                        />
                        <TextField
                            label="Y"
                            type="number"
                            size="small"
                            value={element.y}
                            onChange={(event) =>
                                update({ y: Number(event.target.value) || 0 } as CanvasElement)
                            }
                        />
                        <TextField
                            label="W"
                            type="number"
                            size="small"
                            value={element.width}
                            onChange={(event) =>
                                update({ width: Number(event.target.value) || 0 } as CanvasElement)
                            }
                        />
                        <TextField
                            label="H"
                            type="number"
                            size="small"
                            value={element.height}
                            onChange={(event) =>
                                update({ height: Number(event.target.value) || 0 } as CanvasElement)
                            }
                        />
                    </Stack>
                )}

                {element.type === "line" && (
                    <Stack direction="row" spacing={1}>
                        <TextField
                            label="x1"
                            type="number"
                            size="small"
                            value={element.x1}
                            onChange={(event) =>
                                update({ x1: Number(event.target.value) || 0 } as CanvasElement)
                            }
                        />
                        <TextField
                            label="y1"
                            type="number"
                            size="small"
                            value={element.y1}
                            onChange={(event) =>
                                update({ y1: Number(event.target.value) || 0 } as CanvasElement)
                            }
                        />
                        <TextField
                            label="x2"
                            type="number"
                            size="small"
                            value={element.x2}
                            onChange={(event) =>
                                update({ x2: Number(event.target.value) || 0 } as CanvasElement)
                            }
                        />
                        <TextField
                            label="y2"
                            type="number"
                            size="small"
                            value={element.y2}
                            onChange={(event) =>
                                update({ y2: Number(event.target.value) || 0 } as CanvasElement)
                            }
                        />
                    </Stack>
                )}

                <Stack direction="row" spacing={1}>
                    <TextField
                        label="Rotation"
                        type="number"
                        size="small"
                        value={element.rotation}
                        onChange={(event) =>
                            update({ rotation: Number(event.target.value) || 0 } as CanvasElement)
                        }
                    />
                    <TextField
                        label="Opacity"
                        type="number"
                        size="small"
                        inputProps={{ min: 0, max: 1, step: 0.05 }}
                        value={element.opacity}
                        onChange={(event) =>
                            update({ opacity: Number(event.target.value) || 0 } as CanvasElement)
                        }
                    />
                </Stack>

                <Stack direction="row" spacing={1}>
                    <TextField
                        label="Stroke"
                        type="color"
                        size="small"
                        value={element.stroke}
                        onChange={(event) => update({ stroke: event.target.value })}
                    />
                    <TextField
                        label="Fill"
                        type="color"
                        size="small"
                        value={element.fill}
                        onChange={(event) => update({ fill: event.target.value })}
                    />
                    <TextField
                        label="Stroke Width"
                        type="number"
                        size="small"
                        value={element.strokeWidth}
                        onChange={(event) =>
                            update({ strokeWidth: Number(event.target.value) || 0 })
                        }
                    />
                </Stack>

                <Stack direction="row" spacing={1}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={element.flipX}
                                onChange={() => update({ flipX: !element.flipX })}
                            />
                        }
                        label="Flip X"
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={element.flipY}
                                onChange={() => update({ flipY: !element.flipY })}
                            />
                        }
                        label="Flip Y"
                    />
                </Stack>

                <Stack direction="row" spacing={1}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={element.visible}
                                onChange={() => update({ visible: !element.visible })}
                            />
                        }
                        label="Visible"
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={element.locked}
                                onChange={() => update({ locked: !element.locked })}
                            />
                        }
                        label="Locked"
                    />
                </Stack>

                {element.type === "text" && (
                    <>
                        <TextField
                            label="Text"
                            size="small"
                            value={element.text}
                            onChange={(event) => update({ text: event.target.value })}
                        />
                        <Stack direction="row" spacing={1}>
                            <TextField
                                label="Font"
                                size="small"
                                value={element.fontFamily}
                                onChange={(event) => update({ fontFamily: event.target.value })}
                            />
                            <TextField
                                label="Font Size"
                                type="number"
                                size="small"
                                value={element.fontSize}
                                onChange={(event) =>
                                    update({ fontSize: Number(event.target.value) || 0 })
                                }
                            />
                        </Stack>
                    </>
                )}

                {element.type === "image" && (
                    <TextField
                        label="Image URL"
                        size="small"
                        value={element.src}
                        onChange={(event) => update({ src: event.target.value })}
                    />
                )}

                {element.type === "freehand" && (
                    <Typography variant="caption" color="#9ca3af">
                        Points: {element.points.length} · bounds {bounds.width.toFixed(0)} x
                        {bounds.height.toFixed(0)}
                    </Typography>
                )}

                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => dispatch({ type: "DUPLICATE_SELECTION" })}
                    >
                        Duplicate
                    </Button>
                    <Button
                        size="small"
                        color="error"
                        variant="contained"
                        onClick={() => dispatch({ type: "REMOVE_ELEMENTS", ids: [element.id] })}
                    >
                        Delete
                    </Button>
                </Stack>
            </Stack>
        </section>
    );
}
