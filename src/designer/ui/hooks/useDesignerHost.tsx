"use client";

import { createContext, useContext } from "react";
import type { DesignerHost } from "../../core/host";

const DesignerHostContext = createContext<DesignerHost | null>(null);

export function DesignerHostProvider({ host, children }: { host: DesignerHost; children: React.ReactNode }) {
  return <DesignerHostContext.Provider value={host}>{children}</DesignerHostContext.Provider>;
}

export function useDesignerHost(): DesignerHost {
  const ctx = useContext(DesignerHostContext);
  if (!ctx) throw new Error("useDesignerHost must be used within DesignerHostProvider");
  return ctx;
}
