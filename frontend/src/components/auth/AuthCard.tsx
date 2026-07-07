"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MascotLumi } from "@/components/prism/MascotLumi";
import { useAuth } from "@/lib/auth";

/**
 * Shared glassmorphic auth card for /sign-in and /sign-up.
 *
 * DEMO ONLY — no credentials are verified. Submitting creates a mock session and
 * routes to the dashboard. The password field is decorative (mirrors the real
 * Clerk UI shape) and is intentionally ignored.
 */
export function AuthCard({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const isSignUp = mode === "sign-up";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    if (isSignUp) signUp(email, name);
    else signIn(email);
    router.push("/dashboard");
  }

  function demoGoogle() {
    // Mock "Continue with Google" — just starts a demo session.
    signIn("demo.student@gmail.com");
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-100 via-white to-slate-50 px-4">
      <div className="glass w-full max-w-sm rounded-2xl border p-7 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <MascotLumi size={44} />
          <h1 className="mt-3 text-xl font-bold">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp ? "Start turning sources into guided lessons." : "Sign in to your workspaces."}
          </p>
        </div>

        <button
          onClick={demoGoogle}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border bg-background py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <GoogleGlyph /> Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {isSignUp && (
            <Field icon={<UserIcon size={15} />}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full bg-transparent py-2 text-sm outline-none"
              />
            </Field>
          )}
          <Field icon={<Mail size={15} />}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
          </Field>
          <Field icon={<Lock size={15} />}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
          </Field>
          <Button type="submit" className="w-full">
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {isSignUp ? "Already have an account? " : "New to PrismLearning? "}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="font-medium text-primary hover:underline"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </Link>
        </p>
        <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
          Demo mode — no real authentication yet.
        </p>
      </div>
    </main>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/40">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.6l6.2 5.2C41.6 35.9 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
