import { Emitter } from "./emitter";

export type RibbonAction = {
  id: string;
  label: string;
  onClick: () => void;
  // Optional: keep it simple for now; styling stays consistent with existing buttons.
  disabled?: boolean;
  order?: number;
};

export type UiWhen = (ctx: unknown) => boolean;

export type TopRibbonPlacement = "left" | "right";

export type TopRibbonItem =
  | {
      kind: "button";
      id: string;
      label: string;
      onClick: () => void;
      disabled?: boolean;
      placement?: TopRibbonPlacement;
      order?: number;
      when?: UiWhen;
    }
  | {
      kind: "render";
      id: string;
      placement?: TopRibbonPlacement;
      order?: number;
      when?: UiWhen;
      // Render callback is expected to be used inside the top ribbon.
      // We keep it typed as unknown to avoid importing React types into core.
      render: (ctx: unknown) => unknown;
    };

export type LeftPanelSection = {
  id: string;
  title: string;
  order?: number;
  when?: UiWhen;
  render: (ctx: unknown) => unknown;
};

export type BottomBarItem = {
  id: string;
  order?: number;
  when?: UiWhen;
  render: (ctx: unknown) => unknown;
};

export type DialogDefinition = {
  id: string;
  title: string;
  // Render callback is expected to be used inside the dialog body.
  // Receives the UI ctx plus dialog props.
  render: (ctx: unknown) => unknown;
};

export type OpenDialogState = {
  id: string;
  props?: unknown;
} | null;

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
  private topRibbonItems: TopRibbonItem[] = [];
  private leftPanelSections: LeftPanelSection[] = [];
  private bottomBarItems: BottomBarItem[] = [];
  private dialogs: DialogDefinition[] = [];
  private openDialogState: OpenDialogState = null;

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

  // ---- Top ribbon (new, more flexible) ----

  getTopRibbonItems(): readonly TopRibbonItem[] {
    return this.topRibbonItems;
  }

  registerTopRibbonItem(item: TopRibbonItem): () => void {
    this.topRibbonItems = [...this.topRibbonItems.filter((it) => it.id !== item.id), item];
    this.changed();
    return () => {
      const before = this.topRibbonItems.length;
      this.topRibbonItems = this.topRibbonItems.filter((it) => it.id !== item.id);
      if (this.topRibbonItems.length !== before) this.changed();
    };
  }

  // Convenience alias to keep naming consistent.
  registerTopRibbonAction(action: RibbonAction & { placement?: TopRibbonPlacement }): () => void {
    const placement = action.placement ?? "right";
    return this.registerTopRibbonItem({
      kind: "button",
      id: action.id,
      label: action.label,
      onClick: action.onClick,
      disabled: action.disabled,
      placement,
      order: action.order,
    });
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

  // ---- Left panel ----

  getLeftPanelSections(): readonly LeftPanelSection[] {
    return this.leftPanelSections;
  }

  registerLeftPanelSection(section: LeftPanelSection): () => void {
    this.leftPanelSections = [...this.leftPanelSections.filter((s) => s.id !== section.id), section];
    this.changed();
    return () => {
      const before = this.leftPanelSections.length;
      this.leftPanelSections = this.leftPanelSections.filter((s) => s.id !== section.id);
      if (this.leftPanelSections.length !== before) this.changed();
    };
  }

  // ---- Bottom bar ----

  getBottomBarItems(): readonly BottomBarItem[] {
    return this.bottomBarItems;
  }

  registerBottomBarItem(item: BottomBarItem): () => void {
    this.bottomBarItems = [...this.bottomBarItems.filter((it) => it.id !== item.id), item];
    this.changed();
    return () => {
      const before = this.bottomBarItems.length;
      this.bottomBarItems = this.bottomBarItems.filter((it) => it.id !== item.id);
      if (this.bottomBarItems.length !== before) this.changed();
    };
  }

  // ---- Dialogs ----

  getDialogs(): readonly DialogDefinition[] {
    return this.dialogs;
  }

  registerDialog(def: DialogDefinition): () => void {
    this.dialogs = [...this.dialogs.filter((d) => d.id !== def.id), def];
    this.changed();
    return () => {
      const before = this.dialogs.length;
      this.dialogs = this.dialogs.filter((d) => d.id !== def.id);
      if (this.dialogs.length !== before) this.changed();
    };
  }

  getOpenDialog(): OpenDialogState {
    return this.openDialogState;
  }

  openDialog(id: string, props?: unknown) {
    this.openDialogState = { id, props };
    this.changed();
  }

  closeDialog() {
    if (!this.openDialogState) return;
    this.openDialogState = null;
    this.changed();
  }
}
