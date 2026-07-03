import { NextRequest, NextResponse } from "next/server";
import { sendCustomRequest } from "@/lib/email";
import { recordLead } from "@/lib/leads";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUDGETS = ["Under Rs 2,000", "Rs 2,000 - 5,000", "Rs 5,000 - 15,000", "Rs 15,000+", "Not sure yet"];
const TIMELINES = ["As soon as possible", "Within 1-2 weeks", "Flexible"];

export async function POST(req: NextRequest) {
  if (!rateLimit("custom-request:" + clientIp(req), 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(
    () =>
      ({}) as {
        name?: string;
        email?: string;
        description?: string;
        apps?: string;
        budget?: string;
        timeline?: string;
      }
  );

  const email = (body.email ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const description = (body.description ?? "").trim();
  if (description.length < 20 || description.length > 4000) {
    return NextResponse.json({ error: "invalid_description" }, { status: 400 });
  }

  // Backup trail in the leads table so a mail hiccup never loses the contact.
  await recordLead(email, "custom-request");

  const sent = await sendCustomRequest({
    name: (body.name ?? "").trim().slice(0, 80),
    email,
    description,
    apps: (body.apps ?? "").trim().slice(0, 300),
    budget: BUDGETS.includes(body.budget ?? "") ? body.budget! : "Not specified",
    timeline: TIMELINES.includes(body.timeline ?? "") ? body.timeline! : "Not specified",
  });
  if (!sent) {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
