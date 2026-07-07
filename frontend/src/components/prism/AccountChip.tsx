"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

/** Small account indicator + sign-out for the dashboard header. */
export function AccountChip() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  if (!user) return null;

  const initial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initial}
        </div>
        <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
      </div>
      <button
        onClick={() => {
          signOut();
          router.replace("/sign-in");
        }}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Sign out"
      >
        <LogOut size={15} /> Sign out
      </button>
    </div>
  );
}
