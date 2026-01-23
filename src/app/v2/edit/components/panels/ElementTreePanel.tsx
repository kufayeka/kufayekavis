"use client";

import clsx from "clsx";
import { IconButton, Stack, Typography, Button } from "@mui/material";
import styles from "../../edit.module.css";
import { useEditor } from "../../state/EditorContext";
import { CanvasElement } from "../../core/models";

const TreeNode = ({
    element,
    level,
    selectedIds,
    onSelect,
    onToggleVisibility,
    onToggleLock,
    onMoveUp,
    onMoveDown,
    elementsById,
}: {
    element: CanvasElement;
    level: number;
    selectedIds: string[];
    onSelect: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onMoveUp: (id: string) => void;
    onMoveDown: (id: string) => void;
    elementsById: Record<string, CanvasElement>;
}) => {
    const isSelected = selectedIds.includes(element.id);
    const indentClass =
        styles[`treeIndent${Math.min(level, 5)}` as keyof typeof styles] ||
        styles.treeIndent5;
    return (
        <div>
            <div
                className={clsx(
                    styles.treeItem,
                    indentClass,
                    isSelected && styles.treeItemActive
                )}
                onClick={() => onSelect(element.id)}
            >
                <Typography variant="body2">{element.name}</Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconButton
                        size="small"
                        onClick={(event) => {
                            event.stopPropagation();
                            onMoveUp(element.id);
                        }}
                    >
                        ↑
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={(event) => {
                            event.stopPropagation();
                            onMoveDown(element.id);
                        }}
                    >
                        ↓
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggleVisibility(element.id);
                        }}
                    >
                        {element.visible ? "👁" : "🚫"}
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggleLock(element.id);
                        }}
                    >
                        {element.locked ? "🔒" : "🔓"}
                    </IconButton>
                </Stack>
            </div>
            {element.type === "group" &&
                element.children
                    .map((childId) => elementsById[childId])
                    .filter(Boolean)
                    .map((child) => (
                        <TreeNode
                            key={child.id}
                            element={child}
                            level={level + 1}
                            selectedIds={selectedIds}
                            onSelect={onSelect}
                            onToggleVisibility={onToggleVisibility}
                            onToggleLock={onToggleLock}
                            onMoveUp={onMoveUp}
                            onMoveDown={onMoveDown}
                            elementsById={elementsById}
                        />
                    ))}
        </div>
    );
};

export default function ElementTreePanel() {
    const { state, dispatch } = useEditor();

    return (
        <section className={styles.panel}>
            <Typography variant="overline" color="#93c5fd" fontWeight={600}>
                Element Tree
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
                    onClick={() => {
                        if (state.selectedIds.length === 1) {
                            dispatch({ type: "UNGROUP", id: state.selectedIds[0] });
                        }
                    }}
                >
                    Ungroup
                </Button>
            </Stack>
            {state.rootIds.length === 0 && (
                <Typography variant="caption" color="#9ca3af">
                    No elements yet.
                </Typography>
            )}
            {state.rootIds.map((id) => {
                const element = state.elements[id];
                if (!element) return null;
                return (
                    <TreeNode
                        key={id}
                        element={element}
                        level={0}
                        selectedIds={state.selectedIds}
                        onSelect={(elementId) =>
                            dispatch({ type: "SET_SELECTION", ids: [elementId] })
                        }
                        onToggleVisibility={(elementId) =>
                            dispatch({ type: "TOGGLE_VISIBILITY", id: elementId })
                        }
                        onToggleLock={(elementId) =>
                            dispatch({ type: "TOGGLE_LOCK", id: elementId })
                        }
                        onMoveUp={(elementId) =>
                            dispatch({ type: "MOVE_ELEMENT", id: elementId, direction: "up" })
                        }
                        onMoveDown={(elementId) =>
                            dispatch({ type: "MOVE_ELEMENT", id: elementId, direction: "down" })
                        }
                        elementsById={state.elements}
                    />
                );
            })}
        </section>
    );
}
