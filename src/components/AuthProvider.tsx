"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { track } from "@vercel/analytics";
import { createClient } from "@/lib/supabase/client";
import LoginModal from "./LoginModal";

export type LoginTrigger = "buy" | "cart" | "chat" | "account" | "header" | "prompt";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  openLogin: (opts?: { force?: boolean; trigger?: LoginTrigger }) => void;
  closeLogin: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const FIRST_PROMPT_DELAY_MS = 4000;
const PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const PROMPT_SEEN_KEY = "wc:login-prompt-at";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [modalOpen, setModalOpen] = useState(false);
  const [force, setForce] = useState(false);
  const [trigger, setTrigger] = useState<LoginTrigger>("prompt");
  const signedInRef = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      signedInRef.current = !!data.session;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // Only a real signed-out -> signed-in transition counts as a completed
      // login. SIGNED_IN also fires on session restore and token refresh, and
      // a ref (not state) is used so a re-render can never replay the event.
      if (!signedInRef.current && s) {
        const method = s.user?.app_metadata?.provider === "google" ? "google" : "email";
        track("login_completed", { method });
      }
      signedInRef.current = !!s;
      setSession(s);
      if (s) {
        setModalOpen(false);
        setForce(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Soft prompt: shown once shortly after load, then not again for a week.
  // Repeat-nagging visitors mid-browse measurably hurts conversion, so the
  // modal otherwise only opens on explicit user action (login / buy click).
  useEffect(() => {
    if (loading || session) return;
    let seenAt = 0;
    try {
      seenAt = Number(localStorage.getItem(PROMPT_SEEN_KEY)) || 0;
    } catch {
      /* storage unavailable - treat as never seen */
    }
    if (Date.now() - seenAt < PROMPT_COOLDOWN_MS) return;
    const first = setTimeout(() => {
      try {
        localStorage.setItem(PROMPT_SEEN_KEY, String(Date.now()));
      } catch {
        /* best effort */
      }
      setForce(false);
      setModalOpen(true);
    }, FIRST_PROMPT_DELAY_MS);
    return () => clearTimeout(first);
  }, [loading, session]);

  const openLogin = useCallback((opts?: { force?: boolean; trigger?: LoginTrigger }) => {
    setForce(!!opts?.force);
    setTrigger(opts?.trigger ?? "prompt");
    setModalOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setModalOpen(false);
    setForce(false);
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        openLogin,
        closeLogin,
        signOut,
      }}
    >
      {children}
      <LoginModal open={modalOpen} onClose={closeLogin} force={force} trigger={trigger} />
    </AuthContext.Provider>
  );
}
