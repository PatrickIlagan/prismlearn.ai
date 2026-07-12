import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Protects /dashboard and /workspace at the edge — signed-out visitors are
 * redirected to /sign-in before any page code runs. Everything else (landing,
 * sign-in/up) stays public.
 *
 * Exception: the prism_demo session cookie ("Try the demo" on the landing
 * page) lets a signed-out visitor through. That's safe because demo mode
 * never talks to the backend — api.ts routes every call to the built-in
 * mock layer, and the real API independently requires a Clerk Bearer token
 * regardless of what the frontend does.
 */
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/workspace(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (req.cookies.get("prism_demo")?.value === "1") return;
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
