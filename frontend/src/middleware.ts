import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Protects /dashboard and /workspace at the edge — signed-out visitors are
 * redirected to /sign-in before any page code runs. Everything else (landing,
 * sign-in/up) stays public.
 */
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/workspace(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
