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
export const LOGIN_INTENT_KEY = "wc:login-started";
const LOGIN_INTENT_TTL_MS = 30 * 60 * 1000;

/** Report a login only if this browser recently started one. */
function consumeLoginIntent() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LOGIN_INTENT_KEY);
    if (raw) localStorage.removeItem(LOGIN_INTENT_KEY);
  } catch {
    /* storage unavailable - a login we cannot attribute is not worth counting */
  }
  if (!raw) return;
  try {
    const { method, at } = JSON.parse(raw) as { method?: string; at?: number };
    if (!at || Date.now() - at > LOGIN_INTENT_TTL_MS) return;
    track("login_completed", { method: method === "google" ? "google" : "email" });
  } catch {
    /* malformed ticket - ignore */
  }
}

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
      // A session appearing is not the same as someone logging in: it also
      // happens on every page load, on token refresh and on tab focus. So the
      // modal records that a login was *started*, and only that ticket - not
      // the session itself - is what gets counted here. The ticket survives the
      // Google redirect and a magic link opened in a different tab.
      if (!signedInRef.current && s) consumeLoginIntent();
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
