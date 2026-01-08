"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useSyncExternalStore } from "react";
import { createDesignerHost } from "../../core/host";
import { useDesignerEngine } from "../hooks/useDesignerEngine";
import type { ToolType } from "../../core/types";
import type { DesignerAPI } from "../../core/api";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { DesignerHost } from "../../core/host";
import { Ribbon } from "./Ribbon";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { BottomBar } from "./BottomBar";
import { DialogHost } from "./DialogHost";
import { PopupHost } from "./PopupHost";
import { SvgCanvas } from "./SvgCanvas";
import { DesignerHostProvider } from "../hooks/useDesignerHost";
import { numericDisplayElementDefinition } from "../../../elements/numericDisplay/numericDisplay.definition";
import { webEmbedElementDefinition } from "../../../elements/webEmbed/webEmbed.definition";
import { myPlugin } from "../../plugins/myPlugin";
import { mqttScadaPlugin } from "../../plugins/mqttScadaPlugin";
import { registerBuiltInUiContributions } from "./builtins/registerBuiltInUi";

type PropertiesSectionRenderCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  api: DesignerAPI;
  host: DesignerHost;
};

export function DesignerApp() {
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
    const storageKey = "kufayekavis.designer.project.v1";

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
  }, [engine]);

  // Register built-in custom elements (and demo controls) at app level.
  useEffect(() => {
    const disposers: Array<() => void> = [];

    disposers.push(host.elements.register(numericDisplayElementDefinition));
    disposers.push(host.elements.register(webEmbedElementDefinition));

    // Register + activate plugins.
    // Note: plugins are NOT auto-activated by createDesignerHost().
    disposers.push(host.plugins.register(myPlugin));
    disposers.push(host.plugins.register(mqttScadaPlugin));
    host.plugins.activateAll({ api: host.api, registry: host.registry, elements: host.elements });

    // Register built-in UI sections into the registry so the shell is fully pluggable.
    disposers.push(
      ...registerBuiltInUiContributions({
        host,
        engine,
      }),
    );

    disposers.push(
      host.registry.registerPropertiesSection({
        id: "builtin.numericDisplay.controls",
        render: (ctx: unknown) => {
          const { api, state } = ctx as PropertiesSectionRenderCtx;
          const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
          const el = selectedId ? api.getElement(selectedId) : null;
          const isNumeric = el && el.type === "custom" && el.kind === "numericDisplay";
          if (!isNumeric) return null;

          const props = (el.props ?? {}) as Record<string, unknown>;
          const value = Number(props.value ?? 0);
          const label = String(props.label ?? "");

          return (
            <div className="rounded border border-black/10 p-2 space-y-2">
              <div className="text-sm font-medium">Numeric Display</div>
              <div className="text-xs text-black/60">value: {Number.isFinite(value) ? value : 0}</div>
              <div className="text-xs text-black/60">label: {label || "(empty)"}</div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  className="px-2 py-1 rounded border border-black/15 hover:bg-black/5"
                  onClick={() => api.callElementAction(el.id, "setValueToDefault")}
                >
                  Reset (action)
                </button>
                <button
                  className="px-2 py-1 rounded border border-black/15 hover:bg-black/5"
                  onClick={() => api.updateCustomProps(el.id, { label: "RPM" })}
                >
                  Set label=RPM
                </button>
                <button
                  className="px-2 py-1 rounded border border-black/15 hover:bg-black/5"
                  onClick={() => api.callElementAction(el.id, "setBoxColor", "#111827")}
                >
                  Box #111827
                </button>
                <button
                  className="px-2 py-1 rounded border border-black/15 hover:bg-black/5"
                  onClick={() => api.updateCustomProps(el.id, { valueColor: "#22c55e" })}
                >
                  Value green
                </button>
              </div>
            </div>
          );
        },
      }),
    );

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
      <div className="h-screen w-screen flex flex-col relative">
        <div className="h-16 w-full border-b border-black/10">
          <Ribbon engine={engine} state={state} />
        </div>
        <div className="flex-1 w-full flex min-h-0">
          {uiLayout.leftPanelVisible && <LeftPanel engine={engine} state={state} setTool={setTool} />}
          <div className="min-w-0 flex-1">
            <SvgCanvas engine={engine} state={state} />
          </div>
          {uiLayout.rightPanelVisible && <RightPanel engine={engine} state={state} />}
        </div>
        <BottomBar engine={engine} state={state} />
        <DialogHost engine={engine} state={state} />
        <PopupHost engine={engine} state={state} />
      </div>
    </DesignerHostProvider>
  );
}