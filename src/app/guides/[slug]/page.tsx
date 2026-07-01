import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { guides, getGuide } from "@/lib/guides";
import { queryCatalog, freeSamples } from "@/lib/catalog";
import WorkflowCard from "@/components/WorkflowCard";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return { title: "Guide not found" };
  return { title: g.title, description: g.description };
}

export default async function GuideDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  const items = g.freeOnly
    ? freeSamples(6)
    : g.category
      ? queryCatalog({ category: g.category, sort: "demand", perPage: 6 }).items
      : [];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: g.title, path: `/guides/${g.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <JsonLd data={breadcrumb} />
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/guides" className="hover:text-zinc-300">Guides</Link>
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-50">{g.title}</h1>

      <div className="mt-6 space-y-4 leading-relaxed text-zinc-300">
        {g.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {items.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      )}

      <p className="mt-8 leading-relaxed text-zinc-300">{g.closing}</p>

      {g.category && (
        <Link
          href={`/workflows?category=${encodeURIComponent(g.category)}`}
          className="mt-2 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
        >
          Browse all {g.category} templates &rarr;
        </Link>
      )}
      {g.freeOnly && (
        <Link
          href="/workflows?tier=Free"
          className="mt-2 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
        >
          Browse all free templates &rarr;
        </Link>
      )}
    </div>
  );
}
