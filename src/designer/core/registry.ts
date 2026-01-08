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

export type UiSize = {
  w?: number;
  h?: number;
};

export type UiLayoutState = {
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  focusCanvas: boolean;
};

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
  description?: string;
  size?: UiSize;
  order?: number;
  when?: UiWhen;
  render: (ctx: unknown) => unknown;
};

export type RightPanelSection = {
  id: string;
  title: string;
  description?: string;
  size?: UiSize;
  order?: number;
  when?: UiWhen;
  render: (ctx: unknown) => unknown;
};

export type BottomBarItem = {
  id: string;
  title?: string;
  description?: string;
  size?: UiSize;
  order?: number;
  when?: UiWhen;
  render: (ctx: unknown) => unknown;
};

export type CanvasOverlayItem = {
  id: string;
  title?: string;
  description?: string;
  order?: number;
  when?: UiWhen;
  // Rendered inside the canvas container. UI decides where/how (SVG overlay vs HTML overlay).
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

export type PopupDefinition = {
  id: string;
  title: string;
  render: (ctx: unknown) => unknown;
};

export type OpenPopupState = {
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
  private rightPanelSections: RightPanelSection[] = [];
  private bottomBarItems: BottomBarItem[] = [];
  private canvasOverlayItems: CanvasOverlayItem[] = [];
  private dialogs: DialogDefinition[] = [];
  private openDialogState: OpenDialogState = null;

  private popups: PopupDefinition[] = [];
  private openPopupState: OpenPopupState = null;

  private uiLayout: UiLayoutState = {
    leftPanelVisible: true,
    rightPanelVisible: true,
    focusCanvas: false,
  };

  private focusCanvasRestore: { leftPanelVisible: boolean; rightPanelVisible: boolean } | null = null;

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

  // ---- Right panel ----

  getRightPanelSections(): readonly RightPanelSection[] {
    return this.rightPanelSections;
  }

  registerRightPanelSection(section: RightPanelSection): () => void {
    this.rightPanelSections = [...this.rightPanelSections.filter((s) => s.id !== section.id), section];
    this.changed();
    return () => {
      const before = this.rightPanelSections.length;
      this.rightPanelSections = this.rightPanelSections.filter((s) => s.id !== section.id);
      if (this.rightPanelSections.length !== before) this.changed();
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

  // ---- Canvas overlays ----

  getCanvasOverlayItems(): readonly CanvasOverlayItem[] {
    return this.canvasOverlayItems;
  }

  registerCanvasOverlayItem(item: CanvasOverlayItem): () => void {
    this.canvasOverlayItems = [...this.canvasOverlayItems.filter((it) => it.id !== item.id), item];
    this.changed();
    return () => {
      const before = this.canvasOverlayItems.length;
      this.canvasOverlayItems = this.canvasOverlayItems.filter((it) => it.id !== item.id);
      if (this.canvasOverlayItems.length !== before) this.changed();
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

  // ---- Popups ----

  getPopups(): readonly PopupDefinition[] {
    return this.popups;
  }

  registerPopup(def: PopupDefinition): () => void {
    this.popups = [...this.popups.filter((p) => p.id !== def.id), def];
    this.changed();
    return () => {
      const before = this.popups.length;
      this.popups = this.popups.filter((p) => p.id !== def.id);
      if (this.popups.length !== before) this.changed();
    };
  }

  getOpenPopup(): OpenPopupState {
    return this.openPopupState;
  }

  openPopup(id: string, props?: unknown) {
    this.openPopupState = { id, props };
    this.changed();
  }

  closePopup() {
    if (!this.openPopupState) return;
    this.openPopupState = null;
    this.changed();
  }

  // ---- UI layout (panel visibility) ----

  getUiLayout(): UiLayoutState {
    return this.uiLayout;
  }

  setUiLayout(partial: Partial<UiLayoutState>) {
    // focusCanvas is a mode; switching it on/off should preserve or restore layout.
    if (partial.focusCanvas === true && !this.uiLayout.focusCanvas) {
      this.enterFocusCanvas();
      return;
    }
    if (partial.focusCanvas === false && this.uiLayout.focusCanvas) {
      this.exitFocusCanvas();
      return;
    }

    const next: UiLayoutState = { ...this.uiLayout, ...partial };

    // If user manually changes panels while in focus mode, treat it as exiting focus mode
    // without restoring the previous layout.
    const leftRightChanged =
      next.leftPanelVisible !== this.uiLayout.leftPanelVisible ||
      next.rightPanelVisible !== this.uiLayout.rightPanelVisible;
    if (this.uiLayout.focusCanvas && leftRightChanged) {
      this.focusCanvasRestore = null;
      next.focusCanvas = false;
    }

    const changed =
      next.leftPanelVisible !== this.uiLayout.leftPanelVisible ||
      next.rightPanelVisible !== this.uiLayout.rightPanelVisible ||
      next.focusCanvas !== this.uiLayout.focusCanvas;
    if (!changed) return;
    this.uiLayout = next;
    this.changed();
  }

  toggleLeftPanel() {
    this.setUiLayout({ leftPanelVisible: !this.uiLayout.leftPanelVisible });
  }

  toggleRightPanel() {
    this.setUiLayout({ rightPanelVisible: !this.uiLayout.rightPanelVisible });
  }

  enterFocusCanvas() {
    if (this.uiLayout.focusCanvas) return;
    this.focusCanvasRestore = {
      leftPanelVisible: this.uiLayout.leftPanelVisible,
      rightPanelVisible: this.uiLayout.rightPanelVisible,
    };
    this.uiLayout = {
      ...this.uiLayout,
      leftPanelVisible: false,
      rightPanelVisible: false,
      focusCanvas: true,
    };
    this.changed();
  }

  exitFocusCanvas() {
    if (!this.uiLayout.focusCanvas) return;
    const restore = this.focusCanvasRestore ?? { leftPanelVisible: true, rightPanelVisible: true };
    this.focusCanvasRestore = null;
    this.uiLayout = {
      ...this.uiLayout,
      ...restore,
      focusCanvas: false,
    };
    this.changed();
  }

  toggleFocusCanvas() {
    if (this.uiLayout.focusCanvas) this.exitFocusCanvas();
    else this.enterFocusCanvas();
  }

  // ---- Standardized View APIs (baked, fixed surface) ----

  topPanelViewAPI() {
    return {
      getItems: () => this.getTopRibbonItems(),
      registerItem: (item: TopRibbonItem) => this.registerTopRibbonItem(item),
      // legacy
      registerRibbonAction: (action: RibbonAction) => this.registerRibbonAction(action),
    };
  }

  leftPanelViewAPI() {
    return {
      getSections: () => this.getLeftPanelSections(),
      registerSection: (section: LeftPanelSection) => this.registerLeftPanelSection(section),
    };
  }

  rightPanelViewAPI() {
    return {
      getSections: () => this.getRightPanelSections(),
      registerSection: (section: RightPanelSection) => this.registerRightPanelSection(section),
    };
  }

  bottomPanelViewAPI() {
    return {
      getItems: () => this.getBottomBarItems(),
      registerItem: (item: BottomBarItem) => this.registerBottomBarItem(item),
    };
  }

  dialogViewAPI() {
    return {
      getDialogs: () => this.getDialogs(),
      registerDialog: (def: DialogDefinition) => this.registerDialog(def),
      getOpen: () => this.getOpenDialog(),
      open: (id: string, props?: unknown) => this.openDialog(id, props),
      close: () => this.closeDialog(),
    };
  }

  popUpViewAPI() {
    return {
      getPopups: () => this.getPopups(),
      registerPopup: (def: PopupDefinition) => this.registerPopup(def),
      getOpen: () => this.getOpenPopup(),
      open: (id: string, props?: unknown) => this.openPopup(id, props),
      close: () => this.closePopup(),
    };
  }

  canvasViewAPI() {
    return {
      getOverlayItems: () => this.getCanvasOverlayItems(),
      registerOverlayItem: (item: CanvasOverlayItem) => this.registerCanvasOverlayItem(item),
    };
  }
}
