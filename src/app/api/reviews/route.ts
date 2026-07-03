import { NextRequest, NextResponse } from "next/server";
import { verifyReviewToken, submitReview } from "@/lib/reviews";
import { getPurchasable } from "@/lib/commerce";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: validate a review token and describe what it reviews (for the form).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const grant = verifyReviewToken(token);
  if (!grant) {
    return NextResponse.json({ error: "invalid_token" }, { status: 403 });
  }
  const item = getPurchasable(grant.kind, grant.ref);
  if (!item) return NextResponse.json({ error: "item_missing" }, { status: 404 });
  return NextResponse.json({ itemTitle: item.name, kind: grant.kind });
}

// POST: submit a review. Only possible with a signed token from a purchase email.
export async function POST(req: NextRequest) {
  if (!rateLimit("reviews:" + clientIp(req), 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { token, rating, authorName, title, body } = await req.json().catch(
    () =>
      ({}) as {
        token?: string;
        rating?: number;
        authorName?: string;
        title?: string;
        body?: string;
      }
  );

  const grant = verifyReviewToken(token ?? "");
  if (!grant) return NextResponse.json({ error: "invalid_token" }, { status: 403 });

  const ratingInt = Math.round(Number(rating));
  if (!Number.isFinite(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    return NextResponse.json({ error: "bad_rating" }, { status: 400 });
  }
  const text = (body ?? "").trim();
  if (text.length < 10 || text.length > 2000) {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }

  const result = await submitReview({
    grant,
    rating: ratingInt,
    authorName: (authorName ?? "").trim().slice(0, 60) || undefined,
    title: (title ?? "").trim().slice(0, 120) || undefined,
    body: text,
  });

  if (result === "unavailable") {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (result === "error") {
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
