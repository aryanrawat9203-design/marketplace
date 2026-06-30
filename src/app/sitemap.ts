import type { MetadataRoute } from "next";
import { getIndex } from "@/lib/catalog";
import { getBundles } from "@/lib/bundles";
import { baseUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = new Date();

  const staticPaths = ["", "/workflows", "/bundles", "/about", "/contact", "/faq", "/privacy", "/terms", "/refund"];
  const staticPages: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  const bundles: MetadataRoute.Sitemap = getBundles().map((b) => ({
    url: `${base}/bundles/${b.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const workflows: MetadataRoute.Sitemap = getIndex().map((w) => ({
    url: `${base}/workflows/${w.route}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticPages, ...bundles, ...workflows];
}
