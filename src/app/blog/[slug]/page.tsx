import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { posts, getPost } from "@/lib/blog";
import { queryCatalog } from "@/lib/catalog";
import WorkflowCard from "@/components/WorkflowCard";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, pageMeta, shareImage } from "@/lib/seo";
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
    return pageMeta({
        title: p.title,
        description: p.description,
        path: `/blog/${slug}`,
        image: shareImage(p.title, "WorkflowCrate blog"),
        type: "article",
    });
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
              <nav className="text-xs text-faint">
                      <Link href="/" className="hover:text-body">Home</Link>
                      <span className="mx-1">/</span>
                      <Link href="/blog" className="hover:text-body">Blog</Link>
              </nav>
        
              <div className="mt-4 text-xs text-faint">
                {new Date(p.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{p.title}</h1>
        
              <div className="mt-6 space-y-4 leading-relaxed text-body">
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
        
              <p className="mt-8 leading-relaxed text-body">{p.closing}</p>
        
          {p.platform && (
                  <Link
                              href={`/integrations/${p.platform.toLowerCase().replace(/\s+/g, "-")}`}
                              className="mt-2 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
                            >
                            Browse all {p.platform} templates &rarr;
                  </Link>
              )}

          <div className="card mt-10 p-5">
                <p className="text-sm text-body">
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
