import { DesignerEngine } from "./engine";
import type { DesignerState } from "./engine";
import { createDesignerAPI, type DesignerAPI } from "./api";
import { DesignerRegistry } from "./registry";
import { PluginManager } from "./plugins";
import { createElementRegistry, type ElementRegistry } from "./elements";

export type DesignerHost = {
  engine: DesignerEngine;
  api: DesignerAPI;
  registry: DesignerRegistry;
  plugins: PluginManager;
  elements: ElementRegistry;
};

export function createDesignerHost(initial?: Partial<DesignerState>): DesignerHost {
  const engine = new DesignerEngine(initial);
  const registry = new DesignerRegistry();
  const plugins = new PluginManager();
  const elements = createElementRegistry();
  const api = createDesignerAPI(engine, elements);

  // Note: We intentionally do NOT auto-activate plugins here.
  // The app (or embedding host) can decide when to activate.

  return { engine, api, registry, plugins, elements };
}
