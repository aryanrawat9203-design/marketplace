"use client";

import { useState } from "react";

export type AppliedPromo = { code: string; discountPercent: number };

const REASON_MESSAGES: Record<string, string> = {
  not_found: "That code isn't valid.",
  inactive: "That code is no longer active.",
  expired: "That code has expired.",
  exhausted: "That code has reached its usage limit.",
  already_used: "You've already used this code.",
  unavailable: "Promo codes aren't available right now.",
  rate_limited: "Too many attempts - try again in a bit.",
};

// Display-only: the real discount is re-validated and re-priced server-side
// inside /api/checkout, this just gives the buyer instant feedback.
export default function PromoCodeField({
  onApplied,
}: {
  onApplied: (promo: AppliedPromo | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<AppliedPromo | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function apply() {
    if (!code.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        const promo = { code: data.code as string, discountPercent: data.discountPercent as number };
        setApplied(promo);
        onApplied(promo);
        setMsg(`Applied - ${promo.discountPercent}% off`);
      } else {
        setApplied(null);
        onApplied(null);
        setMsg(REASON_MESSAGES[data.reason as string] || "Could not apply that code.");
      }
    } catch {
      setMsg("Could not apply that code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function clearPromo() {
    setApplied(null);
    setCode("");
    setMsg(null);
    onApplied(null);
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-sm">
        <span className="text-emerald-300">
          Promo <span className="font-semibold">{applied.code}</span> - {applied.discountPercent}% off
        </span>
        <button type="button" onClick={clearPromo} className="text-xs text-zinc-400 hover:text-zinc-200">
          Remove
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-indigo-400 hover:text-indigo-300"
      >
        Have a promo code?
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Promo code"
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
        />
        <button
          type="button"
          onClick={apply}
          disabled={loading || !code.trim()}
          className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "..." : "Apply"}
        </button>
      </div>
      {msg && <p className="text-xs text-amber-300">{msg}</p>}
    </div>
  );
}
