/** URL slug for an integration/platform name. Client-safe (no fs imports). */
export function integrationSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Separator between the two halves of an integration-pair slug. */
export const PAIR_SEP = "-and-";

/**
 * Canonical slug for a pair of integrations, e.g. "airtable-and-discord".
 * Always ordered alphabetically by slug so a pair has exactly one URL.
 */
export function pairSlug(a: string, b: string): string {
  const [x, y] = [integrationSlug(a), integrationSlug(b)].sort();
  return `${x}${PAIR_SEP}${y}`;
}

/** True when a slug looks like a pair slug rather than a single integration. */
export function isPairSlug(slug: string): boolean {
  return slug.includes(PAIR_SEP);
}
