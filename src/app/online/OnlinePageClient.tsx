"use client";

import { useSearchParams } from "next/navigation";
import { OnlineViewer } from "./OnlineViewer";

export function OnlinePageClient() {
  const sp = useSearchParams();
  const id = sp.get("id") || "";
  if (id) return <OnlineViewer key={id} projectId={id} />;

  return (
    <div className="h-screen w-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded border border-black/15 p-4">
        <div className="font-medium">Online viewer</div>
        <div className="text-sm text-black/70 mt-1">
          Missing project id. Open <span className="font-mono">/online/&lt;projectId&gt;/&lt;canvasId&gt;</span> (recommended) or <span className="font-mono">/online/&lt;projectId&gt;</span> (legacy).
        </div>
      </div>
    </div>
  );
}
