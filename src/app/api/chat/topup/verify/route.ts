import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getUserFromRequest } from "@/lib/auth-server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { addBonusConversations, getChatUsageStatus } from "@/lib/chatbot/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!rateLimit("chat-topup-verify:" + clientIp(req), 20, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { orderId, paymentId, signature } = await req
    .json()
    .catch(() => ({}) as Record<string, string>);
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
  });
  if (!orderRes.ok) return NextResponse.json({ error: "order_fetch_failed" }, { status: 502 });

  const rzpOrder = (await orderRes.json()) as {
    notes?: { type?: string; user_id?: string; bonus?: string };
  };
  const notes = rzpOrder.notes || {};
  // What gets credited, to whom, and how much comes only from the order's
  // own notes (set server-side at checkout) - never from the request body,
  // otherwise a cheap payment could credit an arbitrary user or amount.
  if (notes.type !== "chat_topup" || notes.user_id !== user.id) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }
  const bonus = Number(notes.bonus) || 0;
  if (bonus <= 0) return NextResponse.json({ error: "invalid_order" }, { status: 400 });

  await addBonusConversations(user.id, paymentId, bonus);

  const status = await getChatUsageStatus(user.id);
  return NextResponse.json({ ok: true, bonusRemaining: status?.bonusConversations });
}
