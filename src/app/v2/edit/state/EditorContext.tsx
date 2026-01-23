"use client";

import React, { createContext, useContext, useMemo, useReducer } from "react";
import { editorReducer, EditorAction } from "./editorReducer";
import { EditorState, initialEditorState } from "./editorState";

interface EditorContextValue {
    state: EditorState;
    dispatch: React.Dispatch<EditorAction>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(editorReducer, initialEditorState);
    const value = useMemo(() => ({ state, dispatch }), [state]);
    return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

export const useEditor = () => {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error("useEditor must be used within EditorProvider");
    }
    return context;
};
