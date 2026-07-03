import crypto from "crypto";

// Single-operator admin auth: one shared password (ADMIN_PASSWORD), gating a
// signed, httpOnly session cookie. No user accounts, no Supabase - this is a
// private tool for the store owner, not a customer-facing feature.

export const ADMIN_COOKIE = "wc_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function secret(): string {
  // Falls back to DOWNLOAD_SECRET so a fresh deploy doesn't need a second
  // secret just to work, but a dedicated ADMIN_SESSION_SECRET is honored if set.
  return process.env.ADMIN_SESSION_SECRET || process.env.DOWNLOAD_SECRET || "dev-insecure-secret-change-me";
}

export function adminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

export function checkAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  // Constant-time compare, but only once lengths match - timingSafeEqual
  // throws on mismatched lengths rather than returning false.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signAdminSession(): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const data = "admin1." + exp;
  const sig = crypto.createHmac("sha256", secret()).update(data).digest("base64url");
  return data + "." + sig;
}

export function verifyAdminSession(token: string | undefined | null): boolean {
  if (!token) return false;
  try {
    const lastDot = token.lastIndexOf(".");
    if (lastDot < 0) return false;
    const data = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    const expect = crypto.createHmac("sha256", secret()).update(data).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const [tag, expStr] = data.split(".");
    if (tag !== "admin1") return false;
    const exp = Number(expStr);
    if (!exp || Date.now() > exp) return false;
    return true;
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};
