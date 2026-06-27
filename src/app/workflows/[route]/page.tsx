import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getByRoute, related } from "@/lib/catalog";
import { Badge, difficultyTone, tierTone } from "@/components/Badge";
import WorkflowCard from "@/components/WorkflowCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ route: string }>;
}): Promise<Metadata> {
  const { route } = await params;
  const w = getByRoute(route);
  if (!w) return { title: "Workflow not found" };
  return {
    title: w.title,
    description: w.shortDescription ?? w.description ?? undefined,
    openGraph: {
      title: w.title,
      description: w.shortDescription ?? undefined,
      type: "article",
    },
  };
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-zinc-500">{k}</dt>
      <dd className="text-right text-zinc-300">{v}</dd>
    </div>
  );
}

export default async function WorkflowDetail({
  params,
}: {
  params: Promise<{ route: string }>;
}) {
  const { route } = await params;
  const w = getByRoute(route);
  if (!w) notFound();
  const rel = related(w, 4);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/workflows" className="hover:text-zinc-300">Workflows</Link>
        {w.industry && (
          <>
            <span className="mx-1">/</span>
            <Link
              href={`/workflows?industry=${encodeURIComponent(w.industry)}`}
              className="hover:text-zinc-300"
            >
              {w.industry}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {w.difficulty && <Badge tone={difficultyTone(w.difficulty)}>{w.difficulty}</Badge>}
        {w.tier && <Badge tone={tierTone(w.tier)}>{w.tier}</Badge>}
        {w.category && <Badge tone="violet">{w.category}</Badge>}
        {w.trigger && <Badge>{w.trigger} trigger</Badge>}
      </div>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50">{w.title}</h1>
      {w.subtitle && <p className="mt-2 text-lg text-zinc-400">{w.subtitle}</p>}

      {w.sourceUrl && (
        <div className="mt-6">
          <a
            href={w.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 font-medium text-white hover:opacity-95"
          >
            Open this workflow free on n8n.io
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {w.longDescription && (
            <p className="whitespace-pre-line leading-relaxed text-zinc-300">{w.longDescription}</p>
          )}

          {w.benefits.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-100">Key benefits</h2>
              <ul className="mt-3 space-y-2">
                {w.benefits.map((b, i) => (
                  <li key={i} className="flex gap-2 text-zinc-300">
                    <span className="mt-1 text-emerald-400">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {w.useCases.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-100">Use cases</h2>
              <ul className="mt-3 space-y-2">
                {w.useCases.map((b, i) => (
                  <li key={i} className="flex gap-2 text-zinc-300">
                    <span className="mt-1 text-violet-400">→</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-zinc-200">At a glance</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Industry" v={w.industry} />
              <Row k="Category" v={w.category} />
              <Row k="Setup" v={w.setup} />
              <Row k="Est. value" v={w.estValue} />
              {w.demand != null && <Row k="Demand score" v={`${w.demand}/100`} />}
              {w.value != null && <Row k="Commercial value" v={`${w.value}/100`} />}
            </dl>
          </div>

          {w.platforms.length > 0 && (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
              <h3 className="text-sm font-semibold text-zinc-200">Integrations</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {w.platforms.map((p) => (
                  <span key={p} className="rounded-md bg-zinc-800/70 px-2 py-1 text-xs text-zinc-300">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {w.aiProviders.length > 0 && (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
              <h3 className="text-sm font-semibold text-zinc-200">AI models</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {w.aiProviders.map((p) => (
                  <span key={p} className="rounded-md bg-violet-500/10 px-2 py-1 text-xs text-violet-300">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {rel.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-semibold text-zinc-100">Related workflows</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rel.map((r) => (
              <WorkflowCard key={r.id} w={r} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-4 text-xs text-zinc-500">
        This workflow was created by its original author and is hosted free on n8n.io. FlowDex is an
        independent directory and is not affiliated with n8n.
      </div>
    </div>
  );
}
