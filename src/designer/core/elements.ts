import { Emitter } from "./emitter";
import type { DesignerElement, DesignerElementType, ElementId } from "./types";
import type { CreateElementInput, DesignerEngine } from "./engine";

export type ElementPaletteItem = {
  id: string; // unique palette id (e.g. "rect" or "custom:myKind")
  label: string;
  order?: number;
};

export type ElementDefinition = {
  id: string; // same as palette id
  type: DesignerElementType;
  kind?: string; // only for type === "custom"
  label: string;
  palette?: { label: string; order?: number };

  // Create input for engine.createElement from a placement point
  createInput?: (pt: { x: number; y: number }) => CreateElementInput;

  // Optional exports/render hooks (UI layer may cast these)
  render?: (ctx: unknown) => unknown;
  exportSvg?: (ctx: unknown) => string;

  // Optional actions callable via DesignerAPI. Intended for custom elements.
  // UI/system/plugin can invoke by element id + action id.
  actions?: Record<string, (ctx: unknown, ...args: unknown[]) => unknown>;
};

type RegistryEvent = "change";

export class ElementRegistry {
  private emitter = new Emitter<RegistryEvent>();
  private defs = new Map<string, ElementDefinition>();

  // snapshots must be stable for useSyncExternalStore
  private paletteSnapshot: readonly ElementPaletteItem[] = [];

  subscribe(listener: () => void): () => void {
    return this.emitter.on("change", listener);
  }

  private rebuildSnapshots() {
    const items: ElementPaletteItem[] = [];
    for (const def of this.defs.values()) {
      if (!def.palette) continue;
      items.push({ id: def.id, label: def.palette.label, order: def.palette.order });
    }
    items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label));
    this.paletteSnapshot = items;
  }

  private changed() {
    this.rebuildSnapshots();
    this.emitter.emit("change");
  }

  getPaletteItems(): readonly ElementPaletteItem[] {
    return this.paletteSnapshot;
  }

  getDefinition(id: string): ElementDefinition | undefined {
    return this.defs.get(id);
  }

  getDefinitionForElement(el: DesignerElement): ElementDefinition | undefined {
    if (el.type === "custom") return this.defs.get(`custom:${el.kind}`);
    return this.defs.get(el.type);
  }

  register(def: ElementDefinition): () => void {
    this.defs.set(def.id, def);
    this.changed();
    return () => {
      if (this.defs.delete(def.id)) this.changed();
    };
  }

  // Convenience: place from palette
  createFromPalette(engine: DesignerEngine, paletteId: string, pt: { x: number; y: number }): ElementId | null {
    const def = this.getDefinition(paletteId);
    if (!def || !def.createInput) return null;
    return engine.createElement(def.createInput(pt));
  }
}

export function createBuiltInElementRegistry(): ElementRegistry {
  const reg = new ElementRegistry();

  reg.register({
    id: "rect",
    type: "rect",
    label: "Rect",
    palette: { label: "Rect", order: 10 },
    createInput: (pt) => ({ type: "rect", x: pt.x, y: pt.y }),
  });

  reg.register({
    id: "circle",
    type: "circle",
    label: "Circle",
    palette: { label: "Circle", order: 20 },
    createInput: (pt) => ({ type: "circle", x: pt.x, y: pt.y }),
  });

  reg.register({
    id: "line",
    type: "line",
    label: "Line",
    palette: { label: "Line", order: 30 },
    createInput: (pt) => ({ type: "line", x1: pt.x, y1: pt.y, x2: pt.x + 140, y2: pt.y + 60 }),
  });

  reg.register({
    id: "free",
    type: "free",
    label: "Free Draw",
    palette: { label: "Free Draw", order: 35 },
    createInput: (pt) => ({ type: "free", d: `M ${pt.x} ${pt.y} L ${pt.x + 80} ${pt.y + 40}` }),
  });

  reg.register({
    id: "image",
    type: "image",
    label: "Image",
    palette: { label: "Image", order: 40 },
    createInput: (pt) => ({ type: "image", x: pt.x, y: pt.y, href: "" }),
  });

  reg.register({
    id: "text",
    type: "text",
    label: "Text",
    palette: { label: "Text", order: 50 },
    createInput: (pt) => ({ type: "text", x: pt.x, y: pt.y, text: "Text" }),
  });

  // Group elements are created via selection/grouping UX, not from the palette.
  // Still registered so the system has a complete definition set for all native types.
  reg.register({
    id: "group",
    type: "group",
    label: "Group",
  });

  // Generic wrapper for custom SVG-like elements. Rendering is provided via
  // ElementDefinition.render registered by system/plugins for a given kind.
  reg.register({
    id: "custom:customSvg",
    type: "custom",
    kind: "customSvg",
    label: "Custom SVG",
    palette: { label: "Custom SVG", order: 60 },
    createInput: (pt) => ({ type: "custom", kind: "customSvg", x: pt.x, y: pt.y, width: 220, height: 160, props: {} }),
  });

  return reg;
}
