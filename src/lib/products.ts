import fs from "fs";
import path from "path";
import crypto from "crypto";

export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  price: number; // in major units (e.g. rupees)
  currency: string;
  free: boolean;
  category: string;
  description: string;
  features: string[];
  file: string; // filename inside /product-files
  gradient: string;
};

let _products: Product[] | null = null;
export function getProducts(): Product[] {
  if (!_products) {
    const p = path.join(process.cwd(), "src", "data", "products.json");
    _products = JSON.parse(fs.readFileSync(p, "utf-8")) as Product[];
  }
  return _products;
}
export function getProduct(slug: string): Product | undefined {
  return getProducts().find((p) => p.slug === slug);
}
export function getProductById(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id);
}
export function productFilePath(file: string): string {
  return path.join(process.cwd(), "product-files", file);
}

// --- Secure download tokens (no database needed) ---
const SECRET = process.env.DOWNLOAD_SECRET || "dev-insecure-secret-change-me";

export function signDownload(productId: string, ttlMs = 15 * 60 * 1000): string {
  const exp = Date.now() + ttlMs;
  const data = `${productId}.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${Buffer.from(data).toString("base64url")}.${sig}`;
}

export function verifyDownload(token: string): string | null {
  try {
    const [b, sig] = token.split(".");
    if (!b || !sig) return null;
    const data = Buffer.from(b, "base64url").toString();
    const expect = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    if (sig !== expect) return null;
    const [pid, exp] = data.split(".");
    if (Date.now() > Number(exp)) return null;
    return pid;
  } catch {
    return null;
  }
}
