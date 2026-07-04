import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifySubscriptionSignature } from "@/lib/razorpay-subscriptions";
import { setChatSubscription, getChatUsageStatus } from "@/lib/chatbot/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Signature check here is just for instant UX - it unlocks the widget the
// moment checkout succeeds instead of waiting for the webhook to arrive. The
// Razorpay webhook (/api/webhooks/razorpay) remains the source of truth for
// ongoing renewals and cancellations, and will correct this if it ever
// disagrees (e.g. a payment that later fails/reverses).
export async function POST(req: NextRequest) {
  if (!rateLimit("chat-subscribe-verify:" + clientIp(req), 20, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { subscriptionId, paymentId, signature } = await req
    .json()
    .catch(() => ({}) as Record<string, string>);
  if (!subscriptionId || !paymentId || !signature) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (!verifySubscriptionSignature(keySecret, paymentId, subscriptionId, signature)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  // A short optimistic window - the webhook refreshes this on every
  // successful monthly charge (subscription.charged) and lets it lapse if
  // renewals stop, so a missed/late webhook self-heals back to the free tier
  // instead of granting unlimited access forever.
  const optimisticExpiry = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);
  await setChatSubscription(user.id, true, optimisticExpiry, subscriptionId);

  const status = await getChatUsageStatus(user.id);
  return NextResponse.json({ ok: true, subscriptionActive: status?.subscriptionActive ?? true });
}
