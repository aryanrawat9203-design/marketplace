import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { CHATBOT_CONFIG } from "@/lib/chatbot/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function createRazorpayOrder(
  keyId: string,
  keySecret: string,
  amountPaise: number,
  receipt: string,
  notes: Record<string, string>,
) {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes }),
  });
  const order = await res.json();
  return { ok: res.ok, order };
}

// One-time top-up: +10 AI chat conversations for Rs 29, no subscription.
export async function POST(req: NextRequest) {
  if (!rateLimit("chat-topup:" + clientIp(req), 10, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { topupBonusConversations, topupPricePaise } = CHATBOT_CONFIG.limits;

  const { ok, order } = await createRazorpayOrder(
    keyId,
    keySecret,
    topupPricePaise,
    `chattopup_${user.id}_${Date.now()}`,
    { type: "chat_topup", user_id: user.id, bonus: String(topupBonusConversations) },
  );
  if (!ok) return NextResponse.json({ error: "order_failed", detail: order }, { status: 500 });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
    name: `+${topupBonusConversations} AI chat conversations`,
  });
}
