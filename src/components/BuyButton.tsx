"use client";

import { useState } from "react";
import Script from "next/script";
import { inr } from "@/lib/pricing";
import { useAuth } from "./AuthProvider";
import FreeDownloadButton from "./FreeDownloadButton";

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

export default function BuyButton({
  item,
  block = false,
  requireLogin = true,
}: {
  item: BuyItem;
  block?: boolean;
  requireLogin?: boolean;
}) {
  const { session, openLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const w = block ? "w-full" : "";

  if (item.free) {
    return <FreeDownloadButton workflowKey={item.key} block={block} />;
  }

  async function buy() {
    if (requireLogin && !session) {
      openLogin({ force: true });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const authHeaders: Record<string, string> = session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ kind: item.kind, key: item.key }),
      });
      if (res.status === 401) {
        openLogin({ force: true });
        return;
      }
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
        name: "WorkflowCrate",
        description: item.name,
        order_id: data.orderId,
        theme: { color: "#7c5cff" },
        handler: async (r) => {
          const v = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
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
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3 font-medium text-white hover:opacity-95 disabled:opacity-60 ${w}`}
      >
        {loading ? "Please wait..." : `Buy ${inr(item.price)}`}
      </button>
      {msg && <p className="mt-3 text-sm text-amber-300">{msg}</p>}
    </>
  );
}
