import { Emitter } from "./emitter";

export type RibbonAction = {
  id: string;
  label: string;
  onClick: () => void;
  // Optional: keep it simple for now; styling stays consistent with existing buttons.
  disabled?: boolean;
};

export type PropertiesSection = {
  id: string;
  // Render callback is expected to be used inside PropertiesPanel.
  // We keep it typed as unknown to avoid importing React types into core.
  render: (ctx: unknown) => unknown;
};

type RegistryEvent = "change";

export class DesignerRegistry {
  private emitter = new Emitter<RegistryEvent>();
  private ribbonActions: RibbonAction[] = [];
  private propertiesSections: PropertiesSection[] = [];

  subscribe(listener: () => void): () => void {
    return this.emitter.on("change", listener);
  }

  private changed() {
    this.emitter.emit("change");
  }

  getRibbonActions(): readonly RibbonAction[] {
    // IMPORTANT: must be referentially stable for useSyncExternalStore.
    // Do not mutate this array from outside; treat it as read-only.
    return this.ribbonActions;
  }

  registerRibbonAction(action: RibbonAction): () => void {
    // Replace-by-id to keep plugin reload safe
    this.ribbonActions = [...this.ribbonActions.filter((a) => a.id !== action.id), action];
    this.changed();
    return () => {
      const before = this.ribbonActions.length;
      this.ribbonActions = this.ribbonActions.filter((a) => a.id !== action.id);
      if (this.ribbonActions.length !== before) this.changed();
    };
  }

  getPropertiesSections(): readonly PropertiesSection[] {
    // IMPORTANT: must be referentially stable for useSyncExternalStore.
    // Do not mutate this array from outside; treat it as read-only.
    return this.propertiesSections;
  }

  registerPropertiesSection(section: PropertiesSection): () => void {
    this.propertiesSections = [...this.propertiesSections.filter((s) => s.id !== section.id), section];
    this.changed();
    return () => {
      const before = this.propertiesSections.length;
      this.propertiesSections = this.propertiesSections.filter((s) => s.id !== section.id);
      if (this.propertiesSections.length !== before) this.changed();
    };
  }
}
