import type { MetadataRoute } from "next";
import { getIntegrations, getIntegrationPairs } from "@/lib/integrations";
import { baseUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = new Date();

  return [
    ...getIntegrations().map((i) => ({
      url: `${base}/integrations/${i.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...getIntegrationPairs().map((p) => ({
      url: `${base}/integrations/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
