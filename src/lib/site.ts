export function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const SITE_NAME = "WorkflowCrate";

/**
 * Templates currently listed in the catalog, as shown in marketing copy.
 * Kept here (a plain constant, safe for client components) so the number in
 * headlines, placeholders and meta descriptions can't drift apart. Update it
 * whenever catalog.json gains or retires records — `scripts/check-count.mjs`
 * fails the build if it disagrees with the catalog.
 */
export const TEMPLATE_COUNT = 10463;
export const TEMPLATE_COUNT_LABEL = TEMPLATE_COUNT.toLocaleString("en-US");

/**
 * When the template catalog itself last changed, as an ISO date.
 *
 * Sitemaps used to send `lastModified: new Date()` on every URL, so all ~10,600
 * entries claimed to have changed on every deploy - which tells a crawler
 * nothing and, repeated often enough, teaches it to disregard the field. This
 * is a real date, bumped when src/data/catalog.json changes.
 */
export const CATALOG_UPDATED = "2026-08-10";

/** Last substantive change to the hubs, policy and marketing pages. */
export const SITE_UPDATED = "2026-08-10";
