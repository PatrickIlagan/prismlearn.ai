/**
 * Per-user localStorage key scoping.
 *
 * profile.ts / mastery.ts / spacedRepetition.ts persist progress to
 * localStorage under a fixed key, with no account boundary — every Clerk
 * user signed into the same browser shared one XP/streak/mastery/flashcard
 * state. A new signup would inherit whatever the previous account left
 * behind (e.g. XP/level carrying over), which reads as a real bug, not a
 * quirk. Scoping every key by the signed-in user's id fixes that; signing
 * out (or not being signed in yet) falls back to a shared "anon" bucket
 * so mock/pre-auth usage still works.
 *
 * These libs aren't React components/hooks, so they can't use Clerk's
 * useUser() — `window.Clerk` is the same documented escape hatch api.ts
 * uses for the auth header.
 */
export function scopedKey(base: string): string {
  if (typeof window === "undefined") return `${base}_anon`;
  try {
    const clerk = (window as unknown as Record<string, unknown>).Clerk as
      | { user?: { id?: string } | null }
      | undefined;
    const userId = clerk?.user?.id;
    return userId ? `${base}_${userId}` : `${base}_anon`;
  } catch {
    return `${base}_anon`;
  }
}
