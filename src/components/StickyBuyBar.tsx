"use client";

import { useEffect, useState } from "react";
import BuyButton, { type BuyItem } from "./BuyButton";
import { inr } from "@/lib/pricing";

/** Mobile-only bar that keeps price + Buy in reach once the buy box scrolls away. */
export default function StickyBuyBar({
  item,
  requireLogin,
}: {
  item: BuyItem;
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
    <div className="anim-rise fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-surface-2/95 px-4 py-3 shadow-[0_-12px_32px_rgb(0_0_0/0.5)] backdrop-blur-md [animation-duration:300ms] lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-medium text-body">{item.name}</div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-semibold tracking-tight text-ink">{inr(item.price)}</span>
          </div>
        </div>
        <div className="shrink-0">
          <BuyButton item={item} requireLogin={requireLogin} />
        </div>
      </div>
    </div>
  );
}
