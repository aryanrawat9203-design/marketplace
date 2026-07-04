import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { getChatUsageStatus } from "@/lib/chatbot/usage";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lets the widget show "N free conversations left" as soon as it opens,
// without waiting for the user to send a message first. Read-only - never
// consumes quota.
export async function GET(req: NextRequest) {
  if (!rateLimit("chatbot-usage:" + clientIp(req), 30, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const status = await getChatUsageStatus(user.id);
  if (!status) return NextResponse.json({ error: "usage_unavailable" }, { status: 503 });

  return NextResponse.json({
    subscriptionActive: status.subscriptionActive,
    freeRemaining: status.freeRemaining,
    bonusRemaining: status.bonusConversations,
  });
}
