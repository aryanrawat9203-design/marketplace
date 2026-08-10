import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { guides, getGuide } from "@/lib/guides";
import { queryCatalog, freeSamples } from "@/lib/catalog";
import WorkflowCard from "@/components/WorkflowCard";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, pageMeta, shareImage } from "@/lib/seo";

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
  return pageMeta({
    title: g.title,
    description: g.description,
    path: `/guides/${slug}`,
    image: shareImage(g.title, "WorkflowCrate guide"),
    type: "article",
  });
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
      : g.popular
        ? queryCatalog({ sort: "demand", perPage: 6 }).items
        : [];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: g.title, path: `/guides/${g.slug}` },
  ]);

  const faqJsonLd = g.faq?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: g.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <JsonLd data={breadcrumb} />
      <nav className="text-xs text-faint">
        <Link href="/" className="hover:text-body">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/guides" className="hover:text-body">Guides</Link>
      </nav>

      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{g.title}</h1>
      {g.updated && (
        <p className="mt-2 text-xs text-faint">Last reviewed {g.updated}</p>
      )}

      <div className="mt-6 space-y-4 leading-relaxed text-body">
        {g.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {g.sections && g.sections.length > 0 && (
        <div className="mt-10 space-y-9">
          {g.sections.map((sec) => (
            <section key={sec.h}>
              <h2 className="font-sans text-xl font-semibold tracking-tight text-ink">{sec.h}</h2>
              <div className="mt-2.5 space-y-3.5 leading-relaxed text-body">
                {sec.p.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {g.faq && g.faq.length > 0 && (
        <div className="mt-12">
          <h2 className="font-sans text-xl font-semibold tracking-tight text-ink">
            Common questions
          </h2>
          <dl className="mt-4 space-y-5">
            {g.faq.map((f) => (
              <div key={f.q} className="card p-5">
                <dt className="font-semibold text-ink">{f.q}</dt>
                <dd className="mt-2 leading-relaxed text-body">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      )}

      <p className="mt-8 leading-relaxed text-body">{g.closing}</p>

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
          href="/free"
          className="mt-2 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
        >
          Browse all free templates &rarr;
        </Link>
      )}
      {g.popular && (
        <Link
          href="/workflows"
          className="mt-2 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
        >
          Browse the full template catalog &rarr;
        </Link>
      )}
    </div>
  );
}
