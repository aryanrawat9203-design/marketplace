// Server-only usage/paywall logic for the AI chatbot. Every check here reads
// or writes through the chat_usage_* Postgres functions (see
// SUPABASE_SETUP_CHATBOT_LIMITS.sql) using the service-role admin client, so
// none of it is reachable from the browser - the API routes are the only
// callers, and they always identify the user from a verified Supabase
// session, never from anything the client claims.

import { createAdminClient } from "@/lib/supabase/admin";
import { hasFreeAccess } from "@/lib/entitlements";
import { CHATBOT_CONFIG } from "./config";

export type ChatUsageStatus = {
  subscriptionActive: boolean;
  subscriptionExpiresAt: string | null;
  conversationCount: number;
  bonusConversations: number;
  freeRemaining: number;
  /** freeRemaining + bonusConversations - meaningless once subscriptionActive. */
  totalRemaining: number;
};

type StatusRow = {
  conversation_count: number;
  bonus_conversations: number;
  free_remaining: number;
  subscription_active: boolean;
  subscription_expires_at: string | null;
};

function toStatus(row: StatusRow): ChatUsageStatus {
  return {
    subscriptionActive: row.subscription_active,
    subscriptionExpiresAt: row.subscription_expires_at,
    conversationCount: row.conversation_count,
    bonusConversations: row.bonus_conversations,
    freeRemaining: row.free_remaining,
    totalRemaining: row.free_remaining + row.bonus_conversations,
  };
}

// Full-access accounts always read as an active subscriber - never hits the
// DB, never consumes quota, no expiry.
const FREE_ACCESS_STATUS: ChatUsageStatus = {
  subscriptionActive: true,
  subscriptionExpiresAt: null,
  conversationCount: 0,
  bonusConversations: 0,
  freeRemaining: 0,
  totalRemaining: 0,
};

/** Read-only usage snapshot - safe to call as often as the UI wants, never consumes quota. */
export async function getChatUsageStatus(
  userId: string,
  email?: string | null
): Promise<ChatUsageStatus | null> {
  if (hasFreeAccess(email)) return FREE_ACCESS_STATUS;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .rpc("chat_usage_status", {
      p_user_id: userId,
      p_free_quota: CHATBOT_CONFIG.limits.freeConversationsPerPeriod,
      p_period_days: CHATBOT_CONFIG.limits.periodDays,
    })
    .single<StatusRow>();
  if (error || !data) return null;
  return toStatus(data);
}

export type StartConversationResult =
  | { allowed: true; reason: "free" | "bonus" | "subscription"; status: ChatUsageStatus }
  | { allowed: false; reason: "limit_reached"; status: ChatUsageStatus };

/**
 * Atomically checks and consumes one unit of new-conversation quota. Must
 * only be called once per genuinely new conversation, never per message -
 * callers decide "new" via a server-verified conversation token, not
 * anything the client can toggle (see conversation-token.ts).
 */
export async function startChatConversation(
  userId: string,
  email?: string | null
): Promise<StartConversationResult | null> {
  if (hasFreeAccess(email)) {
    return { allowed: true, reason: "subscription", status: FREE_ACCESS_STATUS };
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .rpc("chat_usage_start_conversation", {
      p_user_id: userId,
      p_free_quota: CHATBOT_CONFIG.limits.freeConversationsPerPeriod,
      p_period_days: CHATBOT_CONFIG.limits.periodDays,
    })
    .single<StatusRow & { allowed: boolean; reason: string }>();
  if (error || !data) return null;
  const status = toStatus(data);
  if (data.allowed) {
    return { allowed: true, reason: data.reason as "free" | "bonus" | "subscription", status };
  }
  return { allowed: false, reason: "limit_reached", status };
}

/** Credits bonus conversations after a verified top-up payment. Idempotent per Razorpay payment id. */
export async function addBonusConversations(
  userId: string,
  paymentId: string,
  amount: number
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin.rpc("chat_usage_add_bonus", {
    p_user_id: userId,
    p_payment_id: paymentId,
    p_amount: amount,
  });
  return !error;
}

/** Sets/clears subscription state - called from checkout verify (optimistic) and the Razorpay webhook (authoritative). */
export async function setChatSubscription(
  userId: string,
  active: boolean,
  expiresAt: Date | null,
  subscriptionId: string | null
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin.rpc("chat_usage_set_subscription", {
    p_user_id: userId,
    p_active: active,
    p_expires_at: expiresAt ? expiresAt.toISOString() : null,
    p_subscription_id: subscriptionId,
  });
  return !error;
}
