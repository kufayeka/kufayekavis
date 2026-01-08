import type { DesignerAPI } from "./api";
import type { DesignerRegistry } from "./registry";
import type { ElementRegistry } from "./elements";

export type Disposable = () => void;

export type DesignerPluginContext = {
  api: DesignerAPI;
  registry: DesignerRegistry;
  elements: ElementRegistry;
};

export type DesignerPlugin = {
  id: string;
  activate: (ctx: DesignerPluginContext) => void | Disposable | Disposable[];
};

export class PluginManager {
  private plugins: DesignerPlugin[] = [];
  private disposersById = new Map<string, Disposable[]>();

  register(plugin: DesignerPlugin): Disposable {
    // Replace-by-id
    this.unregister(plugin.id);
    this.plugins.push(plugin);
    return () => this.unregister(plugin.id);
  }

  activateAll(ctx: DesignerPluginContext): void {
    for (const plugin of this.plugins) {
      this.activate(plugin, ctx);
    }
  }

  activate(plugin: DesignerPlugin, ctx: DesignerPluginContext): void {
    this.unregister(plugin.id);

    const out = plugin.activate(ctx);
    const disposers: Disposable[] = [];

    if (typeof out === "function") disposers.push(out);
    else if (Array.isArray(out)) disposers.push(...out.filter((d): d is Disposable => typeof d === "function"));

    this.disposersById.set(plugin.id, disposers);
  }

  unregister(id: string): void {
    const disposers = this.disposersById.get(id);
    if (disposers) {
      for (const d of disposers) {
        try {
          d();
        } catch {
          // ignore plugin dispose errors
        }
      }
      this.disposersById.delete(id);
    }

    this.plugins = this.plugins.filter((p) => p.id !== id);
  }
}
