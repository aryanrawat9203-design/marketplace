"use client";

import { useEffect, useState } from "react";
import BuyButton, { type BuyItem } from "./BuyButton";
import { inr } from "@/lib/pricing";

/** Mobile-only bar that keeps price + Buy in reach once the buy box scrolls away. */
export default function StickyBuyBar({
  item,
  mrp,
  requireLogin,
}: {
  item: BuyItem;
  mrp: number;
  requireLogin: boolean;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 480);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (item.free || !show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-[#0b0b11]/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-medium text-zinc-200">{item.name}</div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-zinc-50">{inr(item.price)}</span>
            {mrp > item.price && <span className="text-xs text-zinc-500 line-through">{inr(mrp)}</span>}
          </div>
        </div>
        <div className="shrink-0">
          <BuyButton item={item} requireLogin={requireLogin} />
        </div>
      </div>
    </div>
  );
}
