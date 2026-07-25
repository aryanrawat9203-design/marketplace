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
        className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus-visible:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
      />
      <button type="submit" className="btn-primary h-11 shrink-0 px-5 text-sm">
        Get free templates
      </button>
      {state === "error" && (
        <p className="text-xs text-amber-300 sm:absolute sm:mt-12">Please enter a valid email.</p>
      )}
    </form>
  );
}
