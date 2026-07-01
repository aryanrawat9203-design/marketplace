import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getByRoute } from "./catalog";
import { getBundle, bundleMembersDetail, type Bundle } from "./bundles";
import { createZip, type ZipEntry } from "./zip";

export type Kind = "workflow" | "bundle";

export type Purchasable = {
  kind: Kind;
  key: string; // workflow route, or bundle slug
  name: string;
  price: number;
  currency: string;
  free: boolean;
};

const PRODUCT_ROOT = path.join(process.cwd(), "product-files");

export function getPurchasable(kind: Kind, key: string): Purchasable | undefined {
  if (kind === "workflow") {
    const w = getByRoute(key);
    if (!w) return undefined;
    return { kind, key, name: w.title, price: w.price ?? 0, currency: "INR", free: !!w.free };
  }
  const b = getBundle(key);
  if (!b) return undefined;
  return { kind: "bundle", key, name: b.name, price: b.price, currency: "INR", free: false };
}

export function workflowDownload(route: string): { filename: string; body: Buffer } | null {
  const w = getByRoute(route);
  if (!w?.workflowFile) return null;
  const fp = path.join(PRODUCT_ROOT, w.workflowFile);
  if (!fs.existsSync(fp)) return null;
  return { filename: path.basename(w.workflowFile), body: fs.readFileSync(fp) };
}

export function bundleDownload(slug: string): { filename: string; body: Buffer } | null {
  const b = getBundle(slug);
  if (!b) return null;
  const members = bundleMembersDetail(b);
  const entries: ZipEntry[] = [];
  for (const w of members) {
    if (!w.workflowFile) continue;
    const fp = path.join(PRODUCT_ROOT, w.workflowFile);
    if (fs.existsSync(fp)) entries.push({ name: w.workflowFile, data: fs.readFileSync(fp) });
  }
  if (entries.length === 0) return null;
  return { filename: b.slug + ".zip", body: createZip(entries) };
}

export function bundleMemberCount(b: Bundle): number {
  return b.count;
}

const SECRET = process.env.DOWNLOAD_SECRET || "dev-insecure-secret-change-me";

export function signDownload(kind: Kind, key: string, expiresIn = 30 * 60 * 1000): string {
  const exp = Date.now() + expiresIn;
  const data = kind + ":" + key + "." + exp;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return Buffer.from(data).toString("base64url") + "." + sig;
}

export function verifyDownload(token: string): { kind: Kind; key: string } | null {
  try {
    const [b, sig] = token.split(".");
    if (!b || !sig) return null;
    const data = Buffer.from(b, "base64url").toString();
    const expect = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    if (sig !== expect) return null;
    const lastDot = data.lastIndexOf(".");
    const exp = Number(data.slice(lastDot + 1));
    if (!exp || Date.now() > exp) return null;
    const ref = data.slice(0, lastDot);
    const colon = ref.indexOf(":");
    const kind = ref.slice(0, colon) as Kind;
    const key = ref.slice(colon + 1);
    if (kind !== "workflow" && kind !== "bundle") return null;
    return { kind, key };
  } catch {
    return null;
  }
}
