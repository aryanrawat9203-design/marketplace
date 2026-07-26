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
      <p className="eyebrow">Template catalog</p>
      <h1 className="mt-2.5 text-2xl font-semibold text-zinc-50 sm:text-3xl">{heading}</h1>
      <p className="mt-1.5 text-sm text-zinc-500">
        {total.toLocaleString("en-IN")} templates &middot;{" "}
        <Link href="/workflows?tier=Free" className="text-violet-400 transition-colors hover:text-violet-300">
          browse free samples
        </Link>
      </p>

      <div className="mt-6">
        <Suspense fallback={<div className="h-10" />}>
          <FilterBar taxonomy={taxo} current={current} />
        </Suspense>
      </div>

      {items.length === 0 ? (
        <div className="mx-auto mt-16 max-w-md text-center">
          <p className="text-zinc-400">
            No templates match these filters.{" "}
            <Link href="/workflows" className="text-violet-400 hover:text-violet-300">
              Clear filters
            </Link>
          </p>
          <div className="mt-6 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-6">
            <h2 className="font-semibold text-zinc-100">Can&apos;t find it? We&apos;ll build it.</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Describe the automation you need and get a fixed quote - built by the same team
              behind every template in this store.
            </p>
            <Link href="/custom" className="btn-primary mt-4 px-5 py-2.5 text-sm">
              Request a custom workflow
            </Link>
          </div>
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
                className="btn-secondary rounded-lg px-4 py-2"
              >
                &larr; Prev
              </Link>
            )}
            <span className="font-mono text-xs text-zinc-500">
              Page {page} of {pages.toLocaleString("en-IN")}
            </span>
            {page < pages && (
              <Link
                href={`/workflows${buildQuery(current, { page: page + 1 })}`}
                className="btn-secondary rounded-lg px-4 py-2"
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
