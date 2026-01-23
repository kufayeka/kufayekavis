import { cloneElementsWithOffset } from "../core/clipboard";
import { createElement } from "../core/elementFactory";
import { CanvasElement, CanvasSettings, ElementType, Tool } from "../core/models";
import { EditorState } from "./editorState";

export type EditorAction =
    | { type: "SET_ACTIVE_TOOL"; tool: Tool }
    | { type: "UPDATE_CANVAS"; payload: Partial<CanvasSettings> }
    | { type: "ADD_ELEMENT"; elementType: ElementType; payload?: Partial<CanvasElement> }
    | { type: "ADD_ELEMENTS"; elements: CanvasElement[] }
    | { type: "UPDATE_ELEMENT"; id: string; payload: Partial<CanvasElement> }
    | { type: "UPDATE_ELEMENTS"; payload: Record<string, Partial<CanvasElement>> }
    | { type: "REMOVE_ELEMENTS"; ids: string[] }
    | { type: "SET_SELECTION"; ids: string[] }
    | { type: "TOGGLE_VISIBILITY"; id: string }
    | { type: "TOGGLE_LOCK"; id: string }
    | { type: "MOVE_ELEMENT"; id: string; direction: "up" | "down" }
    | { type: "GROUP_SELECTION" }
    | { type: "UNGROUP"; id: string }
    | { type: "COPY_SELECTION" }
    | { type: "PASTE_CLIPBOARD" }
    | { type: "DUPLICATE_SELECTION" };

const removeElementRecursive = (
    elements: Record<string, CanvasElement>,
    rootIds: string[],
    ids: string[]
) => {
    const idsToRemove = new Set(ids);
    const removeChildren = (element: CanvasElement) => {
        if (element.type === "group") {
            element.children.forEach((childId) => {
                const child = elements[childId];
                if (child) {
                    idsToRemove.add(childId);
                    removeChildren(child);
                }
            });
        }
    };

    ids.forEach((id) => {
        const element = elements[id];
        if (element) removeChildren(element);
    });

    const nextElements = { ...elements };
    idsToRemove.forEach((id) => delete nextElements[id]);

    const nextRootIds = rootIds.filter((id) => !idsToRemove.has(id));
    Object.values(nextElements).forEach((element) => {
        if (element.parentId && idsToRemove.has(element.parentId)) {
            element.parentId = null;
            nextRootIds.push(element.id);
        }
    });

    return { nextElements, nextRootIds };
};

export const editorReducer = (
    state: EditorState,
    action: EditorAction
): EditorState => {
    switch (action.type) {
        case "SET_ACTIVE_TOOL":
            return { ...state, activeTool: action.tool };
        case "UPDATE_CANVAS":
            return { ...state, canvas: { ...state.canvas, ...action.payload } };
        case "ADD_ELEMENT": {
            const element = createElement(action.elementType, action.payload);
            return {
                ...state,
                elements: { ...state.elements, [element.id]: element },
                rootIds: [...state.rootIds, element.id],
                selectedIds: [element.id],
                activeTool: "select",
            };
        }
        case "ADD_ELEMENTS": {
            const nextElements = { ...state.elements };
            const nextRootIds = [...state.rootIds];
            action.elements.forEach((element) => {
                nextElements[element.id] = element;
                if (!element.parentId) nextRootIds.push(element.id);
            });
            return {
                ...state,
                elements: nextElements,
                rootIds: nextRootIds,
                selectedIds: action.elements.map((e) => e.id),
            };
        }
        case "UPDATE_ELEMENT":
            return {
                ...state,
                elements: {
                    ...state.elements,
                    [action.id]: {
                        ...state.elements[action.id],
                        ...action.payload,
                    } as CanvasElement,
                },
            };
        case "UPDATE_ELEMENTS": {
            const next = { ...state.elements };
            Object.entries(action.payload).forEach(([id, payload]) => {
                next[id] = { ...next[id], ...payload } as CanvasElement;
            });
            return { ...state, elements: next };
        }
        case "REMOVE_ELEMENTS": {
            const { nextElements, nextRootIds } = removeElementRecursive(
                state.elements,
                state.rootIds,
                action.ids
            );
            return {
                ...state,
                elements: nextElements,
                rootIds: nextRootIds,
                selectedIds: state.selectedIds.filter((id) => !action.ids.includes(id)),
            };
        }
        case "SET_SELECTION":
            return { ...state, selectedIds: action.ids };
        case "TOGGLE_VISIBILITY": {
            const element = state.elements[action.id];
            if (!element) return state;
            return {
                ...state,
                elements: {
                    ...state.elements,
                    [action.id]: { ...element, visible: !element.visible },
                },
            };
        }
        case "TOGGLE_LOCK": {
            const element = state.elements[action.id];
            if (!element) return state;
            return {
                ...state,
                elements: {
                    ...state.elements,
                    [action.id]: { ...element, locked: !element.locked },
                },
            };
        }
        case "MOVE_ELEMENT": {
            const index = state.rootIds.indexOf(action.id);
            if (index === -1) return state;
            const nextRootIds = [...state.rootIds];
            const swapIndex = action.direction === "up" ? index + 1 : index - 1;
            if (swapIndex < 0 || swapIndex >= nextRootIds.length) return state;
            [nextRootIds[index], nextRootIds[swapIndex]] = [
                nextRootIds[swapIndex],
                nextRootIds[index],
            ];
            return { ...state, rootIds: nextRootIds };
        }
        case "GROUP_SELECTION": {
            if (state.selectedIds.length < 2) return state;
            const group = createElement("group", {
                children: [...state.selectedIds],
            });
            const nextElements = { ...state.elements, [group.id]: group };
            state.selectedIds.forEach((id) => {
                const element = nextElements[id];
                if (element) element.parentId = group.id;
            });
            const nextRootIds = state.rootIds.filter(
                (id) => !state.selectedIds.includes(id)
            );
            nextRootIds.push(group.id);
            return {
                ...state,
                elements: nextElements,
                rootIds: nextRootIds,
                selectedIds: [group.id],
            };
        }
        case "UNGROUP": {
            const group = state.elements[action.id];
            if (!group || group.type !== "group") return state;
            const nextElements = { ...state.elements };
            group.children.forEach((childId) => {
                if (nextElements[childId]) nextElements[childId].parentId = null;
            });
            const nextRootIds = state.rootIds.filter((id) => id !== group.id);
            nextRootIds.push(...group.children);
            delete nextElements[group.id];
            return {
                ...state,
                elements: nextElements,
                rootIds: nextRootIds,
                selectedIds: group.children,
            };
        }
        case "COPY_SELECTION": {
            const selected = state.selectedIds
                .map((id) => state.elements[id])
                .filter(Boolean);
            return { ...state, clipboard: selected };
        }
        case "PASTE_CLIPBOARD": {
            if (!state.clipboard.length) return state;
            const clones = cloneElementsWithOffset(state.clipboard, { x: 20, y: 20 });
            const nextElements = { ...state.elements };
            const nextRootIds = [...state.rootIds];
            clones.forEach((element) => {
                nextElements[element.id] = element;
                if (!element.parentId) nextRootIds.push(element.id);
            });
            return {
                ...state,
                elements: nextElements,
                rootIds: nextRootIds,
                selectedIds: clones.map((e) => e.id),
            };
        }
        case "DUPLICATE_SELECTION": {
            if (!state.selectedIds.length) return state;
            const selected = state.selectedIds
                .map((id) => state.elements[id])
                .filter(Boolean);
            const clones = cloneElementsWithOffset(selected, { x: 24, y: 24 });
            const nextElements = { ...state.elements };
            const nextRootIds = [...state.rootIds];
            clones.forEach((element) => {
                nextElements[element.id] = element;
                if (!element.parentId) nextRootIds.push(element.id);
            });
            return {
                ...state,
                elements: nextElements,
                rootIds: nextRootIds,
                selectedIds: clones.map((e) => e.id),
            };
        }
        default:
            return state;
    }
};
