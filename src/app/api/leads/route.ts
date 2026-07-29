import { NextRequest, NextResponse } from "next/server";
import { recordLead } from "@/lib/leads";
import { sendStarterPack } from "@/lib/email";
import { starterPackItems } from "@/lib/starter-pack";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { baseUrl } from "@/lib/site";

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
    const { shouldSendPack, email: normalized } = await recordLead(
      email,
      source || "free-download",
    );

    // The signup form promises free templates in your inbox - this is what
    // keeps that promise. Honoured on every genuine request, never fatal.
    if (shouldSendPack) {
      const base = baseUrl();
      await sendStarterPack({
        to: normalized,
        packUrl: `${base}/api/starter-pack`,
        packPageUrl: `${base}/free`,
        count: starterPackItems().length,
      }).catch(() => false);
    }
  }

  return NextResponse.json({ ok: true });
}
