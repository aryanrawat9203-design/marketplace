import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { canonicalRoute, getByRoute, related } from "@/lib/catalog";
import { getScreenshotsForRoute, orderedGallery, SHOWCASE_SLOT_LABELS } from "@/lib/screenshots";
import { bundleForCategory, bundleForSubcategory } from "@/lib/bundles";
import { Badge, difficultyTone, tierTone } from "@/components/Badge";
import WorkflowCard from "@/components/WorkflowCard";
import BuyButton from "@/components/BuyButton";
import PriceTag from "@/components/PriceTag";
import TrustStrip from "@/components/TrustStrip";
import { inr } from "@/lib/pricing";
import { requireLoginToBuy } from "@/lib/require-login";
import { previewWorkflow, workflowGraphData, workflowSetupChecklist } from "@/lib/commerce";
import SetupChecklistSection from "@/components/SetupChecklistSection";
import { reviewSummary } from "@/lib/reviews";
import { learningFor } from "@/lib/learning";
import WorkflowGraph from "@/components/WorkflowGraph";
import AddToCartButton from "@/components/AddToCartButton";
import StickyBuyBar from "@/components/StickyBuyBar";
import TrackView from "@/components/TrackView";
import { RecentlyViewedTracker, RecentlyViewedStrip } from "@/components/RecentlyViewed";
import JsonLd from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/PageHeader";
import { breadcrumbJsonLd, pageMeta, productOffer } from "@/lib/seo";
import { isWithdrawnId, withdrawnNodes } from "@/lib/withdrawn";
import { TEMPLATE_COUNT_LABEL } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ route: string }>;
}): Promise<Metadata> {
  const { route } = await params;
  const w = getByRoute(canonicalRoute(route));
  if (!w) return { title: "Template not found" };
  const preview = previewWorkflow(w.route);
  const shots = await getScreenshotsForRoute(w.route);
  const image =
    shots?.cardThumb ??
    shots?.overview ??
    `/api/og?title=${encodeURIComponent(w.title)}&category=${encodeURIComponent(w.category ?? "")}&nodes=${preview?.nodeCount ?? 0}`;
  return pageMeta({
    title: w.title,
    description: w.shortDescription ?? w.description ?? "",
    path: `/workflows/${w.route}`,
    image,
    type: "article",
    // A withdrawn template keeps its URL so an indexed link does not rot, but
    // there is no reason to ask Google to rank a page for something we will not
    // sell. Same predicate that removes it from the sitemap.
    noindex: isWithdrawnId(w.id),
  });
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-faint">{k}</dt>
      <dd className="text-right text-body">{v}</dd>
    </div>
  );
}

export default async function WorkflowDetail({
  params,
}: {
  params: Promise<{ route: string }>;
}) {
  const { route } = await params;
  // Corrected slug: send the stale URL to the real one before rendering, so the
  // indexed link keeps its equity instead of serving duplicate content.
  const canonical = canonicalRoute(route);
  if (canonical !== route) permanentRedirect(`/workflows/${canonical}`);
  const w = getByRoute(route);
  if (!w) notFound();
  const rel = related(w, 4);
  const subBundle = w.category && w.subcategory ? bundleForSubcategory(w.category, w.subcategory) : undefined;
  const catBundle = w.category ? bundleForCategory(w.category) : undefined;
  const upsell = subBundle ?? catBundle;
  const preview = previewWorkflow(w.route);
  const graph = workflowGraphData(w.route);
  const setup = workflowSetupChecklist(w.route);
  const reviews = await reviewSummary(w.route);
  const shots = await getScreenshotsForRoute(w.route);
  const gallery = orderedGallery(shots);
  const learning = learningFor(w, preview?.caps ?? null);
  // Withdrawn: the page still renders so an indexed URL does not rot and a
  // buyer who followed a link gets an explanation, but nothing on it sells.
  const withdrawn = isWithdrawnId(w.id);
  const withdrawnNodeList = withdrawnNodes(w.id)
    .map((n) => `"${n}"`)
    .join(", ");

  const productFaqs: [string, string][] = [
    [
      "What exactly do I get?",
      "A ZIP holding the complete n8n workflow as a JSON file plus a generated SETUP.md, delivered instantly after " +
        (w.free ? "download" : "payment") +
        ". Import the JSON into your own n8n (cloud or self-hosted), then follow the checklist: your credentials, and the values this template leaves for you to choose. The full list is in the setup section above, before you buy.",
    ],
    [
      "How do I import it into n8n?",
      "In n8n, open Workflows, click the three-dot menu, choose “Import from File”, and select the workflow JSON from the download. n8n flags the nodes missing credentials, but it does not flag the resource pickers this template leaves unset - those show a placeholder name and look configured. The SETUP.md beside the JSON lists both.",
    ],
    [
      "Do I need anything else for it to work?",
      "Your own n8n instance, and accounts/credentials for the apps this workflow connects to" +
        (w.platforms.length > 0 ? ` (${w.platforms.slice(0, 4).join(", ")}${w.platforms.length > 4 ? ", …" : ""})` : "") +
        (setup
          ? `. Beyond credentials, this template has ${setup.bindings.length === 0 ? "no values" : setup.bindings.length === 1 ? "one value" : `${setup.bindings.length} values`} left for you to pick, and ${setup.behaviour.length === 1 ? "one behaviour" : `${setup.behaviour.length} behaviours`} worth checking - all listed in the setup section above.`
          : ".") +
        " No coding is required.",
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
    sku: w.id,
    brand: { "@type": "Brand", name: "WorkflowCrate" },
    // No offer on a withdrawn template: an Offer in the markup is a statement
    // that it can be bought, and /api/checkout will refuse it.
    ...(withdrawn ? {} : { offers: productOffer({ price: w.price, path: `/workflows/${w.route}` }) }),
    ...(gallery.length > 0 ? { image: gallery.map((g) => g.src) } : {}),
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
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Templates", href: "/workflows" },
          ...(w.category
            ? [
                {
                  label: w.category,
                  href: `/workflows?category=${encodeURIComponent(w.category)}`,
                },
              ]
            : []),
          { label: w.title },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {w.free && <Badge tone="emerald">Free sample</Badge>}
        {w.difficulty && <Badge tone={difficultyTone(w.difficulty)}>{w.difficulty}</Badge>}
        {w.tier && !w.free && <Badge tone={tierTone(w.tier)}>{w.tier}</Badge>}
        {w.category && <Badge tone="violet">{w.category}</Badge>}
        {w.trigger && <Badge>{w.trigger} trigger</Badge>}
        {preview && <Badge tone="sky">{preview.nodeCount} nodes</Badge>}
      </div>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{w.title}</h1>
      {w.subtitle && <p className="mt-2.5 text-lg leading-relaxed text-muted">{w.subtitle}</p>}

      {gallery.length > 0 && (
        // object-contain in a letterbox, never object-cover: these are
        // text-heavy canvas and doc-card screenshots whose aspect ranges from
        // ultra-wide to portrait, and cropping them to a 16:9 box cut the
        // content off - which defeats the point of showing them at all.
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((g, i) => (
            <div key={g.slot} className="card overflow-hidden">
              <div className="flex h-72 items-center justify-center bg-surface-1">
                <Image
                  src={g.src}
                  alt={`${w.title} — ${g.label}`}
                  width={960}
                  height={540}
                  className="max-h-full w-auto max-w-full object-contain"
                  unoptimized
                  priority={i === 0}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0">
          {w.longDescription && (
            <p className="whitespace-pre-line leading-relaxed text-body">{w.longDescription}</p>
          )}

          {w.benefits.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-ink">Key benefits</h2>
              <ul className="mt-3 space-y-2">
                {w.benefits.map((b, i) => (
                  <li key={i} className="flex gap-2 text-body">
                    <span className="mt-1 text-emerald-400">&#10003;</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {w.useCases.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-ink">Use cases</h2>
              <ul className="mt-3 space-y-2">
                {w.useCases.map((b, i) => (
                  <li key={i} className="flex gap-2 text-body">
                    <span className="mt-1 text-violet-400">&rarr;</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {w.platforms.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-ink">Integrations</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {w.platforms.map((p) => (
                  <span key={p} className="chip px-2 py-1 text-xs">{p}</span>
                ))}
                {w.aiProviders.map((p) => (
                  <span key={p} className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-xs text-violet-300">{p}</span>
                ))}
              </div>
            </div>
          )}

          {graph && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-ink">
                Workflow preview{" "}
                <span className="text-sm font-normal text-faint">({graph.nodes.length} nodes)</span>
              </h2>
              <p className="mt-1 text-sm text-faint">
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
              <h2 className="text-lg font-semibold text-ink">
                What&apos;s inside <span className="text-sm font-normal text-faint">({preview.nodeCount} nodes)</span>
              </h2>
              <p className="mt-1 text-sm text-faint">
                A look at the node types this workflow uses. No purchase required &mdash; full parameters and
                credentials are yours after you buy.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {preview.nodeTypes.map((t) => (
                  <span key={t} className="chip px-2 py-1 text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}

          {preview && preview.agentTools.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-ink">
                Agent tools included{" "}
                <span className="text-sm font-normal text-faint">({preview.agentTools.length})</span>
              </h2>
              <p className="mt-1 text-sm text-faint">
                An AI Agent is only as capable as the tools wired into it. These are read from the
                template&apos;s own graph &mdash; every one is a real node in the file you download.
              </p>
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {preview.agentTools.map((t) => (
                  <li key={t.name} className="flex items-start gap-2 text-sm text-ink">
                    <span aria-hidden className="mt-0.5 text-violet-300">&#10003;</span>
                    <span>
                      {t.name}
                      <span className="text-faint"> &middot; {t.label}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-faint">
                {preview.agentMemory
                  ? "Conversation memory is attached, so the agent carries earlier turns of a session."
                  : "This agent runs without conversation memory - each run starts from the incoming request."}
              </p>
            </div>
          )}

          {/* The three-step block that used to sit here said n8n "highlights
              exactly which ones need them". It does not: an unbound resource
              locator renders as a filled-in dropdown showing a placeholder
              label, which is why 9,264 templates can look configured and not
              be. The generated checklist replaces it with what this specific
              file actually needs. */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-ink">From download to running</h2>
            <ol className="mt-3 space-y-3">
              {[
                ["Import", "In n8n, open Workflows → menu → “Import from File” and pick the workflow JSON from the download."],
                ["Set up", "Work through the setup checklist below - credentials first, then the values the file leaves for you to pick. The same list ships as SETUP.md beside the JSON."],
                ["Test, then activate", "Run it once against real data with the pinned sample cleared, check it did what you expected, then toggle Active."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-sm font-semibold text-violet-300">
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-medium text-ink">{t}.</span>{" "}
                    <span className="text-sm text-muted">{d}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {setup && <SetupChecklistSection checklist={setup} />}

          {reviews.count > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-ink">
                Customer reviews{" "}
                <span className="text-sm font-normal text-faint">
                  {reviews.average} / 5 &middot; {reviews.count} verified{" "}
                  {reviews.count === 1 ? "buyer" : "buyers"}
                </span>
              </h2>
              <div className="mt-3 space-y-3">
                {reviews.reviews.map((r, i) => (
                  <div key={i} className="card rounded-xl p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span aria-label={`${r.rating} out of 5 stars`} className="text-amber-400">
                        {"★".repeat(r.rating)}
                        <span className="text-zinc-700">{"★".repeat(5 - r.rating)}</span>
                      </span>
                      <span className="text-sm text-body">{r.authorLabel}</span>
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300">
                        Verified buyer
                      </span>
                      {r.createdAt && (
                        <span className="text-xs text-faint">
                          {new Date(r.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      )}
                    </div>
                    {r.title && <div className="mt-2 text-sm font-medium text-ink">{r.title}</div>}
                    <p className="mt-1 text-sm leading-relaxed text-muted">{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card mt-8 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">What you&apos;ll learn</h2>
              <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                {learning.band} level
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">{learning.bandNote}</p>
            <ul className="mt-3 space-y-2">
              {learning.skills.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-body">
                  <span className="text-violet-400">&#8226;</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-hairline pt-3 text-sm text-muted">
              Every node carries its own documentation on the canvas, plus notes explaining why the
              architecture was built this way, a credential setup guide, troubleshooting, and three
              practice exercises. Sample data comes pinned to the trigger, so you can hit Execute and
              watch data flow before connecting a single account.
            </p>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Common questions</h2>
            <div className="mt-3 space-y-2">
              {productFaqs.map(([q, a]) => (
                <details key={q} className="card group rounded-xl px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-body marker:content-none group-open:text-white">
                    {q}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-faint transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <TrackView item={w.route} kind="workflow" price={w.price} />
          <div className="card-raised p-5">
            {withdrawn ? (
              <div id="withdrawn-notice">
                <h2 className="text-base font-semibold text-ink">Not for sale</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  This template has a known defect: {withdrawnNodeList} carries parameters
                  belonging to a different n8n node type, so it cannot be configured and would not
                  run. We have taken it off sale rather than sell it with a warning attached. It
                  will be repaired and listed again.
                </p>
                <p className="mt-3 text-sm text-muted">
                  <Link href="/workflows" className="text-violet-400 hover:text-violet-300">
                    Browse the {TEMPLATE_COUNT_LABEL} templates that are on sale
                  </Link>
                </p>
              </div>
            ) : (
              <>
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
              {shots?.capabilities && (
                // Point-of-purchase reassurance next to the buy button. Contained
                // rather than cover-cropped: this slot holds a single sticky note
                // whose text is the whole point of showing it.
                <div className="mt-4 overflow-hidden rounded-xl border border-hairline bg-surface-1">
                  <Image
                    src={shots.capabilities}
                    alt={`${w.title} — ${SHOWCASE_SLOT_LABELS.capabilities}`}
                    width={640}
                    height={360}
                    className="h-auto w-full object-contain"
                    unoptimized
                  />
                </div>
              )}
            </div>
            <ul className="mt-5 space-y-2 text-sm text-muted">
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Instant download after payment</li>
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Workflow JSON plus a generated SETUP.md</li>
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Original template, yours to use &amp; adapt</li>
              <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Secure, time-limited download link</li>
            </ul>
            {!w.free && !withdrawn && (
              <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-body">
                <span className="font-semibold text-emerald-300">7-day guarantee.</span>{" "}If it won&apos;t
                import or isn&apos;t as described, we fix it or refund you.{" "}
                <Link href="/refund" className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
                  Refund policy
                </Link>
              </div>
            )}
              </>
            )}
          </div>

          {upsell && !withdrawn && (
            <Link href={`/bundles/${upsell.slug}`} className="card-hover block rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-5 hover:border-violet-500/60">
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-300">Save with a bundle</div>
              <div className="mt-1 text-sm text-body">
                Get all <b className="text-ink">{upsell.count}</b>{" "}
                {upsell.type === "subcategory" ? upsell.subcategory : upsell.category} templates for{" "}
                <b className="text-ink">{inr(upsell.price)}</b>
              </div>
              <div className="mt-2 text-sm font-medium text-violet-400">View bundle &rarr;</div>
            </Link>
          )}

          <Link href="/custom" className="card card-hover block p-5">
            <h3 className="text-sm font-semibold text-body">Need a variation of this?</h3>
            <p className="mt-1 text-sm text-muted">
              Different apps, extra steps, your exact process - we build custom workflows to order.
            </p>
            <span className="mt-2 inline-block text-sm font-medium text-violet-400">
              Get a fixed quote &rarr;
            </span>
          </Link>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-body">At a glance</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Industry" v={w.industry} />
              <Row k="Category" v={w.category} />
              <Row k="Subcategory" v={w.subcategory} />
              <Row k="Setup" v={w.setup} />
            </dl>
          </div>
        </aside>
      </div>

      {rel.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-semibold text-ink">Related templates</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rel.map((r) => (
              <WorkflowCard key={r.id} w={r} />
            ))}
          </div>
        </div>
      )}

      <RecentlyViewedStrip excludeRoute={w.route} />

      <div className="card mt-12 rounded-xl p-4 text-xs text-faint">
        Original n8n workflow template created and owned by WorkflowCrate. After purchase you receive the
        workflow JSON, its generated setup checklist, and a license to use and adapt it in your own projects.
      </div>

      {!withdrawn && (
        <StickyBuyBar
          item={{ kind: "workflow", key: w.route, name: w.title, price: w.price, free: w.free }}
          mrp={w.mrp}
          requireLogin={requireLoginToBuy()}
        />
      )}
    </div>
  );
}
