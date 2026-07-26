import { unstable_cache, revalidateTag } from "next/cache";
import { createAdminClient } from "./supabase/admin";

// Per-template marketing screenshots live in Supabase (storage + a small
// lookup table), not in catalog.json: Vercel's serverless filesystem can't
// durably persist admin uploads at runtime, so the 22MB static catalog isn't
// a viable write target. This keeps the same shape (`Screenshots`) the rest
// of the app expects, just sourced from the DB and merged in at read time.

export type Screenshots = {
  // Gallery slots - the homepage showcase renders these in SHOWCASE_SLOTS order.
  overview?: string;
  nodeDetail?: string;
  capabilities?: string;
  dataQuality?: string;
  customize?: string;
  designDecisions?: string;
  practice?: string;
  plainEnglish?: string;
  credentials?: string;
  troubleshooting?: string;
  // Functional slot: listing-card thumbnail, OG image and JSON-LD. Rendered as
  // a 16:9 object-cover crop, so it wants a landscape image - not a tall doc
  // card. Deliberately NOT part of the showcase gallery.
  cardThumb?: string;
};

export type ScreenshotSlot = keyof Screenshots;

/**
 * The homepage "see exactly what you get" gallery, in render order. The first
 * entry is the wide hero image; the rest fill the grid beneath it.
 */
export const SHOWCASE_SLOTS = [
  "overview",
  "nodeDetail",
  "capabilities",
  "dataQuality",
  "customize",
  "designDecisions",
  "practice",
  "plainEnglish",
  "credentials",
  "troubleshooting",
] as const satisfies readonly ScreenshotSlot[];

export const SCREENSHOT_SLOTS: ScreenshotSlot[] = [...SHOWCASE_SLOTS, "cardThumb"];

/** What each gallery slot depicts. Used for alt text on the template page. */
export const SHOWCASE_SLOT_LABELS: Record<(typeof SHOWCASE_SLOTS)[number], string> = {
  overview: "full workflow overview",
  nodeDetail: "node detail with its doc card",
  capabilities: "error handling and retries",
  dataQuality: "data-quality checks",
  customize: "customization guide",
  designDecisions: "design decisions",
  practice: "practice exercises",
  plainEnglish: "plain-English breakdown",
  credentials: "credential setup",
  troubleshooting: "troubleshooting guide",
};

/**
 * A template's gallery images in render order, skipping empty slots. Shared by
 * the homepage showcase and the template page so the two can't drift.
 */
export function orderedGallery(
  s: Screenshots | undefined
): { slot: (typeof SHOWCASE_SLOTS)[number]; src: string; label: string }[] {
  if (!s) return [];
  return SHOWCASE_SLOTS.flatMap((slot) => {
    const src = s[slot];
    return src ? [{ slot, src, label: SHOWCASE_SLOT_LABELS[slot] }] : [];
  });
}

export const SCREENSHOT_BUCKET = "template-screenshots";
const CACHE_TAG = "template-screenshots";

const SLOT_TO_COLUMN: Record<ScreenshotSlot, string> = {
  overview: "overview_url",
  nodeDetail: "node_detail_url",
  capabilities: "capabilities_url",
  dataQuality: "data_quality_url",
  customize: "customize_url",
  designDecisions: "design_decisions_url",
  practice: "practice_url",
  plainEnglish: "plain_english_url",
  credentials: "credentials_url",
  troubleshooting: "troubleshooting_url",
  cardThumb: "card_thumb_url",
};

const SELECT_COLUMNS = ["route", "is_showcase", ...Object.values(SLOT_TO_COLUMN)].join(", ");

type Row = { route: string; is_showcase: boolean | null } & Record<string, string | null | boolean>;

function rowToScreenshots(r: Row): Screenshots {
  const s: Screenshots = {};
  for (const slot of SCREENSHOT_SLOTS) {
    const v = r[SLOT_TO_COLUMN[slot]];
    if (typeof v === "string" && v) s[slot] = v;
  }
  return s;
}

type ScreenshotData = {
  map: Record<string, Screenshots>;
  /** Route explicitly flagged `is_showcase` in the DB, if any. */
  showcaseRoute?: string;
};

async function fetchAllScreenshots(): Promise<ScreenshotData> {
  const admin = createAdminClient();
  if (!admin) return { map: {} };
  try {
    const { data, error } = await admin.from("template_screenshots").select(SELECT_COLUMNS);
    if (error || !data) return { map: {} };
    const map: Record<string, Screenshots> = {};
    let showcaseRoute: string | undefined;
    for (const r of data as unknown as Row[]) {
      map[r.route] = rowToScreenshots(r);
      if (r.is_showcase) showcaseRoute = r.route;
    }
    return { map, showcaseRoute };
  } catch {
    return { map: {} };
  }
}

// Cached across requests/instances so listing pages (many WorkflowCards) do
// one lookup, not N+1 queries. Invalidated instantly via revalidateTag on
// admin upload; otherwise self-heals on the next cache window regardless.
const getCachedScreenshotData = unstable_cache(fetchAllScreenshots, ["template-screenshots-map"], {
  tags: [CACHE_TAG],
  revalidate: 300,
});

export async function getScreenshotsMap(): Promise<Record<string, Screenshots>> {
  return (await getCachedScreenshotData()).map;
}

export async function getScreenshotsForRoute(route: string): Promise<Screenshots | undefined> {
  const map = await getScreenshotsMap();
  return map[route];
}

/** How many of the homepage gallery slots a template has filled. */
export function showcaseSlotCount(s: Screenshots): number {
  return SHOWCASE_SLOTS.filter((slot) => s[slot]).length;
}

/**
 * For the homepage "see exactly what you get" showcase. Prefers the template
 * explicitly flagged `is_showcase` in the DB (a partial unique index keeps that
 * to at most one row); otherwise falls back to whichever template has the most
 * gallery slots filled, so the section still works if the flag is never set.
 *
 * Returns undefined unless the chosen template has a hero (`overview`) plus at
 * least two more gallery images - below that the section isn't worth rendering.
 */
export async function getShowcaseScreenshots(): Promise<
  { route: string; screenshots: Screenshots } | undefined
> {
  const { map, showcaseRoute } = await getCachedScreenshotData();

  const pick = (): { route: string; screenshots: Screenshots } | undefined => {
    if (showcaseRoute && map[showcaseRoute]) {
      return { route: showcaseRoute, screenshots: map[showcaseRoute] };
    }
    let best: { route: string; screenshots: Screenshots; n: number } | undefined;
    for (const [route, screenshots] of Object.entries(map)) {
      const n = showcaseSlotCount(screenshots);
      if (!best || n > best.n) best = { route, screenshots, n };
    }
    return best ? { route: best.route, screenshots: best.screenshots } : undefined;
  };

  const chosen = pick();
  if (!chosen?.screenshots.overview) return undefined;
  if (showcaseSlotCount(chosen.screenshots) < 3) return undefined;
  return chosen;
}

/** Admin-only: attach/replace one or more screenshot URLs for a template. */
export async function upsertScreenshots(
  route: string,
  patch: Partial<Screenshots>
): Promise<"ok" | "unavailable" | "error"> {
  const admin = createAdminClient();
  if (!admin) return "unavailable";
  const columns: Record<string, string> = {};
  for (const [slot, url] of Object.entries(patch)) {
    columns[SLOT_TO_COLUMN[slot as ScreenshotSlot]] = url as string;
  }
  try {
    const { error } = await admin
      .from("template_screenshots")
      .upsert({ route, ...columns, updated_at: new Date().toISOString() }, { onConflict: "route" });
    if (error) {
      console.error("screenshots: upsert failed", error);
      return "error";
    }
    // Immediate expiration (not "max"/stale-while-revalidate): the admin who
    // just uploaded an image expects to see it on the next page load.
    revalidateTag(CACHE_TAG, { expire: 0 });
    return "ok";
  } catch (err) {
    console.error("screenshots: upsert threw", err);
    return "error";
  }
}

function extFor(filename: string): string {
  return (filename.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

/**
 * Admin-only: mint a signed upload URL so the browser can PUT the image file
 * straight to Supabase Storage. Deliberately NOT proxied through our own API
 * route - Vercel serverless functions cap request bodies around ~4.5MB, and a
 * full-resolution screenshot blows past that as multipart form data. The
 * signed URL/token pair is itself the authorization, so the client's plain
 * anon-key storage call can use it without needing an insert RLS policy.
 */
export async function createUploadTicket(
  route: string,
  slot: ScreenshotSlot,
  filename: string
): Promise<{ signedUrl: string; token: string; path: string; bucket: string } | { error: string }> {
  const admin = createAdminClient();
  if (!admin) return { error: "unavailable" };
  const path = `${route}/${slot}.${extFor(filename)}`;
  try {
    const { data, error } = await admin.storage
      .from(SCREENSHOT_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });
    if (error || !data) return { error: error?.message ?? "sign_failed" };
    return { signedUrl: data.signedUrl, token: data.token, path: data.path, bucket: SCREENSHOT_BUCKET };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "sign_failed" };
  }
}

/** Admin-only: after the browser's direct upload succeeds, record its public URL. */
export async function recordScreenshot(
  route: string,
  slot: ScreenshotSlot,
  path: string
): Promise<{ url: string } | { error: string }> {
  const admin = createAdminClient();
  if (!admin) return { error: "unavailable" };
  const { data } = admin.storage.from(SCREENSHOT_BUCKET).getPublicUrl(path);
  const result = await upsertScreenshots(route, { [slot]: data.publicUrl } as Partial<Screenshots>);
  if (result === "error") return { error: "db_write_failed" };
  return { url: data.publicUrl };
}
