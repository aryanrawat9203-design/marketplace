import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createChatSubscription } from "@/lib/razorpay-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rs 49/month unlimited AI chat, via a Razorpay recurring Subscription
// (distinct from the one-time Orders used for template purchases).
export async function POST(req: NextRequest) {
  if (!rateLimit("chat-subscribe:" + clientIp(req), 10, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const subscription = await createChatSubscription(keyId, keySecret, user.id, user.email ?? undefined);
  if (!subscription) return NextResponse.json({ error: "subscription_failed" }, { status: 502 });

  return NextResponse.json({
    subscriptionId: subscription.id,
    keyId,
    name: "WorkflowCrate AI Chat - Unlimited",
  });
}
