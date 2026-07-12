"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { isDemoMode } from "@/lib/demoMode";

/**
 * Client-side loading gate. `middleware.ts` (clerkMiddleware) is the real
 * guard — it redirects signed-out visitors to /sign-in before any page code
 * runs. This just covers the brief moment Clerk is still hydrating client-side
 * so protected pages don't flash their empty/loading state.
 *
 * Demo mode (prism_demo cookie) skips the gate entirely, mirroring the same
 * exception middleware.ts makes — a demo visitor has no Clerk session and
 * never will. Read via state + effect (not directly during render) so the
 * server render and the client's first hydration pass stay identical.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [demo, setDemo] = useState<boolean | null>(null);

  useEffect(() => {
    setDemo(isDemoMode());
  }, []);

  useEffect(() => {
    if (demo === false && isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [demo, isLoaded, isSignedIn, router]);

  if (demo !== true && (!isLoaded || !isSignedIn)) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }
  return <>{children}</>;
}
