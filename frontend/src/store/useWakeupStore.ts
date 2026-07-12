import { create } from "zustand";

/** Tracks whether fetchWithRetry (lib/api.ts) has a request that's been in
 *  flight suspiciously long — almost always a Render cold start. A global
 *  store (rather than per-component loading state) lets one banner in the
 *  root layout cover every fetch call site without threading a callback
 *  through each of them.
 *
 *  wakingCount is a counter, not a boolean: the dashboard fires one reviewer
 *  fetch per workspace in parallel, so several requests can be slow at once.
 *  The banner should stay up until all of them have settled, not disappear
 *  the moment the fastest one finishes. */
interface WakeupState {
  wakingCount: number;
  failed: boolean;
  markWaking: () => void;
  clearWaking: () => void;
  setFailed: (failed: boolean) => void;
}

export const useWakeupStore = create<WakeupState>((set) => ({
  wakingCount: 0,
  failed: false,
  markWaking: () => set((s) => ({ wakingCount: s.wakingCount + 1, failed: false })),
  clearWaking: () => set((s) => ({ wakingCount: Math.max(0, s.wakingCount - 1) })),
  setFailed: (failed) => set({ failed, wakingCount: 0 }),
}));

// ── One-shot arming ─────────────────────────────────────────────────────────
// The cold-start banner is only worth showing at ONE moment: the first
// authenticated backend load right after signing in / up, when Render's
// free-tier container may still be waking. Left ungated it fired on every
// slow fetch anywhere in the app. So the auth pages "arm" it on mount, and
// the first fetchWithRetry to reach the backend consumes the arm — every
// later load stays silent. sessionStorage (not the in-memory store) so the
// flag survives the full-page redirect Clerk does after auth.
const WAKE_ARM_KEY = "prism_wake_armed";

export function armWakeup(): void {
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(WAKE_ARM_KEY, "1");
}

export function disarmWakeup(): void {
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(WAKE_ARM_KEY);
}

export function isWakeupArmed(): boolean {
  return typeof sessionStorage !== "undefined" && sessionStorage.getItem(WAKE_ARM_KEY) === "1";
}
