"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useWakeupStore } from "@/store/useWakeupStore";

/** How long the waking banner stays up once shown, even if the request
 *  resolves sooner. A banner that blinks in and out for a fraction of a
 *  second reads as a glitch; holding it briefly reads as information. */
const MIN_VISIBLE_MS = 5000;

/** Global overlay driven by fetchWithRetry (lib/api.ts). Render's free-tier
 *  backend can take up to ~30-60s to wake from a cold sleep — without this,
 *  that window just looks like a frozen page and people refresh mid-retry,
 *  which restarts the wait instead of shortening it. */
export function WakeupBanner() {
  const wakingNow = useWakeupStore((s) => s.wakingCount > 0);
  const failed = useWakeupStore((s) => s.failed);
  const [waking, setWaking] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (wakingNow) {
      if (!waking) shownAt.current = Date.now();
      setWaking(true);
      return;
    }
    if (!waking) return;
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current));
    const t = setTimeout(() => setWaking(false), remaining);
    return () => clearTimeout(t);
  }, [wakingNow, waking]);

  if (!waking && !failed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] flex justify-center px-4 pt-4">
      {waking && !failed && (
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/95 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3 px-5 py-3">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-600" />
            <p className="text-sm font-medium text-amber-900">
              Waking up the server — first load after a while can take up to a minute. No
              need to refresh, this will load on its own.
            </p>
          </div>
          <div className="h-1 w-full overflow-hidden bg-amber-200/60">
            <div className="wakeup-progress-bar h-full w-1/3 rounded-full bg-amber-500" />
          </div>
        </div>
      )}
      {failed && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/95 px-5 py-3 shadow-lg backdrop-blur">
          <TriangleAlert className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-900">
            Couldn&apos;t reach the server. It may still be starting up.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </button>
        </div>
      )}
      <style jsx>{`
        .wakeup-progress-bar {
          animation: wakeup-progress 1.4s ease-in-out infinite;
        }
        @keyframes wakeup-progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(300%);
          }
        }
      `}</style>
    </div>
  );
}
