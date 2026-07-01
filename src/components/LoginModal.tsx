"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginModal({
  open,
  onClose,
  force = false,
}: {
  open: boolean;
  onClose: () => void;
  force?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function withGoogle() {
    const supabase = createClient();
    if (!supabase) {
      setErr("Sign-in isn't configured yet.");
      return;
    }
    const next = window.location.pathname + window.location.search;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const supabase = createClient();
    if (!supabase) {
      setErr("Sign-in isn't configured yet.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#0c0c12] p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Sign in to FlowDex</h2>
          {!force && (
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300"
              aria-label="Close"
            >
              &#10005;
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          {force
            ? "Sign in to complete your purchase."
            : "Sign in for faster checkout and order history."}
        </p>

        <button
          onClick={withGoogle}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 font-medium text-zinc-100 hover:bg-zinc-800"
        >
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-zinc-500">
          <div className="h-px flex-1 bg-zinc-800" /> or <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {sent ? (
          <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
            Check {email} for a sign-in link.
          </p>
        ) : (
          <form onSubmit={withEmail} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-violet-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 font-medium text-white hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Email me a sign-in link"}
            </button>
            {err && <p className="text-sm text-red-400">{err}</p>}
          </form>
        )}

        {!force && (
          <button
            onClick={onClose}
            className="mt-4 w-full text-center text-xs text-zinc-500 hover:text-zinc-300"
          >
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
