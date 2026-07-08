import { unstable_cache, revalidateTag } from "next/cache";
import { createAdminClient } from "./supabase/admin";

// Per-template marketing screenshots live in Supabase (storage + a small
// lookup table), not in catalog.json: Vercel's serverless filesystem can't
// durably persist admin uploads at runtime, so the 22MB static catalog isn't
// a viable write target. This keeps the same shape (`Screenshots`) the rest
// of the app expects, just sourced from the DB and merged in at read time.

export type Screenshots = {
  overview?: string;
  nodeDetail?: string;
  capabilities?: string;
  cardThumb?: string;
};

export type ScreenshotSlot = keyof Screenshots;

export const SCREENSHOT_SLOTS: ScreenshotSlot[] = ["overview", "nodeDetail", "capabilities", "cardThumb"];

export const SCREENSHOT_BUCKET = "template-screenshots";
const CACHE_TAG = "template-screenshots";

const SLOT_TO_COLUMN: Record<ScreenshotSlot, string> = {
  overview: "overview_url",
  nodeDetail: "node_detail_url",
  capabilities: "capabilities_url",
  cardThumb: "card_thumb_url",
};

type Row = {
  route: string;
  overview_url: string | null;
  node_detail_url: string | null;
  capabilities_url: string | null;
  card_thumb_url: string | null;
};

function rowToScreenshots(r: Row): Screenshots {
  const s: Screenshots = {};
  if (r.overview_url) s.overview = r.overview_url;
  if (r.node_detail_url) s.nodeDetail = r.node_detail_url;
  if (r.capabilities_url) s.capabilities = r.capabilities_url;
  if (r.card_thumb_url) s.cardThumb = r.card_thumb_url;
  return s;
}

async function fetchAllScreenshots(): Promise<Record<string, Screenshots>> {
  const admin = createAdminClient();
  if (!admin) return {};
  try {
    const { data, error } = await admin
      .from("template_screenshots")
      .select("route, overview_url, node_detail_url, capabilities_url, card_thumb_url");
    if (error || !data) return {};
    const map: Record<string, Screenshots> = {};
    for (const r of data as Row[]) map[r.route] = rowToScreenshots(r);
    return map;
  } catch {
    return {};
  }
}

// Cached across requests/instances so listing pages (many WorkflowCards) do
// one lookup, not N+1 queries. Invalidated instantly via revalidateTag on
// admin upload; otherwise self-heals on the next cache window regardless.
const getCachedScreenshotsMap = unstable_cache(fetchAllScreenshots, ["template-screenshots-map"], {
  tags: [CACHE_TAG],
  revalidate: 300,
});

export async function getScreenshotsMap(): Promise<Record<string, Screenshots>> {
  return getCachedScreenshotsMap();
}

export async function getScreenshotsForRoute(route: string): Promise<Screenshots | undefined> {
  const map = await getScreenshotsMap();
  return map[route];
}

export type CompleteScreenshots = Required<Screenshots>;

/**
 * For the homepage "see what you get" showcase: the first template (in map
 * insertion order) that has all four slots filled in. Returns undefined
 * until at least one template has a full set - the section just doesn't
 * render rather than showing a partial/broken showcase.
 */
export async function getShowcaseScreenshots(): Promise<
  { route: string; screenshots: CompleteScreenshots } | undefined
> {
  const map = await getScreenshotsMap();
  for (const [route, s] of Object.entries(map)) {
    if (s.overview && s.nodeDetail && s.capabilities && s.cardThumb) {
      return { route, screenshots: s as CompleteScreenshots };
    }
  }
  return undefined;
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
