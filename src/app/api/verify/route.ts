import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getProduct, signDownload } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verifies Razorpay payment signature, then issues a secure, time-limited download link.
export async function POST(req: NextRequest) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { orderId, paymentId, signature, slug } = await req
    .json()
    .catch(() => ({}) as Record<string, string>);

  if (!orderId || !paymentId || !signature || !slug) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expected !== signature) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const product = getProduct(slug);
  if (!product) return NextResponse.json({ error: "invalid_product" }, { status: 400 });

  const token = signDownload(product.id);
  return NextResponse.json({ downloadUrl: `/api/download?token=${encodeURIComponent(token)}` });
}
