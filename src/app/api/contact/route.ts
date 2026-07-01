import { NextRequest, NextResponse } from "next/server";
import { sendContactMessage } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const { name, email, message } = await req
    .json()
    .catch(() => ({}) as { name?: string; email?: string; message?: string });

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  const sent = await sendContactMessage({ name: name || "", email, message });
  if (!sent) {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
