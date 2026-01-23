import { CanvasElement } from "../core/models";
import { EditorState } from "./editorState";

export const getSelectedElements = (state: EditorState): CanvasElement[] =>
    state.selectedIds
        .map((id) => state.elements[id])
        .filter(Boolean);
