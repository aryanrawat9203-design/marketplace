"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PACK_URL = "/api/starter-pack";

/**
 * Email is asked for, never required: the pack downloads either way. Gating a
 * free download behind an address costs more trust than the address is worth,
 * and the people who hand it over anyway are the ones worth emailing.
 */
export default function StarterPackForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "sent">("idle");

  function start(withEmail: boolean) {
    if (withEmail) {
      if (!EMAIL_RE.test(email)) {
        setState("error");
        return;
      }
      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "starter-pack" }),
        keepalive: true,
      }).catch(() => {});
      setState("sent");
    }
    track("free_pack_download", { withEmail });
    window.location.href = PACK_URL;
  }

  return (
    <div className="card-raised p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(true);
        }}
        className="flex w-full flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="starter-email" className="sr-only">
          Email address
        </label>
        <input
          id="starter-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="you@email.com"
          className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-ink placeholder-faint outline-none transition-colors focus-visible:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
        />
        <button type="submit" className="btn-primary btn-md shrink-0">
          Email it to me &amp; download
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => start(false)} className="btn-secondary btn-md">
          Just download, no email
        </button>
        <p className="text-xs text-faint">Free forever. Unsubscribe anytime.</p>
      </div>

      {state === "error" && (
        <p className="mt-2 text-xs text-amber-300">Please enter a valid email address.</p>
      )}
      {state === "sent" && (
        <p className="mt-2 text-sm text-emerald-400">
          Download starting - check your inbox for a copy, and your spam folder if it&apos;s
          not there in a minute.
        </p>
      )}
    </div>
  );
}
