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
import { previewWorkflow, workflowGraphData } from "@/lib/commerce";
import { reviewSummary } from "@/lib/reviews";
import WorkflowGraph from "@/components/WorkflowGraph";
import AddToCartButton from "@/components/AddToCartButton";
import StickyBuyBar from "@/components/StickyBuyBar";
import { RecentlyViewedTracker, RecentlyViewedStrip } from "@/components/RecentlyViewed";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { baseUrl } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ route: string }>;
}): Promise<Metadata> {
  const { route } = await params;
  const w = getByRoute(route);
  if (!w) return { title: "Template not found" };
  const preview = previewWorkflow(w.route);
  const ogImg = `/api/og?title=${encodeURIComponent(w.title)}&category=${encodeURIComponent(w.category ?? "")}&nodes=${preview?.nodeCount ?? 0}`;
  return {
    title: w.title,
    description: w.shortDescription ?? w.description ?? undefined,
    openGraph: { title: w.title, description: w.shortDescription ?? undefined, type: "article", images: [ogImg] },
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
  const graph = workflowGraphData(w.route);
  const reviews = await reviewSummary(w.route);

  const productFaqs: [string, string][] = [
    [
      "What exactly do I get?",
      "The complete, ready-to-import n8n workflow as a JSON file, delivered instantly after " +
        (w.free ? "download" : "payment") +
        ". Import it into your own n8n (cloud or self-hosted), add your credentials, and it runs.",
    ],
    [
      "How do I import it into n8n?",
      "In n8n, open Workflows, click the three-dot menu, choose “Import from File”, and select the downloaded JSON. Then connect your own app credentials on the highlighted nodes.",
    ],
    [
      "Do I need anything else for it to work?",
      "You need your own n8n instance and accounts/credentials for the apps this workflow connects to" +
        (w.platforms.length > 0 ? ` (${w.platforms.slice(0, 4).join(", ")}${w.platforms.length > 4 ? ", …" : ""})` : "") +
        ". No coding is required.",
    ],
    [
      "What if it doesn't work for me?",
      "If the file is faulty, won't import, or isn't as described, contact us within 7 days and we'll fix it or refund you - see our refund policy.",
    ],
    [
      "Can I modify or resell it?",
      "You can freely adapt and use it in your own or your clients' projects. Reselling or redistributing the template file itself is not permitted.",
    ],
  ];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: productFaqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Templates", path: "/workflows" },
    ...(w.category
      ? [{ name: w.category, path: `/workflows?category=${encodeURIComponent(w.category)}` }]
      : []),
    { name: w.title, path: `/workflows/${w.route}` },
  ]);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: w.title,
    description: w.shortDescription ?? w.description ?? undefined,
    category: w.category ?? undefined,
    offers: {
      "@type": "Offer",
      price: w.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${baseUrl()}/workflows/${w.route}`,
    },
    // Only real, moderated buyer reviews ever reach this markup.
    ...(reviews.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviews.average,
            reviewCount: reviews.count,
          },
          review: reviews.reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating },
            author: { "@type": "Person", name: r.authorLabel },
            reviewBody: r.body,
          })),
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <JsonLd data={productJsonLd} />
      <JsonLd data={faqJsonLd} />
      <RecentlyViewedTracker
        item={{
          route: w.route,
          title: w.title,
          category: w.category,
          price: w.price,
          mrp: w.mrp,
          free: w.free,
        }}
      />
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
        <div className="lg:col-span-2 min-w-0">
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

          {graph && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-100">
                Workflow preview{" "}
                <span className="text-sm font-normal text-zinc-500">({graph.nodes.length} nodes)</span>
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                The template&apos;s actual node layout and connections. Node parameters and credential
                slots unlock with the download.
              </p>
              <div className="mt-3">
                <WorkflowGraph graph={graph} />
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

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-100">From download to running in 3 steps</h2>
            <ol className="mt-3 space-y-3">
              {[
                ["Import", "In n8n, open Workflows → menu → “Import from File” and pick the downloaded JSON."],
                ["Connect", "Add your own credentials on the app nodes - n8n highlights exactly which ones need them."],
                ["Activate", "Run it once to test, then toggle Active. The automation is live."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-sm font-semibold text-violet-300">
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-medium text-zinc-100">{t}.</span>{" "}
                    <span className="text-sm text-zinc-400">{d}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {reviews.count > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-100">
                Customer reviews{" "}
                <span className="text-sm font-normal text-zinc-500">
                  {reviews.average} / 5 &middot; {reviews.count} verified{" "}
                  {reviews.count === 1 ? "buyer" : "buyers"}
                </span>
              </h2>
              <div className="mt-3 space-y-3">
                {reviews.reviews.map((r, i) => (
                  <div key={i} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span aria-label={`${r.rating} out of 5 stars`} className="text-amber-400">
                        {"★".repeat(r.rating)}
                        <span className="text-zinc-700">{"★".repeat(5 - r.rating)}</span>
                      </span>
                      <span className="text-sm text-zinc-300">{r.authorLabel}</span>
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300">
                        Verified buyer
                      </span>
                      {r.createdAt && (
                        <span className="text-xs text-zinc-600">
                          {new Date(r.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      )}
                    </div>
                    {r.title && <div className="mt-2 text-sm font-medium text-zinc-100">{r.title}</div>}
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-100">Common questions</h2>
            <div className="mt-3 space-y-2">
              {productFaqs.map(([q, a]) => (
                <details
                  key={q}
                  className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3"
                >
                  <summary className="cursor-pointer list-none text-sm font-medium text-zinc-200 marker:content-none group-open:text-white">
                    {q}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{a}</p>
                </details>
              ))}
            </div>
          </div>
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
              {!w.free && (
                <AddToCartButton
                  line={{ kind: "workflow", key: w.route, name: w.title, price: w.price, mrp: w.mrp }}
                  block
                />
              )}
              {!w.free && <TrustStrip />}
            </div>
            <ul className="mt-5 space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Instant download after payment</li>
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Ready-to-import n8n JSON file</li>
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Original template, yours to use &amp; adapt</li>
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Secure, time-limited download link</li>
            </ul>
            {!w.free && (
              <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-zinc-300">
                <span className="font-semibold text-emerald-300">7-day guarantee.</span> If it won&apos;t
                import or isn&apos;t as described, we fix it or refund you.{" "}
                <Link href="/refund" className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
                  Refund policy
                </Link>
              </div>
            )}
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

          <Link
            href="/custom"
            className="block rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 hover:border-violet-500/50"
          >
            <h3 className="text-sm font-semibold text-zinc-200">Need a variation of this?</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Different apps, extra steps, your exact process - we build custom workflows to order.
            </p>
            <span className="mt-2 inline-block text-sm font-medium text-violet-400">
              Get a fixed quote &rarr;
            </span>
          </Link>

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

      <RecentlyViewedStrip excludeRoute={w.route} />

      <div className="mt-12 rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-4 text-xs text-zinc-500">
        Original n8n workflow template created and owned by WorkflowCrate. After purchase you receive the
        ready-to-import JSON file and a license to use and adapt it in your own projects.
      </div>

      <StickyBuyBar
        item={{ kind: "workflow", key: w.route, name: w.title, price: w.price, free: w.free }}
        mrp={w.mrp}
        requireLogin={requireLoginToBuy()}
      />
    </div>
  );
}
