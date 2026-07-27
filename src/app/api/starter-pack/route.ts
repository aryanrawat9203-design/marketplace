import { NextRequest, NextResponse } from "next/server";
import { starterPackDownload } from "@/lib/commerce";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!rateLimit("starter-pack:" + clientIp(req), 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const out = starterPackDownload();
  if (!out) return NextResponse.json({ error: "Starter pack unavailable." }, { status: 404 });

  return new NextResponse(new Uint8Array(out.body), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${out.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
