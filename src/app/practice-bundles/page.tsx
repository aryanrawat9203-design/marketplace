import Link from "next/link";
import type { Metadata } from "next";
import { practiceBundles } from "@/lib/bundles";
import { inr } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "n8n workflow templates for practice — structured practice bundles",
  description:
    "Practice n8n with ready-to-import workflow templates arranged as a real curriculum — from your first simple automation to production-grade, enterprise architecture. Sold as bundles only.",
};

const fmt = (n: number) => n.toLocaleString("en-IN");

const ladder = ["getting-started-pack", "skill-builder-pack", "job-ready-pack", "automation-architect-pack"];
const specializations = ["ai-agent-specialist-pack", "lead-gen-crm-specialist-pack"];
const flagship = "complete-mastery-bundle";

export default function PracticeBundlesPage() {
  const all = practiceBundles();
  const bySlug = Object.fromEntries(all.map((b) => [b.slug, b]));
  const ladderBundles = ladder.map((s) => bySlug[s]).filter(Boolean);
  const specBundles = specializations.map((s) => bySlug[s]).filter(Boolean);
  const flagshipBundle = bySlug[flagship];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <span className="rounded-md bg-violet-500/15 px-2 py-1 text-xs font-semibold text-violet-300">
          Learn n8n
        </span>
        <h1 className="mt-3 text-3xl font-bold text-zinc-50">Practice bundles</h1>
        <p className="mt-2 text-zinc-400">
          The fastest way to practice n8n is importing real workflow templates and pulling them apart.
          These bundles arrange that practice into a structured curriculum, not a grab-bag. Every bundle starts with simple, 4&ndash;8 node
          automations and works up to the same production patterns &mdash; branching, retries, idempotency,
          audit logging, human-in-the-loop approval &mdash; used in our real Enterprise-tier templates. Sold
          as bundles only.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-zinc-100">The generalist ladder</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Each pack is a complete curriculum on its own. Bigger packs include everything in the smaller
          ones, plus more depth &mdash; upgrade anytime without losing progress.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ladderBundles.map((b, i) => (
            <Link
              key={b.slug}
              href={`/practice-bundles/${b.slug}`}
              className={`group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 card-hover hover:border-violet-500/50`}
            >
              <div className={`h-2 bg-gradient-to-r ${b.gradient}`} />
              <div className="flex flex-1 flex-col p-5">
                <span className="text-xs font-semibold text-zinc-500">Step {i + 1}</span>
                <h3 className="mt-1 font-semibold text-zinc-100 group-hover:text-white">{b.name}</h3>
                <p className="mt-2 text-xs text-zinc-500">{b.skillLevel}</p>
                <p className="mt-2 flex-1 text-sm text-zinc-400">{b.tagline}</p>
                <p className="mt-3 text-xs text-zinc-500">{fmt(b.count)} templates</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-zinc-50">{inr(b.price)}</span>
                  <span className="text-sm text-zinc-500 line-through">{inr(b.mrp)}</span>
                  <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                    {b.off}% off
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold text-zinc-100">Specialization packs</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Already comfortable with the basics? Go deep on one high-demand niche instead of the full
          generalist ladder.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {specBundles.map((b) => (
            <Link
              key={b.slug}
              href={`/practice-bundles/${b.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 card-hover hover:border-violet-500/50"
            >
              <div className={`h-2 bg-gradient-to-r ${b.gradient}`} />
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-semibold text-zinc-100 group-hover:text-white">{b.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">{b.audience}</p>
                <p className="mt-2 flex-1 text-sm text-zinc-400">{b.tagline}</p>
                <p className="mt-3 text-xs text-zinc-500">{fmt(b.count)} templates</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-zinc-50">{inr(b.price)}</span>
                  <span className="text-sm text-zinc-500 line-through">{inr(b.mrp)}</span>
                  <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                    {b.off}% off
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {flagshipBundle && (
        <section className="mt-14">
          <Link
            href={`/practice-bundles/${flagshipBundle.slug}`}
            className={`group block overflow-hidden rounded-2xl bg-gradient-to-br ${flagshipBundle.gradient} p-[1px] card-hover`}
          >
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-[#0b0b11] p-6 sm:flex-row sm:items-center">
              <div>
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  {flagshipBundle.off}% off
                </span>
                <h2 className="mt-3 text-xl font-semibold text-zinc-50">{flagshipBundle.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">{flagshipBundle.tagline}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {fmt(flagshipBundle.count)} templates &middot; individually worth {inr(flagshipBundle.individualValue)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-zinc-50">{inr(flagshipBundle.price)}</div>
                  <div className="text-sm text-zinc-500 line-through">{inr(flagshipBundle.mrp)}</div>
                </div>
                <span className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white group-hover:bg-violet-500">
                  View bundle
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      <section className="mt-14 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Not just harder &mdash; harder for a reason</h2>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Every template in these bundles is pulled from our real production catalog. Early templates are
          simple on purpose: one trigger, one or two actions, no branching. Later templates add real
          business branching, retry-on-fail, idempotency guards, multi-system sync, audit logging, and &mdash;
          in the hardest tier &mdash; human-in-the-loop approval and SLA monitoring. You&apos;re practicing on
          the same architecture patterns used in our highest-tier commercial templates, not toy examples.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold text-zinc-100">New to practicing with templates?</h2>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <Link
            href="/blog/n8n-workflow-templates-for-practice"
            className="font-medium text-violet-400 hover:text-violet-300"
          >
            How to actually learn n8n from practice templates &rarr;
          </Link>
          <Link
            href="/blog/n8n-workflow-examples-for-beginners"
            className="font-medium text-violet-400 hover:text-violet-300"
          >
            7 n8n workflow examples for beginners &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
