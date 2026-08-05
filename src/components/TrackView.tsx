"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

/** Fires one view_item per product page load; rendered by the server page. */
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
    track("view_item", { item, kind, price });
  }, [item, kind, price]);

  return null;
}
