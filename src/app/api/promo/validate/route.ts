import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getUserFromRequest } from "@/lib/auth-server";
import { validatePromoCode } from "@/lib/promo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight, non-mutating check so the UI can show a discounted total
// before payment. The real charge amount is always recomputed from scratch
// (and re-validated) inside /api/checkout - this endpoint is display-only.
export async function POST(req: NextRequest) {
  if (!rateLimit("promo-validate:" + clientIp(req), 20, 5 * 60 * 1000)) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  const { code } = await req.json().catch(() => ({}) as { code?: string });
  if (!code || typeof code !== "string") {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 400 });
  }

  const user = await getUserFromRequest(req);
  const result = await validatePromoCode(code, user?.email);
  return NextResponse.json(result);
}
