import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { suggest } from "@/lib/catalog";
import { getUserFromRequest } from "@/lib/auth-server";
import { CHATBOT_CONFIG, chatbotSystemPromptIntro } from "@/lib/chatbot/config";
import { buildKnowledgeBaseSummary } from "@/lib/chatbot/knowledge-base";
import { getAIProvider, type ChatMessage } from "@/lib/chatbot/ai-provider";
import { getChatUsageStatus, startChatConversation, type ChatUsageStatus } from "@/lib/chatbot/usage";
import { signConversationToken, verifyConversationToken } from "@/lib/chatbot/conversation-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_REPLY =
  "Sorry, I'm having trouble replying right now. You can try again in a moment, or reach human support at /contact.";

type Body = {
  message?: unknown;
  history?: unknown;
  page?: unknown;
  conversationToken?: unknown;
};

function usageJson(status: ChatUsageStatus | null) {
  if (!status) return undefined;
  return {
    subscriptionActive: status.subscriptionActive,
    freeRemaining: status.freeRemaining,
    bonusRemaining: status.bonusConversations,
  };
}

// Strips ASCII control characters (codes 0-8, 11-31, 127) without embedding
// literal control bytes in source - some editors/terminals mangle those.
function stripControlChars(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    const isControl = (code <= 8) || (code >= 11 && code <= 31) || code === 127;
    if (!isControl) out += input[i];
  }
  return out;
}

function sanitizeText(input: unknown, maxLength: number): string {
  if (typeof input !== "string") return "";
  // Strip control characters (prompt-injection payloads and log noise often
  // rely on them) and hard-cap length before it ever reaches the model.
  return stripControlChars(input).trim().slice(0, maxLength);
}

function parseHistory(input: unknown, maxTurns: number, maxLength: number): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const cleaned: ChatMessage[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const role = (entry as { role?: unknown }).role;
    const content = sanitizeText((entry as { content?: unknown }).content, maxLength);
    if ((role === "user" || role === "assistant") && content) {
      cleaned.push({ role, content });
    }
  }
  // Keep only the most recent turns - bounds token cost on long sessions.
  return cleaned.slice(-maxTurns * 2);
}

export async function POST(req: NextRequest) {
  if (!CHATBOT_CONFIG.enabled) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const { limits } = CHATBOT_CONFIG;
  if (!rateLimit("chatbot:" + clientIp(req), limits.rateLimitPerWindow, limits.rateLimitWindowMs)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // The AI chat requires a signed-in account - no anonymous access. Every
  // other gate below (conversation count, subscription, expiry) hangs off
  // this verified user id; nothing here is trusted from the client.
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}) as Body);
  const message = sanitizeText(body.message, limits.maxMessageLength);
  const page = sanitizeText(body.page, 200);
  const history = parseHistory(body.history, limits.maxHistoryTurns, limits.maxMessageLength);
  const tokenStr = typeof body.conversationToken === "string" ? body.conversationToken : "";

  if (!message) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  // Whether this is a NEW conversation is decided from a server-signed token
  // bound to this user, never from whether the client's history array is
  // empty - a client could otherwise fabricate a non-empty history to look
  // like a "continuing" conversation and dodge the quota check forever.
  const existingToken = tokenStr ? verifyConversationToken(tokenStr, user.id) : null;

  let conversationId: string;
  let messageCount: number;
  let usageStatus: ChatUsageStatus | null;

  if (existingToken) {
    if (existingToken.n >= limits.maxMessagesPerConversation) {
      return NextResponse.json({ error: "conversation_message_limit" }, { status: 409 });
    }
    conversationId = existingToken.cid;
    messageCount = existingToken.n + 1;
    usageStatus = await getChatUsageStatus(user.id);
  } else {
    // Genuinely new conversation - blunt throwaway-account gaming with a
    // per-IP cap on top of the per-user quota enforced below.
    if (!rateLimit("chatbot-newconvo:" + clientIp(req), limits.newConversationsPerIpPerDay, 24 * 60 * 60 * 1000)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const result = await startChatConversation(user.id);
    if (!result) {
      return NextResponse.json({ error: "usage_unavailable" }, { status: 503 });
    }
    if (!result.allowed) {
      return NextResponse.json({ error: "limit_reached", usage: usageJson(result.status) }, { status: 402 });
    }
    conversationId = crypto.randomUUID();
    messageCount = 1;
    usageStatus = result.status;
  }

  const conversationToken = signConversationToken(user.id, conversationId, messageCount);

  const provider = getAIProvider();
  if (!provider) {
    return NextResponse.json({
      reply: FALLBACK_REPLY,
      configured: false,
      conversationToken,
      usage: usageJson(usageStatus),
    });
  }

  const related = suggest(message).templates.slice(0, 4);
  const relatedBlock = related.length
    ? "Relevant templates for this question (only mention ones actually relevant):\n" +
      related
        .map(
          (t) =>
            `- ${t.title} (/workflows/${t.route}) - ${t.free ? "free" : `Rs${t.price}`}${t.category ? `, ${t.category}` : ""}`,
        )
        .join("\n")
    : "";

  const system = [
    chatbotSystemPromptIntro(),
    buildKnowledgeBaseSummary(),
    page ? `The user is currently viewing: ${page}` : "",
    relatedBlock,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const reply = await provider.generateReply({
      system,
      messages: [...history, { role: "user", content: message }],
    });
    if (!reply) {
      return NextResponse.json({
        reply: FALLBACK_REPLY,
        configured: true,
        conversationToken,
        usage: usageJson(usageStatus),
      });
    }
    return NextResponse.json({ reply, configured: true, conversationToken, usage: usageJson(usageStatus) });
  } catch {
    return NextResponse.json(
      { reply: FALLBACK_REPLY, configured: true, conversationToken, usage: usageJson(usageStatus) },
      { status: 200 },
    );
  }
}
