import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPurchasable, signDownload, type Kind } from "@/lib/commerce";
import { getUserFromRequest } from "@/lib/auth-server";
import { sendOrderConfirmation } from "@/lib/email";
import { baseUrl } from "@/lib/site";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// Verifies Razorpay payment signature, then issues a secure, time-limited link.
export async function POST(req: NextRequest) {
  if (!rateLimit("verify:" + clientIp(req), 20, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { orderId, paymentId, signature, kind, key } = await req
    .json()
    .catch(() => ({}) as Record<string, string>);

  if (!orderId || !paymentId || !signature || !kind || !key) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expected !== signature) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const item = getPurchasable(kind as Kind, key);
  if (!item) return NextResponse.json({ error: "invalid_product" }, { status: 400 });

  const token = signDownload(item.kind, item.key);

  if (user.email) {
    try {
      const emailToken = signDownload(item.kind, item.key, THIRTY_DAYS);
      const emailDownloadUrl = `${baseUrl()}/api/download?token=${encodeURIComponent(emailToken)}`;
      await sendOrderConfirmation({
        to: user.email,
        orderId,
        itemTitle: item.name,
        amountInPaise: Math.round(item.price * 100),
        downloadUrl: emailDownloadUrl,
      });
    } catch {
      // A failed confirmation email must never block the download response.
    }
  }

  return NextResponse.json({ downloadUrl: `/api/download?token=${encodeURIComponent(token)}` });
}
