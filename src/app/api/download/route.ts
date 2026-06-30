import { NextRequest, NextResponse } from "next/server";
import {
  getPurchasable,
  verifyDownload,
  workflowDownload,
  bundleDownload,
  type Kind,
} from "@/lib/commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const token = sp.get("token");

  let kind: Kind | null = null;
  let key: string | null = null;

  if (token) {
    const ref = verifyDownload(token);
    if (!ref) {
      return NextResponse.json({ error: "Invalid or expired download link." }, { status: 403 });
    }
    kind = ref.kind;
    key = ref.key;
  } else {
    kind = (sp.get("kind") as Kind) || "workflow";
    key = sp.get("key");
    if (kind !== "workflow" || !key) {
      return NextResponse.json({ error: "Missing download reference." }, { status: 400 });
    }
    const item = getPurchasable("workflow", key);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!item.free) return NextResponse.json({ error: "Purchase required." }, { status: 402 });
  }

  if (!key) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (kind === "bundle") {
    const out = bundleDownload(key);
    if (!out) return NextResponse.json({ error: "Bundle files missing." }, { status: 404 });
    return new NextResponse(new Uint8Array(out.body), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${out.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const out = workflowDownload(key);
  if (!out) return NextResponse.json({ error: "File missing." }, { status: 404 });
  return new NextResponse(new Uint8Array(out.body), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${out.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
