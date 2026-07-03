"use client";

import Link from "next/link";
import { useState } from "react";
import Script from "next/script";
import { useCart } from "@/components/CartProvider";
import { useAuth } from "@/components/AuthProvider";
import TrustStrip from "@/components/TrustStrip";
import { inr } from "@/lib/pricing";
import "@/lib/razorpay";

export default function CartPage() {
  const { items, remove, clear, count, totalPrice, totalMrp } = useCart();
  const { session, openLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function checkout() {
    if (!session) {
      openLogin({ force: true });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const authHeaders = { Authorization: `Bearer ${session.access_token}` };
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ items: items.map((l) => ({ kind: l.kind, key: l.key })) }),
      });
      if (res.status === 401) {
        openLogin({ force: true });
        return;
      }
      if (res.status === 503) {
        setMsg("Checkout isn't available right now. Please try again in a minute.");
        return;
      }
      const data = await res.json();
      if (data.error === "invalid_product" && typeof data.detail === "string") {
        // A line went stale (item renamed/removed) - drop it so the rest of
        // the cart can still check out instead of dead-ending.
        const stale = items.find((l) => l.key === data.detail);
        if (stale) {
          remove(stale.kind, stale.key);
          setMsg(`"${stale.name}" is no longer available and was removed from your cart. Please try again.`);
          return;
        }
      }
      if (!data.orderId || !data.cartId) {
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
        description: data.name,
        order_id: data.orderId,
        theme: { color: "#7c5cff" },
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
          if (vd.downloadUrl) {
            clear();
            window.location.href = vd.downloadUrl;
          } else {
            setMsg("Payment verification failed. If money was deducted, please contact support.");
          }
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
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <h1 className="text-2xl font-semibold text-zinc-100">Your cart</h1>

      {count === 0 ? (
        <div className="mt-10 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center">
          <p className="text-zinc-300">Your cart is empty.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Add templates as you browse, then pay for everything in one go.
          </p>
          <Link
            href="/workflows"
            className="mt-5 inline-block rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 font-medium text-white hover:opacity-95"
          >
            Browse templates
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <ul className="space-y-3 lg:col-span-2">
            {items.map((l) => (
              <li
                key={`${l.kind}:${l.key}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5"
              >
                <div className="min-w-0">
                  <Link
                    href={l.kind === "workflow" ? `/workflows/${l.key}` : `/bundles/${l.key}`}
                    className="line-clamp-1 font-medium text-zinc-100 hover:text-white"
                  >
                    {l.name}
                  </Link>
                  <div className="mt-1 flex items-baseline gap-2 text-sm">
                    <span className="font-semibold text-zinc-50">{inr(l.price)}</span>
                    {l.mrp > l.price && (
                      <span className="text-xs text-zinc-500 line-through">{inr(l.mrp)}</span>
                    )}
                    <span className="text-xs text-zinc-600">
                      {l.kind === "bundle" ? "Bundle" : "Template"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => remove(l.kind, l.key)}
                  aria-label={`Remove ${l.name} from cart`}
                  className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <aside>
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
              <h2 className="text-sm font-semibold text-zinc-200">Order summary</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">
                    {count} item{count > 1 ? "s" : ""}
                  </dt>
                  <dd className="text-zinc-300">{inr(totalPrice)}</dd>
                </div>
                {totalMrp > totalPrice && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">You save</dt>
                    <dd className="text-emerald-400">{inr(totalMrp - totalPrice)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-800/70 pt-2 text-base">
                  <dt className="font-medium text-zinc-200">Total</dt>
                  <dd className="font-semibold text-zinc-50">{inr(totalPrice)}</dd>
                </div>
              </dl>
              <button
                onClick={checkout}
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3 font-medium text-white hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Please wait..." : `Checkout ${inr(totalPrice)}`}
              </button>
              {msg && <p className="mt-3 text-sm text-amber-300">{msg}</p>}
              <TrustStrip />
              <p className="mt-3 text-center text-xs text-zinc-600">
                One payment, one ZIP with every template inside.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
