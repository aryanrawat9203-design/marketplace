import type { MetadataRoute } from "next";
import { getIndex } from "@/lib/catalog";
import { getProducts } from "@/lib/products";
import { baseUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = new Date();

  const staticPaths = ["", "/workflows", "/shop", "/about", "/contact", "/faq", "/privacy", "/terms", "/refund"];
  const staticPages: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.6,
  }));

  const workflows: MetadataRoute.Sitemap = getIndex().map((w) => ({
    url: `${base}/workflows/${w.route}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const products: MetadataRoute.Sitemap = getProducts().map((p) => ({
    url: `${base}/shop/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...workflows, ...products];
}
