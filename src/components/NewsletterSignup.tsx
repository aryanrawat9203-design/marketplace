"use client";

import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setState("error");
      return;
    }
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "newsletter" }),
      keepalive: true,
    }).catch(() => {});
    setState("done");
  }

  if (state === "done") {
    return (
      <p className="text-sm text-emerald-400">
        You&apos;re in! New free templates and bundle deals will land in your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "error") setState("idle");
        }}
        placeholder="you@email.com"
        // `min-h-11`, not `h-11`: the wrapper is `flex-col` until `sm`, so on
        // mobile `flex-1` resolves to `flex-basis: 0` on the *vertical* axis
        // and overrides a plain `height`, collapsing the field to 20px.
        className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-ink placeholder-faint outline-none transition-colors focus-visible:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
      />
      <button type="submit" className="btn-primary btn-md shrink-0">
        Get free templates
      </button>
      {state === "error" && (
        <p className="text-xs text-amber-300 sm:absolute sm:mt-12">Please enter a valid email.</p>
      )}
    </form>
  );
}
