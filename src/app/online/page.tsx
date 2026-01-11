import { Suspense } from "react";
import { OnlinePageClient } from "./OnlinePageClient";

export default function OnlinePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded border border-black/15 p-4">
            <div className="font-medium">Online viewer</div>
            <div className="text-sm text-black/70 mt-1">Loading…</div>
          </div>
        </div>
      }
    >
      <OnlinePageClient />
    </Suspense>
  );
}
