import type { MetadataRoute } from "next";
import { getIntegrations, getIntegrationPairs } from "@/lib/integrations";
import { baseUrl, CATALOG_UPDATED } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  // Integration pages are generated from the catalog, so they change when it does.
  const updated = new Date(CATALOG_UPDATED);

  return [
    ...getIntegrations().map((i) => ({
      url: `${base}/integrations/${i.slug}`,
      lastModified: updated,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...getIntegrationPairs().map((p) => ({
      url: `${base}/integrations/${p.slug}`,
      lastModified: updated,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
