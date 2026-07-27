import type { MetadataRoute } from "next";
import { getBundles } from "@/lib/bundles";
import { getCollections } from "@/lib/collections";
import { guides } from "@/lib/guides";
import { posts } from "@/lib/blog";
import { baseUrl } from "@/lib/site";

/**
 * Core sitemap: hubs, bundles, collections and editorial.
 *
 * The two large sections live in their own documents so no single sitemap has
 * to be built and streamed in one request, and so Search Console reports
 * indexing coverage per section:
 *   /integrations/sitemap.xml    - integrations and integration pairs
 *   /workflows/sitemap/<n>.xml   - the template catalog, in chunks
 * All of them are advertised in robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = new Date();

  const staticPaths = [
    "",
    "/workflows",
    "/free",
    "/bundles",
    "/practice-bundles",
    "/collections",
    "/integrations",
    "/custom",
    "/guides",
    "/blog",
    "/about",
    "/contact",
    "/faq",
    "/privacy",
    "/terms",
    "/refund",
  ];
  const staticPages: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  const bundles: MetadataRoute.Sitemap = getBundles().map((b) => ({
    url: `${base}/${b.type === "practice" ? "practice-bundles" : "bundles"}/${b.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const collections: MetadataRoute.Sitemap = getCollections().map((c) => ({
    url: `${base}/collections/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const guidePages: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${base}/guides/${g.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const blogPages: MetadataRoute.Sitemap = posts.map((bp) => ({
    url: `${base}/blog/${bp.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...bundles, ...collections, ...guidePages, ...blogPages];
}
