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
 *
 * Read from a generated file rather than typed here. As a hand-maintained
 * literal it said 10,463 against a catalog of 10,489 — the number is quoted in
 * headlines, placeholders and meta descriptions, and every one of them was
 * wrong until someone noticed. `scripts/build-catalog-index.mjs` regenerates
 * catalog-count.json from catalog.json, so there is nothing left to forget;
 * importing JSON (rather than the catalog itself) keeps this safe for client
 * components, which can't touch `fs`.
 */
import catalogCount from "@/data/catalog-count.json";

export const TEMPLATE_COUNT: number = catalogCount.total;
export const TEMPLATE_COUNT_LABEL = TEMPLATE_COUNT.toLocaleString("en-US");

/**
 * The same number, rounded down, for copy where the exact figure earns
 * nothing. An exact count in a placeholder reads as precision theatre and goes
 * stale the moment one template is retired - which duly happened when 496 were
 * withdrawn. "9,000+" is true for as long as it matters.
 */
export const TEMPLATE_COUNT_ROUNDED = `${(Math.floor(TEMPLATE_COUNT / 1000) * 1000).toLocaleString("en-US")}+`;

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
