"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { MascotLumi } from "@/components/prism/MascotLumi";

/**
 * Glassmorphic wrapper around Clerk's prebuilt <SignIn>/<SignUp>.
 *
 * Using Clerk's own components (rather than hand-rolled forms against
 * useSignIn/useSignUp) means email verification, OAuth, and any other
 * requirement enabled in the Clerk dashboard just work without us having to
 * reimplement each flow. The `appearance` prop reads the app's own CSS custom
 * properties (hsl(var(--prism-violet)) etc.) so it stays in sync with the
 * Prism theme automatically.
 *
 * IMPORTANT: only theme via `variables` and LEAF-level `elements` (buttons,
 * inputs, links) — never hide or zero-out structural containers like `card`/
 * `header`/`rootBox`. Doing that previously (`header: "hidden"`,
 * `card: "...!p-0..."`) collapsed the container Clerk's bot-protection
 * widget renders into, so it silently never became "visible" and the whole
 * form hung on an infinite loading spinner. Confirmed by removing those two
 * overrides — the spinner was the symptom, not a network/config issue.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: "hsl(var(--prism-violet))",
    colorText: "hsl(var(--foreground))",
    colorTextSecondary: "hsl(var(--muted-foreground))",
    colorInputBackground: "hsl(0 0% 100% / 0.45)",
    colorInputText: "hsl(var(--foreground))",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    socialButtonsBlockButton:
      "border border-white/60 bg-white/50 backdrop-blur-sm hover:bg-white/80",
    formFieldInput:
      "border border-white/60 bg-white/45 backdrop-blur-sm focus:ring-2 focus:ring-primary/40",
    formButtonPrimary:
      "bg-gradient-to-b from-violet-500 to-violet-600 hover:shadow-lg hover:shadow-violet-500/30 transition-all",
    footerActionLink: "text-primary hover:underline",
  },
} as const;

export function AuthCard({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="prism-orb -left-20 top-0 h-72 w-72 bg-violet-400/40" />
      <div className="prism-orb -right-16 bottom-0 h-72 w-72 bg-cyan-300/35" />

      <div className="glass relative z-10 w-full max-w-sm rounded-3xl p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <MascotLumi size={46} />
          <h1 className="mt-3 text-xl font-bold tracking-tight">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp ? "Start turning sources into guided lessons." : "Sign in to your workspaces."}
          </p>
        </div>

        {isSignUp ? (
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            forceRedirectUrl="/dashboard"
            appearance={clerkAppearance}
          />
        ) : (
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
            appearance={clerkAppearance}
          />
        )}
      </div>
    </main>
  );
}
