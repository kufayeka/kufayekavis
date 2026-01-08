"use client";

import type { DesignerEngine } from "../../../core/engine";
import type { DesignerHost } from "../../../core/host";
import { registerTopPanelProjectIO } from "../../features/topPanel/projectIO";
import { registerTopPanelViewModeToggle } from "../../features/topPanel/viewMode";
import { registerTopPanelEditActions } from "../../features/topPanel/editActions";
import { registerLeftPanelPaletteSection } from "../../features/panels/paletteSection";
import { registerRightPanelPropertiesSection } from "../../features/panels/propertiesSection";

export function registerBuiltInUiContributions(opts: {
  host: DesignerHost;
  engine: DesignerEngine;
}): Array<() => void> {
  const { host, engine } = opts;
  const disposers: Array<() => void> = [];

  disposers.push(...registerTopPanelProjectIO({ host, engine }));
  disposers.push(...registerTopPanelViewModeToggle({ host }));
  disposers.push(...registerTopPanelEditActions({ host }));
  disposers.push(...registerLeftPanelPaletteSection({ host }));
  disposers.push(...registerRightPanelPropertiesSection({ host }));

  return disposers;
}
