import Link from "next/link";
import type { Metadata } from "next";
import { posts } from "@/lib/blog";

export const metadata: Metadata = {
    title: "Blog",
    description: "Practical n8n automation patterns, workflow breakdowns, and what is new from WorkflowCrate.",
};

export default function BlogIndexPage() {
    return (
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Blog</h1>
                <p className="mt-3 text-zinc-400">
                        Practical n8n automation patterns and workflow breakdowns.
                </p>
                <div className="mt-8 space-y-4">
                  {posts.map((p) => (
                      <Link
                                    key={p.slug}
                                    href={`/blog/${p.slug}`}
                                    className="group block rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 card-hover hover:border-violet-500/50 hover:bg-zinc-900/70"
                                  >
                                  <div className="text-xs text-zinc-500">
                                    {new Date(p.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                                  </div>
                                  <h2 className="mt-1 font-semibold text-zinc-100 group-hover:text-white">{p.title}</h2>
                                  <p className="mt-2 text-sm text-zinc-400">{p.description}</p>
                                  <div className="mt-3 text-sm font-medium text-violet-400 group-hover:text-violet-300">
                                                Read post &rarr;
                                  </div>
                      </Link>
                    ))}
                </div>
          </div>
        );
}
