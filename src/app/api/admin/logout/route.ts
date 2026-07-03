import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
