import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminConfigured, checkAdminPassword, signAdminSession, ADMIN_COOKIE, ADMIN_COOKIE_OPTIONS } from "@/lib/admin-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Tight limit - this is a password-guess surface.
  if (!rateLimit("admin-login:" + clientIp(req), 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!adminConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { password } = await req.json().catch(() => ({}) as { password?: string });
  if (!password || !checkAdminPassword(password)) {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signAdminSession(), ADMIN_COOKIE_OPTIONS);
  return NextResponse.json({ ok: true });
}
