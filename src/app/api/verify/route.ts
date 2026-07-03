import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPurchasable, signDownload, type Kind } from "@/lib/commerce";
import { getCartRecord } from "@/lib/cart-store";
import { getUserFromRequest } from "@/lib/auth-server";
import { signReviewToken } from "@/lib/reviews";
import { sendOrderConfirmation } from "@/lib/email";
import { baseUrl } from "@/lib/site";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { requireLoginToBuy } from "@/lib/require-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// Verifies Razorpay payment signature, then issues a secure, time-limited link.
export async function POST(req: NextRequest) {
  if (!rateLimit("verify:" + clientIp(req), 20, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = await getUserFromRequest(req);
  if (requireLoginToBuy() && !user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { orderId, paymentId, signature } = await req
    .json()
    .catch(() => ({}) as Record<string, string>);

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const sigA = Buffer.from(expected);
  const sigB = Buffer.from(signature);
  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  // The signature only proves that THIS order was paid. What was bought must
  // come from the order's server-set notes (written at checkout), never from
  // the request body - otherwise a cheap payment could unlock any product.
  const orderRes = await fetch(
    `https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
    }
  );
  if (!orderRes.ok) {
    return NextResponse.json({ error: "order_fetch_failed" }, { status: 502 });
  }
  const rzpOrder = (await orderRes.json()) as {
    amount?: number;
    notes?: { kind?: string; key?: string };
  };
  const kind = rzpOrder.notes?.kind;
  const key = rzpOrder.notes?.key;
  if (!kind || !key) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  if (kind === "cart") {
    const cart = await getCartRecord(key);
    if (!cart) return NextResponse.json({ error: "invalid_product" }, { status: 400 });

    const token = signDownload("cart", cart.id);
    if (user?.email) {
      try {
        const emailToken = signDownload("cart", cart.id, THIRTY_DAYS);
        await sendOrderConfirmation({
          to: user.email,
          orderId,
          itemTitle: `${cart.items.length} template${cart.items.length > 1 ? "s" : ""} (cart)`,
          amountInPaise: cart.amountPaise,
          downloadUrl: `${baseUrl()}/api/download?token=${encodeURIComponent(emailToken)}`,
        });
      } catch {
        // A failed confirmation email must never block the download response.
      }
    }
    return NextResponse.json({ downloadUrl: `/api/download?token=${encodeURIComponent(token)}` });
  }

  const item = getPurchasable(kind as Kind, key);
  if (!item) return NextResponse.json({ error: "invalid_product" }, { status: 400 });

  const token = signDownload(item.kind, item.key);

  if (user?.email) {
    try {
      const emailToken = signDownload(item.kind, item.key, THIRTY_DAYS);
      const emailDownloadUrl = `${baseUrl()}/api/download?token=${encodeURIComponent(emailToken)}`;
      const reviewToken = signReviewToken({ kind: item.kind, ref: item.key, email: user.email });
      await sendOrderConfirmation({
        to: user.email,
        orderId,
        itemTitle: item.name,
        amountInPaise: Math.round(item.price * 100),
        downloadUrl: emailDownloadUrl,
        reviewUrl: `${baseUrl()}/review?token=${encodeURIComponent(reviewToken)}`,
      });
    } catch {
      // A failed confirmation email must never block the download response.
    }
  }

  return NextResponse.json({ downloadUrl: `/api/download?token=${encodeURIComponent(token)}` });
}
