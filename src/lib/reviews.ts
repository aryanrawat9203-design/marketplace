import crypto from "crypto";
import { createAdminClient } from "./supabase/admin";
import type { Kind } from "./commerce";

// Review links are only ever minted server-side after a verified payment and
// sent to the buyer's email, so every review is from a real customer. Reviews
// land as 'pending' and only show once approved - no fake social proof.

const SECRET = process.env.DOWNLOAD_SECRET || "dev-insecure-secret-change-me";
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

export type ReviewGrant = { kind: Kind; ref: string; email: string };

export function signReviewToken(grant: ReviewGrant, expiresIn = NINETY_DAYS): string {
  const payload = JSON.stringify({
    v: "review1",
    k: grant.kind,
    r: grant.ref,
    e: grant.email,
    x: Date.now() + expiresIn,
  });
  const b = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update("review:" + payload).digest("base64url");
  return b + "." + sig;
}

export function verifyReviewToken(token: string): ReviewGrant | null {
  try {
    const [b, sig] = token.split(".");
    if (!b || !sig) return null;
    const payload = Buffer.from(b, "base64url").toString();
    const expect = crypto.createHmac("sha256", SECRET).update("review:" + payload).digest("base64url");
    const a = Buffer.from(sig);
    const e = Buffer.from(expect);
    if (a.length !== e.length || !crypto.timingSafeEqual(a, e)) return null;
    const data = JSON.parse(payload) as { v?: string; k?: string; r?: string; e?: string; x?: number };
    if (data.v !== "review1" || !data.k || !data.r || !data.e) return null;
    if (!data.x || Date.now() > data.x) return null;
    if (data.k !== "workflow" && data.k !== "bundle") return null;
    return { kind: data.k, ref: data.r, email: data.e };
  } catch {
    return null;
  }
}

export type ReviewInput = {
  grant: ReviewGrant;
  rating: number;
  authorName?: string;
  title?: string;
  body: string;
};

export async function submitReview(r: ReviewInput): Promise<"ok" | "unavailable" | "error"> {
  const admin = createAdminClient();
  if (!admin) return "unavailable";

  try {
    // Upsert so a buyer can revise their review; edits go back to moderation.
    const { error } = await admin.from("reviews").upsert(
      {
        email: r.grant.email,
        item_kind: r.grant.kind,
        item_ref: r.grant.ref,
        rating: r.rating,
        author_name: r.authorName || null,
        title: r.title || null,
        body: r.body,
        status: "pending",
      },
      { onConflict: "email,item_kind,item_ref" }
    );
    if (error) {
      console.error("reviews: upsert failed", error);
      return "error";
    }
    return "ok";
  } catch (err) {
    console.error("reviews: upsert threw", err);
    return "error";
  }
}

export type ApprovedReview = {
  rating: number;
  authorLabel: string;
  title: string | null;
  body: string;
  createdAt: string | null;
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "Verified buyer";
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

export type ReviewSummary = {
  count: number;
  average: number;
  reviews: ApprovedReview[];
};

/** Every "kind:ref" this email has already left a review for, any status. */
export async function reviewedKeysForEmail(email: string): Promise<Set<string>> {
  const admin = createAdminClient();
  if (!admin) return new Set();
  try {
    const { data, error } = await admin
      .from("reviews")
      .select("item_kind, item_ref")
      .eq("email", email);
    if (error || !data) return new Set();
    return new Set(data.map((r) => `${r.item_kind}:${r.item_ref}`));
  } catch {
    return new Set();
  }
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export type ModerationRow = {
  id: string;
  email: string;
  authorName: string | null;
  itemKind: Kind;
  itemRef: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  createdAt: string | null;
};

/** Admin-only: reviews in a given moderation state, newest first. */
export async function listReviews(status: ReviewStatus, limit = 100): Promise<ModerationRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  try {
    const { data, error } = await admin
      .from("reviews")
      .select("id, email, author_name, item_kind, item_ref, rating, title, body, status, created_at")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id as string,
      email: r.email as string,
      authorName: (r.author_name as string) ?? null,
      itemKind: r.item_kind as Kind,
      itemRef: r.item_ref as string,
      rating: (r.rating as number) ?? 0,
      title: (r.title as string) ?? null,
      body: (r.body as string) ?? "",
      status: r.status as ReviewStatus,
      createdAt: (r.created_at as string) ?? null,
    }));
  } catch {
    return [];
  }
}

/** Admin-only: approve or reject a pending review by id. */
export async function moderateReview(id: string, status: "approved" | "rejected"): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  try {
    const { error } = await admin.from("reviews").update({ status }).eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

/** Approved reviews + honest aggregate stats for one item. Empty when none. */
export async function reviewSummary(ref: string, limit = 10): Promise<ReviewSummary> {
  const empty: ReviewSummary = { count: 0, average: 0, reviews: [] };
  const admin = createAdminClient();
  if (!admin) return empty;

  try {
    const { data, error } = await admin
      .from("reviews")
      .select("rating, author_name, email, title, body, created_at")
      .eq("item_ref", ref)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data || data.length === 0) return empty;
    const count = data.length;
    const average = data.reduce((s, r) => s + ((r.rating as number) || 0), 0) / count;
    return {
      count,
      average: Math.round(average * 10) / 10,
      reviews: data.slice(0, limit).map((r) => ({
        rating: (r.rating as number) || 0,
        authorLabel: (r.author_name as string) || maskEmail((r.email as string) || ""),
        title: (r.title as string) ?? null,
        body: (r.body as string) || "",
        createdAt: (r.created_at as string) ?? null,
      })),
    };
  } catch {
    return empty;
  }
}
