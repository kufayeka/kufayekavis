"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useSyncExternalStore } from "react";
import { createDesignerHost } from "../../core/host";
import { useDesignerEngine } from "../hooks/useDesignerEngine";
import type { ToolType } from "../../core/types";
import { Ribbon } from "./Ribbon";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { BottomBar } from "./BottomBar";
import { DialogHost } from "./DialogHost";
import { PopupHost } from "./PopupHost";
import { SvgCanvas } from "./SvgCanvas";
import { DesignerHostProvider } from "../hooks/useDesignerHost";
import { mqttScadaPlugin } from "../../plugins/mqttScadaPlugin";
import { builtInElementPlugins, builtInUiPlugin } from "../../plugins/builtinPlugins";

export function DesignerApp({ projectId }: { projectId?: string }) {
  const host = useMemo(() => createDesignerHost(), []);
  const engine = host.engine;
  const { state } = useDesignerEngine(engine);

  const uiLayout = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getUiLayout(),
    () => host.registry.getUiLayout(),
  );

  // Autosave/restore project to localStorage for robustness across refresh.
  useEffect(() => {
    const storageKey = projectId ? `kufayekavis.designer.project.v1.${projectId}` : "kufayekavis.designer.project.v1";

    const safeGet = (): string | null => {
      try {
        return window.localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    };

    const safeSet = (value: string) => {
      try {
        window.localStorage.setItem(storageKey, value);
      } catch {
        // ignore quota / privacy mode
      }
    };

    // Restore once on mount.
    const saved = safeGet();
    if (saved && saved.trim()) {
      try {
        engine.importProjectJson(saved);
      } catch {
        // ignore invalid saved state
      }
    }

    // Ensure engine project id matches the route param.
    if (projectId) {
      engine.setProjectId(projectId);
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const saveNow = () => {
      try {
        safeSet(engine.exportProjectJson());
      } catch {
        // ignore
      }
    };

    const unsubscribe = engine.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(saveNow, 300);
    });

    const onBeforeUnload = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      saveNow();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [engine, projectId]);

  // Register built-in custom elements (and demo controls) at app level.
  useEffect(() => {
    const disposers: Array<() => void> = [];

    // Register + activate plugins.
    // Note: plugins are NOT auto-activated by createDesignerHost().
    for (const p of builtInElementPlugins) disposers.push(host.plugins.register(p));
    disposers.push(host.plugins.register(builtInUiPlugin));
    disposers.push(host.plugins.register(mqttScadaPlugin));

    host.plugins.activateAll({ api: host.api, registry: host.registry, elements: host.elements, host, engine });

    return () => {
      for (const d of disposers) {
        try {
          d();
        } catch {
          // ignore
        }
      }
    };
  }, [engine, host]);

  const setTool = useCallback(
    (tool: ToolType) => {
      engine.setTool(tool);
    },
    [engine],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        Boolean(target?.isContentEditable) ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";

      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && !isEditable && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          engine.redo();
        } else {
          engine.undo();
        }
        return;
      }

      if (mod && !isEditable && e.key.toLowerCase() === "y") {
        e.preventDefault();
        engine.redo();
        return;
      }

      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        engine.copySelection();
        return;
      }
      // Let the app-level paste handler (in the canvas) handle Ctrl+V so
      // OS clipboard images take precedence over the internal clipboard.
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        engine.duplicateSelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        engine.groupSelection();
        return;
      }

      // IMPORTANT: never delete elements on Backspace; users need it for text editing.
      // Only allow the dedicated Delete key, and only when not typing in a form field.
      if (e.key === "Delete" && !isEditable) {
        if (state.selection.ids.length > 0) {
          e.preventDefault();
          engine.deleteElements(state.selection.ids);
        }
      }
      if (e.key === "Escape") {
        engine.clearSelection();
        engine.setTool("select");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engine, state.selection.ids]);

  return (
    <DesignerHostProvider host={host}>
      <div className="h-screen w-screen relative overflow-hidden">
        {/* Base layer: canvas uses the full viewport and can overflow/scroll independently */}
        <div className="absolute inset-0">
          <SvgCanvas engine={engine} state={state} />
        </div>

        {/* Overlays: these do NOT affect canvas layout/size */}
        <div className="absolute top-0 left-0 right-0 h-16 border-b border-black/10 bg-[color-mix(in_srgb,var(--background)_92%,transparent)] backdrop-blur-sm z-30">
          <Ribbon engine={engine} state={state} />
        </div>

        {uiLayout.leftPanelVisible && (
          <div className="absolute left-0 top-16 bottom-10 z-20 bg-[color-mix(in_srgb,var(--background)_92%,transparent)] backdrop-blur-sm">
            <LeftPanel engine={engine} state={state} setTool={setTool} />
          </div>
        )}

        {uiLayout.rightPanelVisible && (
          <div className="absolute right-0 top-16 bottom-10 z-20 bg-[color-mix(in_srgb,var(--background)_92%,transparent)] backdrop-blur-sm">
            <RightPanel engine={engine} state={state} />
          </div>
        )}

        <div className="absolute left-0 right-0 bottom-0 h-10 border-t border-black/10 bg-[color-mix(in_srgb,var(--background)_92%,transparent)] backdrop-blur-sm z-30">
          <BottomBar engine={engine} state={state} />
        </div>

        <DialogHost engine={engine} state={state} />
        <PopupHost engine={engine} state={state} />
      </div>
    </DesignerHostProvider>
  );
}