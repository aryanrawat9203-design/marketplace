import { NextRequest, NextResponse } from "next/server";
import { suggest } from "@/lib/catalog";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Generous - typing fires at most a few requests per second with the
  // client-side debounce; this just blunts scripted abuse.
  if (!rateLimit("suggest:" + clientIp(req), 120, 60 * 1000)) {
    return NextResponse.json({ templates: [], categories: [], platforms: [], total: 0 });
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json(suggest(q), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
