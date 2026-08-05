"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

/**
 * Reports one product-page view.
 *
 * Deliberately delayed: firing on mount raced the analytics script, and any
 * event sent before it finished loading was queued and never delivered - the
 * first funnel step was silently missing every time. Waiting also means a
 * view has to last a moment to count, which is closer to what "viewed" means
 * than a bounce that never rendered.
 */
const VIEW_DELAY_MS = 1500;

export default function TrackView({
  item,
  kind,
  price,
}: {
  item: string;
  kind: string;
  price: number;
}) {
  useEffect(() => {
    const t = setTimeout(() => {
      track("view_item", { item, kind, price });
    }, VIEW_DELAY_MS);
    return () => clearTimeout(t);
  }, [item, kind, price]);

  return null;
}
