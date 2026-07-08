import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession, ADMIN_COOKIE } from "@/lib/admin-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getByRoute, queryCatalog } from "@/lib/catalog";
import { getScreenshotsForRoute, uploadScreenshot, type ScreenshotSlot } from "@/lib/screenshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLOTS: ScreenshotSlot[] = ["overview", "nodeDetail", "capabilities", "cardThumb"];
const MAX_BYTES = 8 * 1024 * 1024;

async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminSession(jar.get(ADMIN_COOKIE)?.value);
}

// Search templates by route/title, or fetch one template's current
// screenshots when `route` is given directly.
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const route = req.nextUrl.searchParams.get("route");
  if (route) {
    const item = getByRoute(route);
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const screenshots = (await getScreenshotsForRoute(route)) ?? {};
    return NextResponse.json({ route: item.route, title: item.title, screenshots });
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });
  const { items } = queryCatalog({ q, perPage: 8 });
  return NextResponse.json({
    results: items.map((w) => ({ route: w.route, title: w.title, category: w.category })),
  });
}

export async function POST(req: NextRequest) {
  if (!rateLimit("admin-screenshots:" + clientIp(req), 30, 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const route = form.get("route");
  const slot = form.get("slot");
  const file = form.get("file");
  if (
    typeof route !== "string" ||
    !route ||
    typeof slot !== "string" ||
    !SLOTS.includes(slot as ScreenshotSlot) ||
    !(file instanceof File)
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!getByRoute(route)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "not_an_image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 400 });

  const result = await uploadScreenshot(route, slot as ScreenshotSlot, file);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, url: result.url });
}
