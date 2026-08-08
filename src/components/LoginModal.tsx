"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { createClient } from "@/lib/supabase/client";
import { LOGIN_INTENT_KEY, type LoginTrigger } from "./AuthProvider";

function markLoginStarted(method: "google" | "email") {
  try {
    localStorage.setItem(LOGIN_INTENT_KEY, JSON.stringify({ method, at: Date.now() }));
  } catch {
    /* best effort - the sign-in itself must not depend on this */
  }
}

export default function LoginModal({
  open,
  onClose,
  force = false,
  trigger = "prompt",
}: {
  open: boolean;
  onClose: () => void;
  force?: boolean;
  trigger?: LoginTrigger;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The blocking variant is the one that can cost a sale, so it is the one
  // worth counting against the logins that actually complete.
  useEffect(() => {
    if (open && force) track("login_modal_shown", { trigger });
  }, [open, force, trigger]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function withGoogle() {
    const supabase = createClient();
    if (!supabase) {
      setErr("Sign-in isn't configured yet.");
      return;
    }
    markLoginStarted("google");
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
    else {
      markLoginStarted("email");
      setSent(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-rise w-full max-w-sm rounded-2xl border border-white/10 bg-surface-2 p-6 shadow-2xl shadow-black/60 [animation-duration:300ms]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Sign in to WorkflowCrate</h2>
          {/* Always escapable. A modal covering the whole viewport with no exit
              is a conversion killer, and the blocking variant is exactly the one
              a hesitant first-time visitor meets. */}
          <button
            onClick={onClose}
            className="-m-2 shrink-0 p-2 text-faint hover:text-body"
            aria-label="Close"
          >
            &#10005;
          </button>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          We&rsquo;ll email your download link and receipt here, and keep your purchases in My
          Library.
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

        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-xs text-faint hover:text-body"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
