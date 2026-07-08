import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getByRoute } from "@/lib/catalog";
import { recordScreenshot, SCREENSHOT_SLOTS, type ScreenshotSlot } from "@/lib/screenshots";
import { requireAdmin } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called after the browser's direct-to-Supabase upload (via the sign/
// ticket) succeeds, to record the public URL against the template.
export async function POST(req: NextRequest) {
  if (!rateLimit("admin-screenshots-record:" + clientIp(req), 30, 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const route = body?.route;
  const slot = body?.slot;
  const path = body?.path;
  if (
    typeof route !== "string" ||
    !route ||
    typeof slot !== "string" ||
    !SCREENSHOT_SLOTS.includes(slot as ScreenshotSlot) ||
    typeof path !== "string" ||
    !path
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!getByRoute(route)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await recordScreenshot(route, slot as ScreenshotSlot, path);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, url: result.url });
}
