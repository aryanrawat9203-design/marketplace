"use client";

import Link from "next/link";
import { useCart, type CartLine } from "./CartProvider";
import { inr } from "@/lib/pricing";

/** One-click "add every collection member to the cart" with in-cart state. */
export default function AddCollectionToCart({ lines }: { lines: CartLine[] }) {
  const { add, has } = useCart();
  const remaining = lines.filter((l) => !has(l.kind, l.key));
  const total = lines.reduce((s, l) => s + l.price, 0);

  if (lines.length === 0) return null;

  if (remaining.length === 0) {
    return (
      <Link
        href="/cart"
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 font-medium text-emerald-300 hover:bg-emerald-500/20"
      >
        All {lines.length} in cart &#10003; &middot; Go to checkout
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => remaining.forEach((l) => add(l))}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3 font-medium text-white hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
      >
        Add all {lines.length} to cart &middot; {inr(total)}
      </button>
      {remaining.length < lines.length && (
        <span className="text-sm text-zinc-500">
          {lines.length - remaining.length} already in your cart
        </span>
      )}
    </div>
  );
}
