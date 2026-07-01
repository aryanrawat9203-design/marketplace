"use client";

import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "");
    const email = String(data.get("email") || "");
    const message = String(data.get("message") || "");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        setErrorMsg(
          body.error === "invalid_email"
            ? "Please enter a valid email address."
            : body.error === "missing_message"
              ? "Please enter a message."
              : "Could not send your message. Please try again in a moment."
        );
        setStatus("error");
        return;
      }
      setStatus("sent");
      form.reset();
    } catch {
      setErrorMsg("Could not send your message. Please try again in a moment.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="mt-6 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
        Thanks &mdash; your message has been sent. We aim to reply within 1&ndash;2 business days.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm text-zinc-400">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm text-zinc-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm text-zinc-400">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
      </div>
      {errorMsg && <p className="text-sm text-amber-300">{errorMsg}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-medium text-white hover:opacity-95 disabled:opacity-60"
      >
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
