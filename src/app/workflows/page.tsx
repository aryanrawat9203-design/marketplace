import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { queryCatalog, getTaxonomy } from "@/lib/catalog";
import WorkflowCard from "@/components/WorkflowCard";
import { FilterBar, PageJump } from "@/components/Controls";
import { buildQuery } from "@/lib/url";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = { title: "Browse templates" };

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

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
      <h1 className="text-2xl font-semibold text-zinc-100">{heading}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {total.toLocaleString("en-IN")} templates &middot;{" "}
        <Link href="/workflows?tier=Free" className="text-violet-400 hover:text-violet-300">
          browse free samples
        </Link>
      </p>

      <div className="mt-6">
        <Suspense fallback={<div className="h-10" />}>
          <FilterBar taxonomy={taxo} current={current} />
        </Suspense>
      </div>

      {items.length === 0 ? (
        <div className="mt-16 text-center text-zinc-400">
          No templates match these filters.{" "}
          <Link href="/workflows" className="text-violet-400 hover:text-violet-300">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-3">
            {page > 1 && (
              <Link
                href={`/workflows${buildQuery(current, { page: page - 1 })}`}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
              >
                Prev
              </Link>
            )}
            <span className="text-zinc-500">
              Page {page} of {pages.toLocaleString("en-IN")}
            </span>
            {page < pages && (
              <Link
                href={`/workflows${buildQuery(current, { page: page + 1 })}`}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
              >
                Next
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
