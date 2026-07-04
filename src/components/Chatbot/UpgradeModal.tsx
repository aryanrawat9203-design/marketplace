"use client";

import { useState } from "react";
import Script from "next/script";
import { inr } from "@/lib/pricing";
import "@/lib/razorpay";
import { useAuth } from "@/components/AuthProvider";
import { CHATBOT_CONFIG } from "@/lib/chatbot/config";

export default function UpgradeModal({
  open,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  onClose: () => void;
  /** Called once a subscription or top-up is verified server-side. */
  onUnlocked: () => void;
}) {
  const { session } = useAuth();
  const [loading, setLoading] = useState<"subscribe" | "topup" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) return null;

  const authHeaders: Record<string, string> = session
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  async function subscribe() {
    if (!session) return;
    setLoading("subscribe");
    setMsg(null);
    try {
      const res = await fetch("/api/chat/subscribe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      const data = await res.json();
      if (!data.subscriptionId) {
        setMsg(
          res.status === 503
            ? "Payments aren't switched on yet - this turns on the moment Razorpay keys are added."
            : "Could not start checkout. Please try again.",
        );
        return;
      }
      if (typeof window === "undefined" || !window.Razorpay) {
        setMsg("Payment window failed to load. Refresh and try again.");
        return;
      }
      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "WorkflowCrate",
        description: data.name,
        theme: { color: "#7c5cff" },
        handler: async (r) => {
          const v = await fetch("/api/chat/subscribe/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({
              subscriptionId: data.subscriptionId,
              paymentId: r.razorpay_payment_id,
              signature: r.razorpay_signature,
            }),
          });
          const vd = await v.json();
          if (vd.ok) onUnlocked();
          else setMsg("Payment verification failed. If money was deducted, please contact support.");
        },
      });
      rzp.open();
    } catch {
      setMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function topup() {
    if (!session) return;
    setLoading("topup");
    setMsg(null);
    try {
      const res = await fetch("/api/chat/topup/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      const data = await res.json();
      if (!data.orderId) {
        setMsg(
          res.status === 503
            ? "Payments aren't switched on yet - this turns on the moment Razorpay keys are added."
            : "Could not start checkout. Please try again.",
        );
        return;
      }
      if (typeof window === "undefined" || !window.Razorpay) {
        setMsg("Payment window failed to load. Refresh and try again.");
        return;
      }
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "WorkflowCrate",
        description: data.name,
        order_id: data.orderId,
        theme: { color: "#7c5cff" },
        handler: async (r) => {
          const v = await fetch("/api/chat/topup/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({
              orderId: data.orderId,
              paymentId: r.razorpay_payment_id,
              signature: r.razorpay_signature,
            }),
          });
          const vd = await v.json();
          if (vd.ok) onUnlocked();
          else setMsg("Payment verification failed. If money was deducted, please contact support.");
        },
      });
      rzp.open();
    } catch {
      setMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const subPrice = CHATBOT_CONFIG.limits.subscriptionPricePaise / 100;
  const topupPrice = CHATBOT_CONFIG.limits.topupPricePaise / 100;
  const topupBonus = CHATBOT_CONFIG.limits.topupBonusConversations;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0c0c12] p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">You&rsquo;re out of free AI chats</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300" aria-label="Close">
            &#10005;
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-400">Pick an option to keep chatting with the assistant.</p>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-4">
            <p className="font-medium text-zinc-100">Unlimited AI chat</p>
            <p className="mt-1 text-sm text-zinc-400">{inr(subPrice)}/month, cancel anytime.</p>
            <button
              onClick={subscribe}
              disabled={loading !== null}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 font-medium text-white hover:opacity-95 disabled:opacity-60"
            >
              {loading === "subscribe" ? "Please wait..." : `Subscribe - ${inr(subPrice)}/mo`}
            </button>
          </div>

          <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
            <p className="font-medium text-zinc-100">+{topupBonus} conversations</p>
            <p className="mt-1 text-sm text-zinc-400">One-time top-up, {inr(topupPrice)}.</p>
            <button
              onClick={topup}
              disabled={loading !== null}
              className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 font-medium text-zinc-100 hover:bg-zinc-700 disabled:opacity-60"
            >
              {loading === "topup" ? "Please wait..." : `Top up - ${inr(topupPrice)}`}
            </button>
          </div>
        </div>

        {msg && <p className="mt-4 text-sm text-amber-300">{msg}</p>}

        <button onClick={onClose} className="mt-4 w-full text-center text-xs text-zinc-500 hover:text-zinc-300">
          Not now
        </button>
      </div>
    </div>
  );
}
