import type { MetadataRoute } from "next";
import { getIndex } from "@/lib/catalog";
import { baseUrl, CATALOG_UPDATED } from "@/lib/site";
import { WORKFLOWS_PER_SITEMAP, workflowSitemapIds } from "@/lib/sitemaps";

export async function generateSitemaps() {
  return workflowSitemapIds().map((id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const chunk = Number(await id) || 0;
  const base = baseUrl();
  const updated = new Date(CATALOG_UPDATED);
  const start = chunk * WORKFLOWS_PER_SITEMAP;

  return getIndex()
    .slice(start, start + WORKFLOWS_PER_SITEMAP)
    .map((w) => ({
      url: `${base}/workflows/${w.route}`,
      lastModified: updated,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
}
