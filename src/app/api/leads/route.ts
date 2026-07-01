import { NextRequest, NextResponse } from "next/server";
import { recordLead } from "@/lib/leads";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fire-and-forget lead capture on the free-download flow. Always returns ok
// so a failure here never blocks the download that triggered it.
export async function POST(req: NextRequest) {
  if (!rateLimit("leads:" + clientIp(req), 10, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: true });
  }

  const { email, source } = await req
    .json()
    .catch(() => ({}) as { email?: string; source?: string });

  if (email && EMAIL_RE.test(email)) {
    await recordLead(email, source || "free-download");
  }

  return NextResponse.json({ ok: true });
}
