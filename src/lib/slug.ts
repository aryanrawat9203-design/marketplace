/** URL slug for an integration/platform name. Client-safe (no fs imports). */
export function integrationSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
