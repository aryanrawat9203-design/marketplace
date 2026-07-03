import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCartRecord } from "@/lib/cart-store";
import { getPurchasable, type Kind } from "@/lib/commerce";
import { signReviewToken, reviewedKeysForEmail } from "@/lib/reviews";
import { sendReviewFollowup } from "@/lib/email";
import { baseUrl } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FOLLOWUP_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
// Orders older than this never get a followup even if the cron was down -
// a "how did it go?" nudge six weeks late does more harm than good.
const MAX_LOOKBACK_MS = 45 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 50;
const MAX_ITEMS_PER_EMAIL = 5;

type OrderRow = {
  id: string;
  email: string;
  item_kind: string;
  item_ref: string;
  item_title: string | null;
};

async function candidateItems(order: OrderRow): Promise<{ kind: Kind; ref: string; title: string }[]> {
  if (order.item_kind !== "cart") {
    return [{ kind: order.item_kind as Kind, ref: order.item_ref, title: order.item_title || "Your template" }];
  }
  const cart = await getCartRecord(order.item_ref);
  if (!cart) return [];
  return cart.items.map((it) => ({
    kind: it.kind,
    ref: it.key,
    title: getPurchasable(it.kind, it.key)?.name ?? "Your template",
  }));
}

// Daily nudge, triggered by Vercel Cron: for every paid order that's ~7+
// days old and hasn't been processed yet, email a review link for whichever
// purchased items the buyer hasn't already reviewed. Every order is marked
// processed exactly once, whether or not an email actually goes out, so this
// can never re-scan the same order or send a second nudge.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const now = Date.now();
  const recentCutoff = new Date(now - FOLLOWUP_AFTER_MS).toISOString();
  const oldCutoff = new Date(now - MAX_LOOKBACK_MS).toISOString();

  const { data, error } = await admin
    .from("orders")
    .select("id, email, item_kind, item_ref, item_title")
    .eq("status", "paid")
    .is("review_followup_sent_at", null)
    .lte("created_at", recentCutoff)
    .gte("created_at", oldCutoff)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("review-followup cron: order scan failed", error);
    return NextResponse.json({ error: "scan_failed" }, { status: 500 });
  }

  const orders = (data ?? []) as OrderRow[];
  let emailed = 0;

  for (const order of orders) {
    try {
      const reviewed = await reviewedKeysForEmail(order.email);
      const items = await candidateItems(order);
      const pending = items.filter((i) => !reviewed.has(`${i.kind}:${i.ref}`));

      if (pending.length > 0) {
        const links = pending.slice(0, MAX_ITEMS_PER_EMAIL).map((i) => ({
          title: i.title,
          reviewUrl: `${baseUrl()}/review?token=${encodeURIComponent(
            signReviewToken({ kind: i.kind, ref: i.ref, email: order.email }),
          )}`,
        }));
        const sent = await sendReviewFollowup(order.email, links);
        if (sent) emailed++;
      }
    } catch (err) {
      // One bad order must never abort the batch or block marking it done.
      console.error("review-followup cron: order failed", order.id, err);
    }

    await admin
      .from("orders")
      .update({ review_followup_sent_at: new Date().toISOString() })
      .eq("id", order.id);
  }

  return NextResponse.json({ processed: orders.length, emailed });
}
