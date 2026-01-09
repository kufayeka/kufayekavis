import type { DesignerAPI } from "../../../core/api";
import type { DesignerEngine, DesignerState } from "../../../core/engine";
import type { DesignerHost } from "../../../core/host";

export type PropertiesSectionRenderCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  api: DesignerAPI;
  host: DesignerHost;
};
