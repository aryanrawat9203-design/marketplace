import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Creates a Razorpay order via the REST API (no SDK dependency needed).
export async function POST(req: NextRequest) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { slug } = await req.json().catch(() => ({ slug: undefined }));
  const product = getProduct(slug);
  if (!product || product.free) {
    return NextResponse.json({ error: "invalid_product" }, { status: 400 });
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(product.price * 100), // paise
      currency: product.currency || "INR",
      receipt: product.id,
      notes: { slug: product.slug },
    }),
  });

  const order = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: "order_failed", detail: order }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
    name: product.name,
  });
}
