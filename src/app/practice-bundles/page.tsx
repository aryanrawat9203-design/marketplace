import Link from "next/link";
import type { Metadata } from "next";
import { practiceBundles } from "@/lib/bundles";
import { inr } from "@/lib/pricing";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "n8n workflow templates for practice — structured practice bundles",
  description:
    "Practice n8n with ready-to-import workflow templates arranged as a real curriculum — from your first simple automation to production-grade, enterprise architecture. Sold as bundles only.",
  alternates: { canonical: "/practice-bundles" },
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
        <p className="eyebrow">Learn n8n</p>
        <h1 className="mt-2.5 text-3xl font-bold text-ink">Practice bundles</h1>
        <p className="mt-2 text-muted">
          The fastest way to practice n8n is importing real workflow templates and pulling them apart.
          These bundles arrange that practice into a structured curriculum, not a grab-bag. Every bundle starts with simple, 4&ndash;8 node
          automations and works up to the same production patterns &mdash; branching, retries, idempotency,
          audit logging, human-in-the-loop approval &mdash; used in our real Enterprise-tier templates. Sold
          as bundles only.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">The generalist ladder</h2>
        <p className="mt-1 text-sm text-muted">
          Each pack is a complete curriculum on its own. Bigger packs include everything in the smaller
          ones, plus more depth &mdash; upgrade anytime without losing progress.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ladderBundles.map((b, i) => (
            <Link
              key={b.slug}
              href={`/practice-bundles/${b.slug}`}
              className="card card-hover group flex flex-col overflow-hidden"
            >
              <div className={`h-1 bg-gradient-to-r ${b.gradient}`} />
              <div className="flex flex-1 flex-col p-5">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-faint">
                  Step {i + 1}
                </span>
                <h3 className="mt-1.5 font-sans font-semibold text-ink group-hover:text-white">{b.name}</h3>
                <p className="mt-2 text-xs text-faint">{b.skillLevel}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{b.tagline}</p>
                <p className="mt-3 font-mono text-xs text-faint">{fmt(b.count)} templates</p>
                <div className="mt-3 flex items-baseline gap-2 border-t border-white/[0.06] pt-3">
                  <span className="font-display text-xl font-bold tracking-tight text-ink">{inr(b.price)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <Reveal>
          <h2 className="text-xl font-semibold text-ink">Specialization packs</h2>
          <p className="mt-1 text-sm text-muted">
            Already comfortable with the basics? Go deep on one high-demand niche instead of the full
            generalist ladder.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {specBundles.map((b) => (
              <Link
                key={b.slug}
                href={`/practice-bundles/${b.slug}`}
                className="card card-hover group flex flex-col overflow-hidden"
              >
                <div className={`h-1 bg-gradient-to-r ${b.gradient}`} />
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-sans font-semibold text-ink group-hover:text-white">{b.name}</h3>
                  <p className="mt-1 text-xs text-faint">{b.audience}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{b.tagline}</p>
                  <p className="mt-3 font-mono text-xs text-faint">{fmt(b.count)} templates</p>
                  <div className="mt-3 flex items-baseline gap-2 border-t border-white/[0.06] pt-3">
                    <span className="font-display text-xl font-bold tracking-tight text-ink">{inr(b.price)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {flagshipBundle && (
        <section className="mt-14">
          <Reveal>
            <Link
              href={`/practice-bundles/${flagshipBundle.slug}`}
              className={`group block overflow-hidden rounded-2xl bg-gradient-to-br ${flagshipBundle.gradient} p-[1px] card-hover`}
            >
              <div className="flex flex-col items-start justify-between gap-4 rounded-[15px] bg-surface-1 p-6 sm:flex-row sm:items-center sm:p-7">
                <div>
                  <h2 className="text-xl font-semibold text-ink">{flagshipBundle.name}</h2>
                  <p className="mt-1 text-sm text-muted">{flagshipBundle.tagline}</p>
                  <p className="mt-2 text-xs text-faint">
                    {fmt(flagshipBundle.count)} templates &middot; individually worth {inr(flagshipBundle.individualValue)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-display text-3xl font-bold tracking-tight text-ink">{inr(flagshipBundle.price)}</div>
                  </div>
                  <span className="btn-primary btn-sm">View bundle</span>
                </div>
              </div>
            </Link>
          </Reveal>
        </section>
      )}

      <section className="card mt-14 p-6">
        <h2 className="text-lg font-semibold text-ink">Not just harder &mdash; harder for a reason</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Every template in these bundles is pulled from our real production catalog. Early templates are
          simple on purpose: one trigger, one or two actions, no branching. Later templates add real
          business branching, retry-on-fail, idempotency guards, multi-system sync, audit logging, and &mdash;
          in the hardest tier &mdash; human-in-the-loop approval and SLA monitoring. You&apos;re practicing on
          the same architecture patterns used in our highest-tier commercial templates, not toy examples.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold text-ink">New to practicing with templates?</h2>
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
