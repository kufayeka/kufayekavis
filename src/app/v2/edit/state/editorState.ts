import { CanvasSettings, CanvasElement, Tool } from "../core/models";

export interface EditorState {
    canvas: CanvasSettings;
    elements: Record<string, CanvasElement>;
    rootIds: string[];
    selectedIds: string[];
    activeTool: Tool;
    clipboard: CanvasElement[];
}

export const initialEditorState: EditorState = {
    canvas: {
        width: 1200,
        height: 800,
        background: "#0f172a",
        gridEnabled: true,
        gridSize: 20,
    },
    elements: {},
    rootIds: [],
    selectedIds: [],
    activeTool: "select",
    clipboard: [],
};
