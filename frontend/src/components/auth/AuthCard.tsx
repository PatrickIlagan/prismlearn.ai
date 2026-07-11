"use client";

import { ClerkLoaded, ClerkLoading, SignIn, SignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { MascotLumi } from "@/components/prism/MascotLumi";
import { FluidBlob } from "@/components/prism/FluidBlob";

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
 * History of this file's double-card bug, so the next pass doesn't repeat it:
 * 1st attempt — hid `header`/zeroed `card` padding. Broke the bot-protection
 *   widget (it needs to actually be visible to initialize) — infinite spinner.
 * 2nd attempt — `card: "bg-transparent"` (no !important). Silently a no-op:
 *   Clerk's own stylesheet sets the real opaque white background on a
 *   *different* element and/or with higher specificity than a plain Tailwind
 *   utility class, so it never actually lost the cascade fight.
 * 3rd attempt — same idea but targeting `cardBox` instead of `card`, still no
 *   `!important`. Also didn't stick (confirmed by screenshot: still solid
 *   white), AND hiding `headerTitle`/`headerSubtitle` left an empty gap where
 *   Clerk's header container still reserved space for its now-invisible text.
 *
 * Current approach — stop guessing which single element is "the" background
 * and stop trying to out-cleverness Clerk's own header:
 * - Every background/shadow/border override below uses Tailwind's `!` prefix
 *   (`!important`) so it wins regardless of Clerk's own specificity/injection
 *   order. Applied to BOTH `cardBox` and `card` — redundant if only one of
 *   them is real, harmless if both are.
 * - Clerk's own header text is no longer hidden — restyled instead (leaf-level
 *   color/weight only, still safe by the same "don't touch containers" rule).
 *   This removes the duplicate-heading problem at the root (we no longer have
 *   our own competing "Welcome back" text) instead of fighting Clerk's layout
 *   to hide half of it.
 * - `header`/`main`/`rootBox` are still never hidden or zeroed — only
 *   `cardBox`/`card` backgrounds and `headerTitle`/`headerSubtitle` text
 *   styling are touched, so the bot-protection widget's visibility is
 *   untouched.
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
    rootBox: "w-full",
    cardBox: "w-full !bg-transparent !shadow-none !border-0",
    card: "w-full !bg-transparent !shadow-none !border-0 !p-0",
    headerTitle: "text-lg font-bold tracking-tight text-foreground",
    headerSubtitle: "text-sm text-muted-foreground",
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
      <FluidBlob className="-left-20 top-0 h-80 w-80 bg-violet-400/50" duration={13} hueShift />
      <FluidBlob className="-right-16 bottom-0 h-80 w-80 bg-cyan-300/45" duration={16} delay={2} hueShift />
      <FluidBlob
        className="left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 bg-fuchsia-300/25"
        duration={19}
        delay={4}
        hueShift
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="glass relative z-10 w-full max-w-sm rounded-3xl p-7"
      >
        <div className="mb-5 flex justify-center">
          <MascotLumi size={46} />
        </div>

        {/* Clerk's <SignIn>/<SignUp> render nothing until their own JS + the
            bot-protection widget finish loading, which can take a beat on a
            cold connection — without this, that gap is just a blank card. */}
        <ClerkLoading>
          <div className="flex flex-col items-center gap-3 py-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              className="h-8 w-8 rounded-full border-2 border-primary/25 border-t-primary"
            />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        </ClerkLoading>
        <ClerkLoaded>
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
        </ClerkLoaded>
      </motion.div>
    </main>
  );
}
