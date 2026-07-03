import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession, ADMIN_COOKIE } from "@/lib/admin-auth";
import { listReviews, moderateReview, type ReviewStatus } from "@/lib/reviews";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminSession(jar.get(ADMIN_COOKIE)?.value);
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const statusParam = req.nextUrl.searchParams.get("status") ?? "pending";
  const status = (STATUSES as string[]).includes(statusParam) ? (statusParam as ReviewStatus) : "pending";
  const reviews = await listReviews(status);
  return NextResponse.json({ reviews });
}

export async function PATCH(req: NextRequest) {
  if (!rateLimit("admin-reviews:" + clientIp(req), 60, 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id, action } = await req.json().catch(() => ({}) as { id?: string; action?: string });
  if (!id || (action !== "approved" && action !== "rejected")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const ok = await moderateReview(id, action);
  if (!ok) return NextResponse.json({ error: "update_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
