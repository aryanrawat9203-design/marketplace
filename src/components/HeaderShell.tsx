"use client";

import { ReactNode, useEffect, useState } from "react";

/** Distance scrolled before the header condenses. Roughly one hero line, so
 *  it settles into the compact state as soon as you're reading content. */
const CONDENSE_AT = 24;

/**
 * Sticky header chrome that condenses once the page scrolls: the row loses
 * 8px of height, the backdrop goes more opaque, and a hairline + drop shadow
 * appear to separate it from the content sliding under it.
 *
 * Uses a passive scroll listener reading `window.scrollY` — a cheap read that
 * doesn't force layout — matching the pattern StickyBuyBar already uses. The
 * height transition is on the inner row, not the <header>, so the sticky box
 * itself never changes size and nothing below it jumps.
 */
export default function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > CONDENSE_AT);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header data-scrolled={scrolled || undefined} className="site-header">
      <div className="site-header-row">{children}</div>
    </header>
  );
}
