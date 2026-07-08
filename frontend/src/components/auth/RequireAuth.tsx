"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

/**
 * Client-side loading gate. `middleware.ts` (clerkMiddleware) is the real
 * guard — it redirects signed-out visitors to /sign-in before any page code
 * runs. This just covers the brief moment Clerk is still hydrating client-side
 * so protected pages don't flash their empty/loading state.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }
  return <>{children}</>;
}
