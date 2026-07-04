import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { suggest } from "@/lib/catalog";
import { CHATBOT_CONFIG, chatbotSystemPromptIntro } from "@/lib/chatbot/config";
import { buildKnowledgeBaseSummary } from "@/lib/chatbot/knowledge-base";
import { getAIProvider, type ChatMessage } from "@/lib/chatbot/ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_REPLY =
  "Sorry, I'm having trouble replying right now. You can try again in a moment, or reach human support at /contact.";

type Body = {
  message?: unknown;
  history?: unknown;
  page?: unknown;
};

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

  const body = await req.json().catch(() => ({}) as Body);
  const message = sanitizeText(body.message, limits.maxMessageLength);
  const page = sanitizeText(body.page, 200);
  const history = parseHistory(body.history, limits.maxHistoryTurns, limits.maxMessageLength);

  if (!message) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  const provider = getAIProvider();
  if (!provider) {
    return NextResponse.json({ reply: FALLBACK_REPLY, configured: false });
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
      return NextResponse.json({ reply: FALLBACK_REPLY, configured: true });
    }
    return NextResponse.json({ reply, configured: true });
  } catch {
    return NextResponse.json({ reply: FALLBACK_REPLY, configured: true }, { status: 200 });
  }
}
