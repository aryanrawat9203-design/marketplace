import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { posts, getPost } from "@/lib/blog";
import { queryCatalog } from "@/lib/catalog";
import WorkflowCard from "@/components/WorkflowCard";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { baseUrl } from "@/lib/site";

export function generateStaticParams() {
    return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const p = getPost(slug);
    if (!p) return { title: "Post not found" };
    return { title: p.title, description: p.description };
}

export default async function BlogPostDetail({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const p = getPost(slug);
    if (!p) notFound();

  const items = p.platform
      ? queryCatalog({ platform: p.platform, sort: "demand", perPage: 6 }).items
        : p.category
        ? queryCatalog({ category: p.category, sort: "demand", perPage: 6 }).items
          : [];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: p.title, path: `/blog/${p.slug}` },
      ]);

  const posting = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: p.title,
        description: p.description,
        datePublished: p.date,
        dateModified: p.date,
        author: { "@type": "Organization", name: "WorkflowCrate" },
        publisher: { "@type": "Organization", name: "WorkflowCrate" },
        mainEntityOfPage: `${baseUrl()}/blog/${p.slug}`,
  };

  return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
              <JsonLd data={breadcrumb} />
              <JsonLd data={posting} />
              <nav className="text-xs text-zinc-500">
                      <Link href="/" className="hover:text-zinc-300">Home</Link>
                      <span className="mx-1">/</span>
                      <Link href="/blog" className="hover:text-zinc-300">Blog</Link>
              </nav>
        
              <div className="mt-4 text-xs text-zinc-500">
                {new Date(p.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">{p.title}</h1>
        
              <div className="mt-6 space-y-4 leading-relaxed text-zinc-300">
                {p.body.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
              </div>
        
          {items.length > 0 && (
                  <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((w) => (
                                <WorkflowCard key={w.id} w={w} />
                              ))}
                  </div>
              )}
        
              <p className="mt-8 leading-relaxed text-zinc-300">{p.closing}</p>
        
          {p.platform && (
                  <Link
                              href={`/integrations/${p.platform.toLowerCase().replace(/\s+/g, "-")}`}
                              className="mt-2 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
                            >
                            Browse all {p.platform} templates &rarr;
                  </Link>
              )}

          <div className="mt-10 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
                <p className="text-sm text-zinc-300">
                        Want structured practice? Our practice bundles arrange real, ready-to-import
                        templates into a beginner-to-advanced curriculum.
                </p>
                <Link
                        href="/practice-bundles"
                        className="mt-2 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
                >
                        Explore practice bundles &rarr;
                </Link>
          </div>
        </div>
      );
}
