"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import LoginModal from "./LoginModal";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  openLogin: (opts?: { force?: boolean }) => void;
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
const NAG_INTERVAL_MS = 4 * 60 * 1000;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [modalOpen, setModalOpen] = useState(false);
  const [force, setForce] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        setModalOpen(false);
        setForce(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Soft nag: prompt shortly after load, then every few minutes, until signed in.
  // Dismissible and never blocks page content (keeps browsing/SEO working).
  useEffect(() => {
    if (loading || session) return;
    const first = setTimeout(() => {
      setForce(false);
      setModalOpen(true);
    }, FIRST_PROMPT_DELAY_MS);
    const interval = setInterval(() => {
      setForce(false);
      setModalOpen(true);
    }, NAG_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [loading, session]);

  const openLogin = useCallback((opts?: { force?: boolean }) => {
    setForce(!!opts?.force);
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
      <LoginModal open={modalOpen} onClose={closeLogin} force={force} />
    </AuthContext.Provider>
  );
}
