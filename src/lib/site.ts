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
