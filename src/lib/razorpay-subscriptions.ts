// Thin REST wrapper for the two Razorpay Subscriptions API calls the chatbot
// paywall needs, matching the existing /api/checkout pattern of talking to
// the Razorpay REST API directly with Basic auth instead of an SDK.
//
// IMPORTANT: your Razorpay account must have Subscriptions activated
// (Dashboard -> Subscriptions -> Activate) before any of this will work -
// that toggle can only be set in the dashboard, not via API.

import crypto from "crypto";

const CHAT_PLAN_AMOUNT_PAISE = 4900; // Rs 49/month
const CHAT_PLAN_NAME = "WorkflowCrate AI Chat - Unlimited";

function authHeader(keyId: string, keySecret: string) {
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

let cachedPlanId: string | null = null;

// Reuses RAZORPAY_PLAN_ID if set (recommended for production - create
// the plan once and pin its id). Otherwise creates a monthly plan on first
// use and caches it in memory for this server instance's lifetime; the
// created id is logged so it can be copied into RAZORPAY_PLAN_ID to
// avoid creating a new plan on every cold start.
async function getOrCreateChatPlanId(keyId: string, keySecret: string): Promise<string | null> {
  const pinned = process.env.RAZORPAY_PLAN_ID;
  if (pinned) return pinned;
  if (cachedPlanId) return cachedPlanId;

  const res = await fetch("https://api.razorpay.com/v1/plans", {
    method: "POST",
    headers: { Authorization: authHeader(keyId, keySecret), "Content-Type": "application/json" },
    body: JSON.stringify({
      period: "monthly",
      interval: 1,
      item: {
        name: CHAT_PLAN_NAME,
        amount: CHAT_PLAN_AMOUNT_PAISE,
        currency: "INR",
        description: "Unlimited AI chat conversations, billed monthly",
      },
    }),
  });
  const plan = await res.json();
  if (!res.ok || !plan.id) {
    console.error("razorpay: plan creation failed", plan);
    return null;
  }
  console.log(`razorpay: created chat subscription plan ${plan.id} - set RAZORPAY_PLAN_ID to pin it`);
  cachedPlanId = plan.id;
  return plan.id;
}

export async function createChatSubscription(
  keyId: string,
  keySecret: string,
  userId: string,
  email?: string,
): Promise<{ id: string } | null> {
  const planId = await getOrCreateChatPlanId(keyId, keySecret);
  if (!planId) return null;

  const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: { Authorization: authHeader(keyId, keySecret), "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id: planId,
      customer_notify: 1,
      // Razorpay requires a fixed total_count - there's no literal "forever"
      // option. 120 monthly cycles (10 years) behaves as unlimited in
      // practice; the customer can still cancel at any time.
      total_count: 120,
      notes: { user_id: userId, ...(email ? { email } : {}) },
    }),
  });
  const sub = await res.json();
  if (!res.ok || !sub.id) {
    console.error("razorpay: subscription creation failed", sub);
    return null;
  }
  return { id: sub.id };
}

/** HMAC check for the checkout-time subscription payment signature (payment_id|subscription_id). */
export function verifySubscriptionSignature(
  keySecret: string,
  paymentId: string,
  subscriptionId: string,
  signature: string,
): boolean {
  const expected = crypto.createHmac("sha256", keySecret).update(`${paymentId}|${subscriptionId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
