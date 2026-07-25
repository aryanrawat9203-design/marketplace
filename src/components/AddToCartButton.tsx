"use client";

import Link from "next/link";
import { useCart, type CartLine } from "./CartProvider";

/** Secondary action next to Buy: queue the item for a combined checkout. */
export default function AddToCartButton({ line, block = false }: { line: CartLine; block?: boolean }) {
  const { add, has } = useCart();
  const w = block ? "w-full" : "";

  if (has(line.kind, line.key)) {
    return (
      <Link
        href="/cart"
        className={`mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 ${w}`}
      >
        In cart &#10003; &middot; View cart
      </Link>
    );
  }

  return (
    <button onClick={() => add(line)} className={`btn-secondary mt-2 px-6 py-3 text-sm ${w}`}>
      Add to cart
    </button>
  );
}
