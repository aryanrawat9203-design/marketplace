import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getProduct, getProductById, verifyDownload, productFilePath } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const slug = sp.get("slug");
  const token = sp.get("token");

  let product;
  if (token) {
    const pid = verifyDownload(token);
    if (!pid) return NextResponse.json({ error: "Invalid or expired download link." }, { status: 403 });
    product = getProductById(pid);
  } else if (slug) {
    product = getProduct(slug);
    if (product && !product.free) {
      return NextResponse.json({ error: "Purchase required." }, { status: 402 });
    }
  }

  if (!product) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const fp = productFilePath(product.file);
  if (!fs.existsSync(fp)) return NextResponse.json({ error: "File missing." }, { status: 404 });

  const data = fs.readFileSync(fp);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${product.file}"`,
      "Cache-Control": "no-store",
    },
  });
}
