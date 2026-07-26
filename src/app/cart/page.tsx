"use client";

import Link from "next/link";
import { useState } from "react";
import Script from "next/script";
import { useCart } from "@/components/CartProvider";
import { useAuth } from "@/components/AuthProvider";
import TrustStrip from "@/components/TrustStrip";
import PromoCodeField, { type AppliedPromo } from "@/components/PromoCodeField";
import { inr } from "@/lib/pricing";
import "@/lib/razorpay";

export default function CartPage() {
  const { items, remove, clear, count, totalPrice, totalMrp } = useCart();
  const { session, openLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);

  // Display-only estimate; /api/checkout re-validates the code and computes
  // the actual charge amount from scratch.
  const discountedTotal = promo
    ? Math.max(0, Math.round((totalPrice * (100 - promo.discountPercent)) / 100))
    : totalPrice;

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
        body: JSON.stringify({
          items: items.map((l) => ({ kind: l.kind, key: l.key })),
          ...(promo ? { promoCode: promo.code } : {}),
        }),
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
      if (data.error === "invalid_promo") {
        setPromo(null);
        setMsg("Your promo code is no longer valid and was removed. Please try again.");
        return;
      }
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
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-2.5 text-2xl font-semibold text-ink sm:text-3xl">Your cart</h1>

      {count === 0 ? (
        <div className="card mt-10 p-10 text-center">
          <div
            aria-hidden="true"
            className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-faint"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <p className="mt-4 text-body">Your cart is empty.</p>
          <p className="mt-2 text-sm text-faint">
            Add templates as you browse, then pay for everything in one go.
          </p>
          <Link href="/workflows" className="btn-primary btn-md mt-6 ">
            Browse templates
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <ul className="space-y-3 lg:col-span-2">
            {items.map((l) => (
              <li
                key={`${l.kind}:${l.key}`}
                className="card flex items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <Link
                    href={l.kind === "workflow" ? `/workflows/${l.key}` : `/bundles/${l.key}`}
                    className="line-clamp-1 font-medium text-ink transition-colors hover:text-white"
                  >
                    {l.name}
                  </Link>
                  <div className="mt-1 flex items-baseline gap-2 text-sm">
                    <span className="font-display font-semibold tracking-tight text-ink">{inr(l.price)}</span>
                    {l.mrp > l.price && (
                      <span className="text-xs text-faint line-through">{inr(l.mrp)}</span>
                    )}
                    <span className="text-xs text-faint">
                      {l.kind === "bundle" ? "Bundle" : "Template"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => remove(l.kind, l.key)}
                  aria-label={`Remove ${l.name} from cart`}
                  className="btn-secondary btn-sm shrink-0 text-muted hover:text-body"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <aside>
            <div className="card-raised p-5">
              <h2 className="text-sm font-semibold text-body">Order summary</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-faint">
                    {count} item{count > 1 ? "s" : ""}
                  </dt>
                  <dd className="text-body">{inr(totalPrice)}</dd>
                </div>
                {totalMrp > totalPrice && (
                  <div className="flex justify-between">
                    <dt className="text-faint">You save</dt>
                    <dd className="text-emerald-400">{inr(totalMrp - totalPrice)}</dd>
                  </div>
                )}
                {promo && (
                  <div className="flex justify-between">
                    <dt className="text-faint">Promo ({promo.code})</dt>
                    <dd className="text-emerald-400">-{inr(totalPrice - discountedTotal)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/[0.08] pt-2 text-base">
                  <dt className="font-medium text-body">Total</dt>
                  <dd className="font-display font-semibold tracking-tight text-ink">{inr(discountedTotal)}</dd>
                </div>
              </dl>

              <div className="mt-4">
                <PromoCodeField onApplied={setPromo} />
              </div>

              <button onClick={checkout} disabled={loading} className="btn-primary btn-lg mt-4 w-full ">
                {loading ? "Please wait..." : `Checkout ${inr(discountedTotal)}`}
              </button>
              {msg && <p className="mt-3 text-sm text-amber-300">{msg}</p>}
              <TrustStrip />
              <p className="mt-3 text-center text-xs text-faint">
                One payment, one ZIP with every template inside.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
