import type { MetadataRoute } from "next";
import { getIndex } from "@/lib/catalog";
import { getBundles } from "@/lib/bundles";
import { getIntegrations } from "@/lib/integrations";
import { getCollections } from "@/lib/collections";
import { guides } from "@/lib/guides";
import { posts } from "@/lib/blog";
import { baseUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = new Date();

  const staticPaths = [
    "",
    "/workflows",
    "/bundles",
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
    url: `${base}/bundles/${b.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const integrations: MetadataRoute.Sitemap = getIntegrations()
    .slice(0, 150)
    .map((i) => ({
      url: `${base}/integrations/${i.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
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

  const workflows: MetadataRoute.Sitemap = getIndex().map((w) => ({
    url: `${base}/workflows/${w.route}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticPages, ...bundles, ...collections, ...integrations, ...guidePages, ...blogPages, ...workflows];
}
