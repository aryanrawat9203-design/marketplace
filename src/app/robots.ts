import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/site";
import { workflowSitemapIds } from "@/lib/sitemaps";

/**
 * `/workflows?` blocks the faceted browse space, and nothing else.
 *
 * The browse page turns every filter chip into a crawlable URL, and each of
 * those paginates at 24 per page: category, subcategory, industry, difficulty
 * and tier alone reach ~2,700 URLs, before the platform/platform2 pairs the
 * integration pages link to. All of them render fine (200 with a real empty
 * state) and all of them declare `/workflows` as their canonical, so not one
 * can ever be indexed on its own - they are pure crawl cost against a catalog
 * that already has 10,489 template URLs and ~150 integration pages waiting to
 * be crawled.
 *
 * Why a prefix of exactly `/workflows?`: robots.txt matches against path plus
 * query, and `?` carries no special meaning there, so this catches
 * `/workflows?category=...` while leaving the `/workflows` hub, every
 * `/workflows/<slug>` template page and `/workflows/sitemap/<n>.xml`
 * crawlable. No submitted URL is affected either - no sitemap entry anywhere
 * on the site carries a query string.
 *
 * Blocking pagination costs nothing in discovery: every template page is
 * listed individually in the chunked workflow sitemaps, so Google never had to
 * walk `?page=2..438` to find them.
 */
export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/workflows?"] }],
    sitemap: [
      `${base}/sitemap.xml`,
      `${base}/integrations/sitemap.xml`,
      ...workflowSitemapIds().map((id) => `${base}/workflows/sitemap/${id}.xml`),
    ],
  };
}
