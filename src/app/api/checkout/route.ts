import { NextRequest, NextResponse } from "next/server";
import { getPurchasable, type Kind } from "@/lib/commerce";
import { getUserFromRequest } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Creates a Razorpay order via the REST API (no SDK dependency needed).
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { kind, key } = await req
    .json()
    .catch(() => ({}) as { kind?: Kind; key?: string });
  if (!kind || !key) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const item = getPurchasable(kind, key);
  if (!item || item.free || item.price <= 0) {
    return NextResponse.json({ error: "invalid_product" }, { status: 400 });
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(item.price * 100),
      currency: item.currency || "INR",
      receipt: `${item.kind}_${item.key}`.slice(0, 40),
      notes: { kind: item.kind, key: item.key, name: item.name },
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
    name: item.name,
  });
}
