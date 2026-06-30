"use client";

import { useState } from "react";
import Script from "next/script";
import { inr } from "@/lib/pricing";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}
type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (r: RazorpayResponse) => void;
  theme?: { color?: string };
};

export type BuyItem = {
  kind: "workflow" | "bundle";
  key: string;
  name: string;
  price: number;
  free: boolean;
};

export default function BuyButton({ item, block = false }: { item: BuyItem; block?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const w = block ? "w-full" : "";

  if (item.free) {
    return (
      <a
        href={`/api/download?kind=workflow&key=${encodeURIComponent(item.key)}`}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-medium text-white hover:opacity-95 ${w}`}
      >
        Download free
      </a>
    );
  }

  async function buy() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: item.kind, key: item.key }),
      });
      if (res.status === 503) {
        setMsg("Payments aren't switched on yet - this turns on the moment your Razorpay keys are added.");
        return;
      }
      const data = await res.json();
      if (!data.orderId) {
        setMsg("Could not start checkout. Please try again.");
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
        name: "FlowDex",
        description: item.name,
        order_id: data.orderId,
        theme: { color: "#7c5cff" },
        handler: async (r) => {
          const v = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: data.orderId,
              paymentId: r.razorpay_payment_id,
              signature: r.razorpay_signature,
              kind: item.kind,
              key: item.key,
            }),
          });
          const vd = await v.json();
          if (vd.downloadUrl) window.location.href = vd.downloadUrl;
          else setMsg("Payment verification failed. If money was deducted, please contact support.");
        },
      });
      rzp.open();
    } catch {
      setMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <button
        onClick={buy}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-medium text-white hover:opacity-95 disabled:opacity-60 ${w}`}
      >
        {loading ? "Please wait..." : `Buy ${inr(item.price)}`}
      </button>
      {msg && <p className="mt-3 text-sm text-amber-300">{msg}</p>}
    </>
  );
}
