import type { DesignerDocument, DesignerElement, ElementId, ToolType } from "./types";
import type { DesignerEngine, DesignerState, CreateElementInput } from "./engine";
import type { ElementRegistry } from "./elements";

export type ElementActionCtx<E extends DesignerElement = DesignerElement> = {
  api: DesignerAPI;
  engine: DesignerEngine;
  elements: ElementRegistry;
  element: E;
  document: DesignerDocument;
};

export type DesignerApiSubscribe = (listener: () => void) => () => void;

export type DesignerAPI = {
  engine: DesignerEngine;

  // state
  getState: () => DesignerState;
  subscribe: DesignerApiSubscribe;

  // view/tool
  setTool: (tool: ToolType) => void;
  setViewMode: (v: boolean) => void;

  // canvas
  setCanvas: (patch: Partial<DesignerDocument["canvas"]>) => void;

  // plugin settings (stored in project JSON, excluded from history)
  getPluginSettings: (pluginId: string) => unknown;
  setPluginSettings: (pluginId: string, value: unknown) => void;

  // selection
  select: (ids: ElementId[], opts?: { append?: boolean }) => void;
  clearSelection: () => void;

  // elements
  createElement: (input: CreateElementInput) => ElementId;
  updateElement: (id: ElementId, patch: Partial<DesignerElement>) => void;
  updateElements: (ids: ElementId[], updater: (el: DesignerElement) => DesignerElement) => void;
  translate: (ids: ElementId[], dx: number, dy: number) => void;
  deleteElements: (ids: ElementId[]) => void;
  bringToFront: (ids: ElementId[]) => void;
  groupSelection: () => ElementId | null;
  ungroupSelection: () => ElementId[];

  // custom element helpers
  updateCustomProps: (id: ElementId, patch: Record<string, unknown>) => void;
  callElementAction: (id: ElementId, actionId: string, ...args: unknown[]) => unknown;

  // clipboard
  copySelection: () => void;
  pasteClipboard: (offset?: { dx: number; dy: number }) => ElementId[];
  duplicateSelection: () => ElementId[];

  // import/export
  exportProjectJson: () => string;
  importProjectJson: (jsonText: string) => void;

  // MQTT event publishing (mockup)
  publishEvent: (topic: string, data: Record<string, unknown>) => void;

  // document accessors (read-only helpers)
  getDocument: () => DesignerDocument;
  getElement: (id: ElementId) => DesignerElement | undefined;
};

export function createDesignerAPI(engine: DesignerEngine, elements: ElementRegistry): DesignerAPI {
  const api: DesignerAPI = {
    engine,

    getState: () => engine.getState(),
    subscribe: (listener) => engine.subscribe(listener),

    setTool: (tool) => engine.setTool(tool),
    setViewMode: (v) => engine.setViewMode(v),

    setCanvas: (patch) => engine.setCanvas(patch),

    getPluginSettings: (pluginId) => engine.getPluginSettings(pluginId),
    setPluginSettings: (pluginId, value) => engine.setPluginSettings(pluginId, value),

    select: (ids, opts) => engine.select(ids, opts),
    clearSelection: () => engine.clearSelection(),

    createElement: (input) => engine.createElement(input),
    updateElement: (id, patch) => engine.updateElement(id, patch),
    updateElements: (ids, updater) => engine.updateElements(ids, updater),
    translate: (ids, dx, dy) => engine.translate(ids, dx, dy),
    deleteElements: (ids) => engine.deleteElements(ids),
    bringToFront: (ids) => engine.bringToFront(ids),
    groupSelection: () => engine.groupSelection(),
    ungroupSelection: () => engine.ungroupSelection(),

    updateCustomProps: (id, patch) => {
      const el = engine.getState().doc.elements[id];
      if (!el || el.type !== "custom") return;
      engine.updateElement(id, { props: { ...el.props, ...patch } } as unknown as Partial<DesignerElement>);
    },

    callElementAction: (id, actionId, ...args) => {
      const el = engine.getState().doc.elements[id];
      if (!el) return undefined;
      const def = elements.getDefinitionForElement(el);
      const action = def?.actions?.[actionId];
      if (!action) return undefined;
      return action(
        {
          api,
          engine,
          elements,
          element: el,
          document: engine.getState().doc,
        } as unknown,
        ...args,
      );
    },

    copySelection: () => engine.copySelection(),
    pasteClipboard: (offset) => engine.pasteClipboard(offset),
    duplicateSelection: () => engine.duplicateSelection(),

    exportProjectJson: () => engine.exportProjectJson(),
    importProjectJson: (jsonText) => engine.importProjectJson(jsonText),

    publishEvent: (topic, data) => {
      // Mock MQTT publish - in real implementation, connect to MQTT broker
      console.log(`[MQTT Mock] Publishing to topic "${topic}":`, JSON.stringify(data, null, 2));
      // TODO: Replace with actual MQTT client publish
      // mqttClient.publish(topic, JSON.stringify(data));
    },

    getDocument: () => engine.getState().doc,
    getElement: (id) => engine.getState().doc.elements[id],
  };

  return api;
}
