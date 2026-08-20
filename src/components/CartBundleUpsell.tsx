"use client";

import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import BundleUpsellNote from "./BundleUpsellNote";
import type { BundleUpsell } from "@/lib/cart-upsell";

const DISMISS_KEY = "wc:upsell-dismissed";

/**
 * Offers the cheaper bundle when the cart is entirely inside one.
 *
 * The cart is in localStorage, so the answer has to come from the server -
 * and it has to come from the server anyway, because the price it quotes must
 * be the price /api/checkout charges. The browser sends routes and is told
 * the numbers; it never computes them.
 */
export default function CartBundleUpsell() {
  const { items, clear, add } = useCart();
  const [upsell, setUpsell] = useState<BundleUpsell | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Session-scoped, not persisted: dismissing today's suggestion shouldn't
  // silence a different bundle a different cart qualifies for next week.
  // Deferred, like every other client-only storage read here, so it never
  // runs during hydration.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(DISMISS_KEY);
        if (raw) setDismissed(JSON.parse(raw) as string[]);
      } catch {
        /* private mode - nothing to restore */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const signature = JSON.stringify(items.map((l) => ({ kind: l.kind, key: l.key })));

  useEffect(() => {
    let live = true;
    fetch("/api/cart-upsell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: `{"items":${signature}}`,
    })
      .then((r) => (r.ok ? r.json() : { upsell: null }))
      .then((d) => {
        if (live) setUpsell((d.upsell as BundleUpsell | null) ?? null);
      })
      .catch(() => {
        // A cross-sell that fails to load is not an error worth showing.
        if (live) setUpsell(null);
      });
    return () => {
      live = false;
    };
  }, [signature]);

  if (items.length === 0 || !upsell || dismissed.includes(upsell.slug)) return null;

  function keep(slug: string) {
    const next = [...dismissed, slug];
    setDismissed(next);
    try {
      sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* private mode - the in-memory state still hides it */
    }
  }

  const bundle = upsell;
  return (
    <div className="mt-6">
      <BundleUpsellNote upsell={bundle} totalLabel="Your cart">
        <button
          onClick={() => {
            clear();
            add({
              kind: "bundle",
              key: bundle.slug,
              name: bundle.name,
              price: bundle.bundlePrice,
              mrp: bundle.bundlePrice,
            });
          }}
          className="btn-primary btn-md"
        >
          Swap for the bundle
        </button>
        <button onClick={() => keep(bundle.slug)} className="btn-secondary btn-md">
          Keep my selection
        </button>
      </BundleUpsellNote>
    </div>
  );
}
