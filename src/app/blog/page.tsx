import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { posts } from "@/lib/blog";

export const metadata: Metadata = pageMeta({
  title: "Blog",
  description:
    "Practical n8n automation patterns, workflow breakdowns, and what is new from WorkflowCrate.",
  path: "/blog",
});

export default function BlogIndexPage() {
    return (
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
                <p className="eyebrow">From the makers</p>
                <h1 className="mt-2.5 text-3xl font-bold tracking-tight text-ink">Blog</h1>
                <p className="mt-3 text-muted">
                        Practical n8n automation patterns and workflow breakdowns.
                </p>
                <div className="mt-8 space-y-4">
                  {posts.map((p) => (
                      <Link
                                    key={p.slug}
                                    href={`/blog/${p.slug}`}
                                    className="card card-hover group block p-5"
                                  >
                                  <div className="font-mono text-xs text-faint">
                                    {new Date(p.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                                  </div>
                                  <h2 className="mt-1.5 font-sans font-semibold text-ink group-hover:text-white">{p.title}</h2>
                                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.description}</p>
                                  <div className="link-arrow mt-3">
                                                Read post <span className="arrow">&rarr;</span>
                                  </div>
                      </Link>
                    ))}
                </div>
          </div>
        );
}
