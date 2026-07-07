"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Mock authentication layer.
 *
 * This intentionally has NO real auth — it's a demoable stand-in that mirrors a
 * Clerk-like API surface (`user`, `isLoaded`, `signIn`, `signUp`, `signOut`) so
 * swapping in `@clerk/nextjs` later is a contained change: replace this provider
 * with <ClerkProvider>, and `useAuth()` callers map to Clerk's `useUser()`/`useClerk()`.
 *
 * The "session" is just a user object in localStorage. The derived id is stable
 * per email and is sent as `X-User-Id` so backend user-scoping already works.
 */

export interface MockUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: MockUser | null;
  isLoaded: boolean;
  signIn: (email: string) => MockUser;
  signUp: (email: string, name?: string) => MockUser;
  signOut: () => void;
}

export const MOCK_USER_KEY = "prism_mock_user";

const AuthContext = createContext<AuthState | null>(null);

/** Stable, url-safe id derived from the email (so the same user maps to the same rows). */
function deriveId(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) | 0;
  return `mock_${(hash >>> 0).toString(36)}`;
}

function makeUser(email: string, name?: string): MockUser {
  const clean = email.trim().toLowerCase();
  return { id: deriveId(clean), email: clean, name: name?.trim() || clean.split("@")[0] };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MOCK_USER_KEY);
      if (raw) setUser(JSON.parse(raw) as MockUser);
    } catch {
      /* ignore corrupt/absent session */
    }
    setIsLoaded(true);
  }, []);

  function persist(next: MockUser | null) {
    setUser(next);
    try {
      if (next) localStorage.setItem(MOCK_USER_KEY, JSON.stringify(next));
      else localStorage.removeItem(MOCK_USER_KEY);
    } catch {
      /* non-fatal */
    }
  }

  const signIn = (email: string) => {
    const u = makeUser(email);
    persist(u);
    return u;
  };
  const signUp = (email: string, name?: string) => {
    const u = makeUser(email, name);
    persist(u);
    return u;
  };
  const signOut = () => persist(null);

  return (
    <AuthContext.Provider value={{ user, isLoaded, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}
