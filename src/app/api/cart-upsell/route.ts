import { NextRequest, NextResponse } from "next/server";
import { bundleUpsell, type CartRef } from "@/lib/cart-upsell";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same ceiling as /api/checkout - a cart that can't be bought doesn't need a
// recommendation about it either.
const MAX_ITEMS = 100;

/**
 * What the cart would cost as a bundle, priced server-side.
 *
 * The cart lives in localStorage, so the browser has to ask; but it asks with
 * routes only and is told the price, never the other way round. This is the
 * same rule /api/checkout follows, and for the same reason - the number shown
 * next to "you save" has to be the number that gets charged.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit("upsell:" + clientIp(req), 60, 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    items?: Array<{ kind?: string; key?: string }>;
  };

  const seen = new Set<string>();
  const refs: CartRef[] = [];
  for (const raw of (body.items ?? []).slice(0, MAX_ITEMS)) {
    if (raw?.kind !== "workflow" && raw?.kind !== "bundle") continue;
    if (!raw.key || typeof raw.key !== "string") continue;
    const id = `${raw.kind}:${raw.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    refs.push({ kind: raw.kind, key: raw.key });
  }

  return NextResponse.json({ upsell: bundleUpsell(refs) });
}
