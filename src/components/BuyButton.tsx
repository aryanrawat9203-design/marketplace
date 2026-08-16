"use client";

import { useState } from "react";
import Script from "next/script";
import { track } from "@vercel/analytics";
import { inr } from "@/lib/pricing";
import "@/lib/razorpay";
import { useAuth } from "./AuthProvider";
import FreeDownloadButton from "./FreeDownloadButton";
import { hasFreeAccess } from "@/lib/entitlements";

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
  const freeAccess = hasFreeAccess(session?.user?.email);

  if (item.free) {
    return <FreeDownloadButton workflowKey={item.key} block={block} />;
  }

  async function buy() {
    if (requireLogin && !session) {
      openLogin({ force: true, trigger: "buy" });
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
        body: JSON.stringify({
          kind: item.kind,
          key: item.key,
        }),
      });
      if (res.status === 401) {
        openLogin({ force: true, trigger: "buy" });
        return;
      }
      if (res.status === 503) {
        setMsg("Payments aren't switched on yet - this turns on the moment your Razorpay keys are added.");
        return;
      }
      const data = await res.json();
      if (data.freeAccess && data.downloadUrl) {
        window.location.href = data.downloadUrl;
        return;
      }
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
        // The site already knows this - re-asking for it inside the payment
        // sheet, on a phone, at the exact moment of paying, is pure friction.
        prefill: { email: session?.user?.email ?? undefined },
        handler: async (r) => {
          const v = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            // What was bought is read server-side from the order's notes;
            // the client only proves the payment happened.
            body: JSON.stringify({
              orderId: data.orderId,
              paymentId: r.razorpay_payment_id,
              signature: r.razorpay_signature,
            }),
          });
          const vd = await v.json();
          if (vd.downloadUrl) window.location.href = vd.downloadUrl;
          else setMsg("Payment verification failed. If money was deducted, please contact support.");
        },
      });
      track("begin_checkout", { item: item.key, price: item.price, kind: item.kind });
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
      <div className={block ? "w-full" : "inline-block"}>
        {/* The label stays put while loading and a spinner is appended, so the
            button never changes width mid-click. `aria-busy` announces the
            wait to assistive tech, which a text swap alone wouldn't. */}
        <button
          onClick={buy}
          disabled={loading}
          aria-busy={loading || undefined}
          className={`btn-primary btn-lg ${loading ? "btn-loading" : ""} ${w}`}
        >
          {freeAccess ? "Download (Full Access)" : `Buy ${inr(item.price)}`}
        </button>
        {msg && <p className="mt-3 text-sm text-amber-300">{msg}</p>}
      </div>
    </>
  );
}
