import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/site";
import { workflowSitemapIds } from "@/lib/sitemaps";

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/admin" }],
    sitemap: [
      `${base}/sitemap.xml`,
      `${base}/integrations/sitemap.xml`,
      ...workflowSitemapIds().map((id) => `${base}/workflows/sitemap/${id}.xml`),
    ],
  };
}
