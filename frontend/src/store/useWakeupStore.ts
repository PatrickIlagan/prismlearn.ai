import { create } from "zustand";

/** Tracks whether fetchWithRetry (lib/api.ts) is mid-retry against a backend
 *  that isn't responding yet — almost always a Render cold start. A global
 *  store (rather than per-component loading state) lets one banner in the
 *  root layout cover every fetch call site without threading a callback
 *  through each of them. */
interface WakeupState {
  waking: boolean;
  failed: boolean;
  setWaking: (waking: boolean) => void;
  setFailed: (failed: boolean) => void;
}

export const useWakeupStore = create<WakeupState>((set) => ({
  waking: false,
  failed: false,
  setWaking: (waking) => set({ waking, failed: false }),
  setFailed: (failed) => set({ failed, waking: false }),
}));
