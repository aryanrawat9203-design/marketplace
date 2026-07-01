"use client";

import { useState } from "react";

export default function OrderLookupForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "");
    const orderId = String(data.get("orderId") || "");

    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orderId }),
      });
      if (!res.ok) {
        setErrorMsg(
          res.status === 429
            ? "Too many attempts. Please try again in a few minutes."
            : "Please enter a valid email and order id."
        );
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setErrorMsg("Something went wrong. Please try again in a moment.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="mt-6 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
        If we found a matching order, a fresh download link has been emailed to you.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm text-zinc-400">
          Email used at checkout
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
        <label htmlFor="orderId" className="block text-sm text-zinc-400">
          Razorpay order id
        </label>
        <input
          id="orderId"
          name="orderId"
          type="text"
          required
          placeholder="order_..."
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Found in your Razorpay payment confirmation or the order-confirmation email.
        </p>
      </div>
      {errorMsg && <p className="text-sm text-amber-300">{errorMsg}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-medium text-white hover:opacity-95 disabled:opacity-60"
      >
        {status === "sending" ? "Looking up..." : "Email me my download link"}
      </button>
    </form>
  );
}
