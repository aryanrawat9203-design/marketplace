import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getByRoute } from "@/lib/catalog";
import { createUploadTicket, SCREENSHOT_SLOTS, type ScreenshotSlot } from "@/lib/screenshots";
import { requireAdmin } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mints a signed Supabase Storage upload URL. The browser PUTs the actual
// image bytes straight to Supabase afterward - this response is tiny JSON,
// so it never runs into Vercel's ~4.5MB serverless request-body cap.
export async function POST(req: NextRequest) {
  if (!rateLimit("admin-screenshots-sign:" + clientIp(req), 30, 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const route = body?.route;
  const slot = body?.slot;
  const filename = body?.filename;
  if (
    typeof route !== "string" ||
    !route ||
    typeof slot !== "string" ||
    !SCREENSHOT_SLOTS.includes(slot as ScreenshotSlot) ||
    typeof filename !== "string" ||
    !filename
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!getByRoute(route)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ticket = await createUploadTicket(route, slot as ScreenshotSlot, filename);
  if ("error" in ticket) return NextResponse.json({ error: ticket.error }, { status: 500 });
  return NextResponse.json(ticket);
}
