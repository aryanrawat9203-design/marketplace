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
        // Without this, Google silently reuses whichever account is already
        // active in the browser instead of offering a chooser - makes it
        // look like sign-out doesn't let you switch accounts.
        queryParams: { prompt: "select_account" },
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="anim-rise w-full max-w-sm rounded-2xl border border-white/10 bg-surface-2 p-6 shadow-2xl shadow-black/60 [animation-duration:300ms]">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-ink">Sign in to WorkflowCrate</h2>
          {!force && (
            <button
              onClick={onClose}
              className="text-faint hover:text-body"
              aria-label="Close"
            >
              &#10005;
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          {force
            ? "Sign in to complete your purchase."
            : "Sign in for faster checkout and order history."}
        </p>

        <button onClick={withGoogle} className="btn-secondary btn-md mt-5 w-full ">
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-faint">
          <div className="h-px flex-1 bg-surface-3" /> or <div className="h-px flex-1 bg-surface-3" />
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
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-violet-500"
            />
            <button type="submit" disabled={loading} className="btn-primary btn-md w-full ">
              {loading ? "Sending..." : "Email me a sign-in link"}
            </button>
            {err && <p className="text-sm text-red-400">{err}</p>}
          </form>
        )}

        {!force && (
          <button
            onClick={onClose}
            className="mt-4 w-full text-center text-xs text-faint hover:text-body"
          >
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
