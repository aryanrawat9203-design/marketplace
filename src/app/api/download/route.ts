import { NextRequest, NextResponse } from "next/server";
import {
  getPurchasable,
  verifyDownload,
  workflowDownload,
  bundleDownload,
  cartZip,
  ProductFetchError,
  type DownloadKind,
} from "@/lib/commerce";
import { getCartRecord } from "@/lib/cart-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const token = sp.get("token");

  let kind: DownloadKind | null = null;
  let key: string | null = null;

  if (token) {
    const ref = verifyDownload(token);
    if (!ref) {
      return NextResponse.json({ error: "Invalid or expired download link." }, { status: 403 });
    }
    kind = ref.kind;
    key = ref.key;
  } else {
    kind = (sp.get("kind") as DownloadKind) || "workflow";
    key = sp.get("key");
    if (kind !== "workflow" || !key) {
      return NextResponse.json({ error: "Missing download reference." }, { status: 400 });
    }
    const item = getPurchasable("workflow", key);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!item.free) return NextResponse.json({ error: "Purchase required." }, { status: 402 });
  }

  if (!key) return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    return await deliver(kind, key);
  } catch (e) {
    // A product file existed but could not be fetched from Storage. Assembling
    // a large bundle touches thousands of objects, so a transient failure is
    // expected occasionally - and the one thing we must not do is hand a buyer
    // a short archive as though it were complete. 503 says "retry", and the
    // download token is still valid when they do.
    if (e instanceof ProductFetchError) {
      console.error("[download] " + e.message);
      return NextResponse.json(
        { error: "Could not assemble your download just now. Please try the link again." },
        { status: 503, headers: { "Retry-After": "10", "Cache-Control": "no-store" } },
      );
    }
    throw e;
  }
}

const zipHeaders = (filename: string, contentType = "application/zip") => ({
  "Content-Type": contentType,
  "Content-Disposition": `attachment; filename="${filename}"`,
  "Cache-Control": "no-store",
});

async function deliver(kind: DownloadKind, key: string): Promise<NextResponse> {
  if (kind === "cart") {
    const cart = await getCartRecord(key);
    if (!cart) return NextResponse.json({ error: "Order files missing." }, { status: 404 });
    const out = await cartZip(cart.items);
    if (!out) return NextResponse.json({ error: "Order files missing." }, { status: 404 });
    return new NextResponse(new Uint8Array(out.body), { headers: zipHeaders(out.filename) });
  }

  if (kind === "bundle") {
    const out = await bundleDownload(key);
    if (!out) return NextResponse.json({ error: "Bundle files missing." }, { status: 404 });
    return new NextResponse(new Uint8Array(out.body), { headers: zipHeaders(out.filename) });
  }

  const out = await workflowDownload(key);
  if (!out) return NextResponse.json({ error: "File missing." }, { status: 404 });
  // A single template is a ZIP now, not a bare JSON - the workflow plus its
  // generated SETUP.md. Content type comes from the download rather than being
  // hardcoded here so the two cannot drift.
  return new NextResponse(new Uint8Array(out.body), { headers: zipHeaders(out.filename, out.contentType) });
}
