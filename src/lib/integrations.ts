import { getIndex } from "./catalog";
import { integrationSlug } from "./slug";

export type Integration = { name: string; slug: string; count: number };

export { integrationSlug };

const g = globalThis as unknown as {
  __integrations?: Integration[];
  __integrationsBySlug?: Map<string, Integration>;
};

/** Every integration in the catalog with its template count, most-used first. */
export function getIntegrations(): Integration[] {
  if (!g.__integrations) {
    const counts = new Map<string, number>();
    for (const w of getIndex()) {
      for (const p of w.platforms) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    g.__integrations = [...counts.entries()]
      .map(([name, count]) => ({ name, slug: integrationSlug(name), count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }
  return g.__integrations;
}

export function getIntegrationBySlug(slug: string): Integration | undefined {
  if (!g.__integrationsBySlug) {
    g.__integrationsBySlug = new Map(getIntegrations().map((i) => [i.slug, i]));
  }
  return g.__integrationsBySlug.get(slug);
}
