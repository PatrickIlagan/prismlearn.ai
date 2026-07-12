/**
 * Instant, account-free demo mode.
 *
 * A session cookie (dies when the browser closes) rather than localStorage,
 * because it has to be readable in two places: middleware.ts on the server
 * (to let a signed-out visitor past the Clerk redirect) and api.ts on the
 * client (to route every call to the built-in mock layer instead of the
 * backend). One flag, both gates. Entering costs one click on the landing
 * page; exiting clears the cookie and returns to the landing page.
 */
export const DEMO_COOKIE = "prism_demo";

export function isDemoMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${DEMO_COOKIE}=1`);
}

export function enterDemoMode(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_COOKIE}=1; path=/; samesite=lax`;
}

export function exitDemoMode(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
}
