import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession, ADMIN_COOKIE } from "@/lib/admin-auth";
import { getByRoute, queryCatalog } from "@/lib/catalog";
import { getScreenshotsForRoute } from "@/lib/screenshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminSession(jar.get(ADMIN_COOKIE)?.value);
}

// Search templates by route/title, or fetch one template's current
// screenshots when `route` is given directly. Actual file uploads go through
// sign/ and record/ (the browser PUTs bytes straight to Supabase Storage;
// see lib/screenshots.ts for why this route never handles the file itself).
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
