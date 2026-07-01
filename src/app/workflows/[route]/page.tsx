import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getByRoute, related } from "@/lib/catalog";
import { bundleForCategory, bundleForSubcategory } from "@/lib/bundles";
import { Badge, difficultyTone, tierTone } from "@/components/Badge";
import WorkflowCard from "@/components/WorkflowCard";
import BuyButton from "@/components/BuyButton";
import PriceTag from "@/components/PriceTag";
import TrustStrip from "@/components/TrustStrip";
import { inr } from "@/lib/pricing";
import { requireLoginToBuy } from "@/lib/require-login";
import { previewWorkflow } from "@/lib/commerce";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ route: string }>;
}): Promise<Metadata> {
  const { route } = await params;
  const w = getByRoute(route);
  if (!w) return { title: "Template not found" };
  return {
    title: w.title,
    description: w.shortDescription ?? w.description ?? undefined,
    openGraph: { title: w.title, description: w.shortDescription ?? undefined, type: "article" },
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
  const subBundle = w.category && w.subcategory ? bundleForSubcategory(w.category, w.subcategory) : undefined;
  const catBundle = w.category ? bundleForCategory(w.category) : undefined;
  const upsell = subBundle ?? catBundle;
  const preview = previewWorkflow(w.route);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/workflows" className="hover:text-zinc-300">Templates</Link>
        {w.category && (
          <>
            <span className="mx-1">/</span>
            <Link href={`/workflows?category=${encodeURIComponent(w.category)}`} className="hover:text-zinc-300">
              {w.category}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {w.free && <Badge tone="emerald">Free sample</Badge>}
        {w.difficulty && <Badge tone={difficultyTone(w.difficulty)}>{w.difficulty}</Badge>}
        {w.tier && !w.free && <Badge tone={tierTone(w.tier)}>{w.tier}</Badge>}
        {w.category && <Badge tone="violet">{w.category}</Badge>}
        {w.trigger && <Badge>{w.trigger} trigger</Badge>}
        {preview && <Badge tone="sky">{preview.nodeCount} nodes</Badge>}
      </div>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50">{w.title}</h1>
      {w.subtitle && <p className="mt-2 text-lg text-zinc-400">{w.subtitle}</p>}

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
                    <span className="mt-1 text-emerald-400">&#10003;</span>
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
                    <span className="mt-1 text-violet-400">&rarr;</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {w.platforms.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-100">Integrations</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {w.platforms.map((p) => (
                  <span key={p} className="rounded-md bg-zinc-800/70 px-2 py-1 text-xs text-zinc-300">{p}</span>
                ))}
                {w.aiProviders.map((p) => (
                  <span key={p} className="rounded-md bg-violet-500/10 px-2 py-1 text-xs text-violet-300">{p}</span>
                ))}
              </div>
            </div>
          )}

          {preview && preview.nodeTypes.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-100">
                What&apos;s inside <span className="text-sm font-normal text-zinc-500">({preview.nodeCount} nodes)</span>
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                A look at the node types this workflow uses. No purchase required &mdash; full parameters and
                credentials are yours after you buy.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {preview.nodeTypes.map((t) => (
                  <span key={t} className="rounded-md bg-zinc-800/70 px-2 py-1 text-xs text-zinc-300">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
            <PriceTag price={w.price} mrp={w.mrp} off={w.off} free={w.free} size="lg" />
            <div className="mt-4">
              <BuyButton
                item={{ kind: "workflow", key: w.route, name: w.title, price: w.price, free: w.free }}
                block
                requireLogin={requireLoginToBuy()}
              />
              {!w.free && <TrustStrip />}
            </div>
            <ul className="mt-5 space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Instant download after payment</li>
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Ready-to-import n8n JSON file</li>
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Original template, yours to use &amp; adapt</li>
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Secure, time-limited download link</li>
            </ul>
          </div>

          {upsell && (
            <Link href={`/bundles/${upsell.slug}`} className="block rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5 hover:border-violet-500/60">
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-300">Save with a bundle</div>
              <div className="mt-1 text-sm text-zinc-300">
                Get all <b className="text-zinc-100">{upsell.count}</b>{" "}
                {upsell.type === "subcategory" ? upsell.subcategory : upsell.category} templates for{" "}
                <b className="text-zinc-100">{inr(upsell.price)}</b>{" "}
                <span className="text-zinc-500 line-through">{inr(upsell.mrp)}</span>
              </div>
              <div className="mt-2 text-sm font-medium text-violet-400">View bundle &rarr;</div>
            </Link>
          )}

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-zinc-200">At a glance</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Industry" v={w.industry} />
              <Row k="Category" v={w.category} />
              <Row k="Subcategory" v={w.subcategory} />
              <Row k="Setup" v={w.setup} />
              <Row k="Est. value" v={w.estValue} />
              {w.demand != null && <Row k="Demand score" v={`${w.demand}/100`} />}
              {w.value != null && <Row k="Commercial value" v={`${w.value}/100`} />}
            </dl>
          </div>
        </aside>
      </div>

      {rel.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-semibold text-zinc-100">Related templates</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rel.map((r) => (
              <WorkflowCard key={r.id} w={r} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-4 text-xs text-zinc-500">
        Original n8n workflow template created and owned by FlowDex. After purchase you receive the
        ready-to-import JSON file and a license to use and adapt it in your own projects.
      </div>
    </div>
  );
}
