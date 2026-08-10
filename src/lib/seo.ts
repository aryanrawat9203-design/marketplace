import type { Metadata } from "next";
import { baseUrl } from "./site";

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: baseUrl() + item.path,
    })),
  };
}

/**
 * Share card for an arbitrary page, rendered by /api/og.
 * `label` is the small line under the title (a count, a section, a date).
 */
export function shareImage(title: string, label: string): string {
  return `/api/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent(label)}`;
}

/**
 * One page's title/description/canonical plus *matching* Open Graph and
 * Twitter cards.
 *
 * Next does not derive `twitter:*` from `openGraph`, so every page that sets
 * only Open Graph inherits the root layout's sitewide Twitter card - which is
 * why every URL on the site used to share as the generic homepage card. Build
 * both from the same inputs here and that class of bug cannot come back.
 */
export function pageMeta({
  title,
  description,
  path,
  image,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
}): Metadata {
  const images = image ? [image] : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type, url: path, ...(images ? { images } : {}) },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

/** The seller, as Merchant listings requires it - one definition, three pages. */
export const ORGANIZATION_JSON_LD = {
  "@type": "Organization",
  name: "WorkflowCrate",
  url: baseUrl(),
} as const;

/**
 * Google Merchant listings reported 0 valid / 17 invalid items, all for the
 * same three omissions: no `priceValidUntil`, no seller identity, no
 * `brand`/`sku`. Prices are now honest and stable (Packet 2 removed the
 * permanent "60% off"), so a real validity date can be stated.
 *
 * Rolling twelve months from the current UTC date, formatted YYYY-MM-DD.
 */
export function priceValidUntil(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function productOffer({ price, path }: { price: number; path: string }) {
  return {
    "@type": "Offer",
    price,
    priceCurrency: "INR",
    priceValidUntil: priceValidUntil(),
    availability: "https://schema.org/InStock",
    url: `${baseUrl()}${path}`,
    seller: ORGANIZATION_JSON_LD,
  };
}
