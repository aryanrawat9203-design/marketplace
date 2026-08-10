import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { queryCatalog, getTaxonomy, type IndexItem } from "@/lib/catalog";
import WorkflowCard from "@/components/WorkflowCard";
import PageHeader from "@/components/PageHeader";
import { WorkflowCardSkeletons, LoadingAnnouncement } from "@/components/Skeleton";
import { FilterBar, PageJump } from "@/components/Controls";
import { buildQuery } from "@/lib/url";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";
import { TEMPLATE_COUNT_LABEL } from "@/lib/site";

// The canonical consolidates every filter/sort/page query-string variant onto
// the base browse URL; individual template pages carry their own canonicals.
export const metadata: Metadata = pageMeta({
  title: "Browse templates",
  description: `Search and filter all ${TEMPLATE_COUNT_LABEL} original n8n workflow templates by category, integration, difficulty and trigger - preview the full node graph before you buy.`,
  path: "/workflows",
});

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function ResultsGrid({ items }: { items: IndexItem[] }) {
  return (
    <div className={GRID}>
      {items.map((w) => (
        <WorkflowCard key={w.id} w={w} />
      ))}
    </div>
  );
}

/** Same grid, same card box model — so nothing shifts when results land. */
function GridFallback({ count }: { count: number }) {
  return (
    <>
      <LoadingAnnouncement label="Loading templates" />
      <div className={GRID}>
        <WorkflowCardSkeletons count={count} />
      </div>
    </>
  );
}

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filters = {
    q: str(sp.q),
    industry: str(sp.industry),
    category: str(sp.category),
    subcategory: str(sp.subcategory),
    difficulty: str(sp.difficulty),
    tier: str(sp.tier),
    platform: str(sp.platform),
    platform2: str(sp.platform2),
    sort: str(sp.sort),
    page: Number(str(sp.page) ?? "1") || 1,
  };
  const { items, total, page, pages } = queryCatalog(filters);
  const taxo = getTaxonomy();

  const current: Record<string, string> = {
    q: filters.q ?? "",
    industry: filters.industry ?? "",
    category: filters.category ?? "",
    subcategory: filters.subcategory ?? "",
    difficulty: filters.difficulty ?? "",
    tier: filters.tier ?? "",
    platform: filters.platform ?? "",
    platform2: filters.platform2 ?? "",
    sort: filters.sort ?? "",
  };

  const heading = filters.q
    ? `Results for "${filters.q}"`
    : filters.subcategory ?? filters.industry ?? filters.category ?? "All templates";

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Templates", path: "/workflows" },
    ...(filters.category
      ? [{ name: filters.category, path: `/workflows?category=${encodeURIComponent(filters.category)}` }]
      : []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <PageHeader
        eyebrow="Template catalog"
        title={heading}
        size="md"
        description={
          <>
            {total.toLocaleString("en-IN")} templates &middot;{" "}
            <Link
              href="/workflows?tier=Free"
              className="text-violet-400 transition-colors hover:text-violet-300"
            >
              browse free samples
            </Link>
          </>
        }
      />

      <div className="mt-6">
        <Suspense fallback={<div className="h-10" />}>
          <FilterBar taxonomy={taxo} current={current} />
        </Suspense>
      </div>

      {items.length === 0 ? (
        <div className="mx-auto mt-16 max-w-md text-center">
          <p className="text-muted">
            No templates match these filters.{" "}
            <Link href="/workflows" className="text-violet-400 hover:text-violet-300">
              Clear filters
            </Link>
          </p>
          <div className="mt-6 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-6">
            <h2 className="font-semibold text-ink">Can&apos;t find it? We&apos;ll build it.</h2>
            <p className="mt-1 text-sm text-muted">
              Describe the automation you need and get a fixed quote - built by the same team
              behind every template in this store.
            </p>
            <Link href="/custom" className="btn-primary btn-md mt-4 ">
              Request a custom workflow
            </Link>
          </div>
        </div>
      ) : (
        // Streamed rather than blocking: the heading, filter bar and pagination
        // are ready immediately, and only the card grid waits on the screenshot
        // lookup each WorkflowCard performs.
        //
        // Deliberately a local <Suspense> and not a `loading.tsx` — a loading
        // file here would also wrap /workflows/[route], and streaming that
        // segment would downgrade its genuine notFound() 404s to soft 404s
        // (status 200 + noindex). On a catalog with 10,000+ indexed URLs and
        // routes that get renamed, keeping a real 404 status matters more.
        <div className="mt-6">
          <Suspense fallback={<GridFallback count={items.length} />}>
            <ResultsGrid items={items} />
          </Suspense>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-3">
            {page > 1 && (
              <Link
                href={`/workflows${buildQuery(current, { page: page - 1 })}`}
                className="btn-secondary btn-sm"
              >
                &larr; Prev
              </Link>
            )}
            <span className="font-mono text-xs text-faint">
              Page {page} of {pages.toLocaleString("en-IN")}
            </span>
            {page < pages && (
              <Link
                href={`/workflows${buildQuery(current, { page: page + 1 })}`}
                className="btn-secondary btn-sm"
              >
                Next &rarr;
              </Link>
            )}
          </div>
          <Suspense fallback={<div className="h-9 w-40" />}>
            <PageJump basePath="/workflows" page={page} pages={pages} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
