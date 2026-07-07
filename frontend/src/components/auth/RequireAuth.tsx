"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Client-side route guard. Redirects to /sign-in when there's no session.
 * (When real Clerk lands, this is replaced by middleware + <SignedIn>/<SignedOut>.)
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !user) router.replace("/sign-in");
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }
  return <>{children}</>;
}
