import { getIndex } from "./catalog";

/**
 * The template catalog is far too large for one sitemap document, so
 * /workflows/sitemap/<n>.xml is split into fixed-size chunks. Keeping the
 * chunk size here (rather than inline) means robots.txt and the sitemap route
 * can never disagree about how many chunks exist.
 */
export const WORKFLOWS_PER_SITEMAP = 2500;

export function workflowSitemapIds(): number[] {
  const count = Math.max(1, Math.ceil(getIndex().length / WORKFLOWS_PER_SITEMAP));
  return Array.from({ length: count }, (_, i) => i);
}
