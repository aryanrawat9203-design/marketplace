/**
 * FAQs for the integration and integration-pair pages.
 *
 * These exist for two reasons. Search Console reported zero rich results for
 * the whole site - the integration pages emitted a BreadcrumbList and nothing
 * else - and an FAQPage is the cheapest eligible markup we can add honestly.
 * Second, the questions themselves ("can n8n connect x to y", "do I need to
 * write code") are the long-tail phrasings the pair pages already get
 * impressions for but never answered on the page.
 *
 * Every answer is built from the templates actually behind the page - counts,
 * trigger mix, price range, real subcategory names - so no two pages carry the
 * same text. Google discounts boilerplate FAQ blocks repeated across a site,
 * and a generic answer would be the thin-content problem in a new place.
 *
 * The rendered copy and the JSON-LD are generated from this one source, which
 * is what keeps them identical - FAQ markup whose answer is not visible on the
 * page is a structured-data violation.
 */

import type { IndexItem } from "./catalog";
import type { Integration, IntegrationPair } from "./integrations";
import { getPairGuide } from "./pair-guides";
import { inr } from "./pricing";

export type Faq = { q: string; a: string };

const fmt = (n: number) => n.toLocaleString("en-IN");

/**
 * The platform name as it reads mid-sentence. Every display name is already
 * prose-safe except the HTTP one, which is a node in n8n rather than a product
 * and reads as a typo in "connect HTTP / REST API to Slack".
 */
function proseName(name: string): string {
  return name === "HTTP / REST API" ? "any REST API" : name;
}

/** The n8n node that actually implements a platform, for "which nodes" answers. */
function nodeName(name: string): string {
  if (name === "HTTP / REST API") return "HTTP Request";
  if (name === "n8n Form") return "n8n Form Trigger";
  return name;
}

/**
 * "a HubSpot node" / "an HTTP Request node". Driven by how the name is spoken
 * rather than spelt, so the initialisms that start with a consonant but read
 * as a vowel ("aitch-tee-tee-pee", "en-eight-en") get the right article.
 */
function withArticle(name: string): string {
  const spokenVowel = /^(HTTP|n8n|IMAP|SMTP|FTP|API)/.test(name) || /^[AEIOU]/.test(name);
  return `${spokenVowel ? "an" : "a"} ${name}`;
}

/** True for the HTTP pseudo-platform, which is an n8n node rather than a product. */
function isHttp(name: string): boolean {
  return name === "HTTP / REST API";
}

function countBy(items: IndexItem[], key: "subcategory" | "category" | "trigger"): [string, number][] {
  const counts = new Map<string, number>();
  for (const w of items) {
    const v = w[key];
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** "Newsletters, Task Automation and Research Assistant" */
function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Cheapest non-free price, so the answer states a real floor rather than 0. */
function priceFloor(items: IndexItem[]): number | undefined {
  const paid = items.filter((w) => !w.free).map((w) => w.price);
  return paid.length ? Math.min(...paid) : undefined;
}

/**
 * The trigger mix, phrased so the numbers are not claimed to be exhaustive.
 * The top three rarely sum to the total, and a sentence implying they do is a
 * factual error on a page whose whole job is to be trustworthy.
 */
function triggerSentence(items: IndexItem[]): string | undefined {
  const all = countBy(items, "trigger");
  if (!all.length) return undefined;
  const top = all.slice(0, 3);
  const named = list(top.map(([name, n]) => `${name.toLowerCase()} (${fmt(n)})`));
  const covered = top.reduce((sum, [, n]) => sum + n, 0);
  const rest = items.length - covered;
  return rest > 0 ? `${named}, with ${fmt(rest)} on other trigger types` : named;
}

/** Shared tail questions - the answers differ per page because the nouns and counts do. */
function commonFaqs(items: IndexItem[], subject: string): Faq[] {
  const faqs: Faq[] = [];

  const triggers = triggerSentence(items);
  if (triggers) {
    faqs.push({
      // Phrased without an article so it reads correctly for both "a
      // PostgreSQL + Slack workflow" and "an Airtable workflow".
      q: `What triggers these ${subject} workflows?`,
      a: `The most common trigger types here are ${triggers}. Scheduled workflows poll on an interval you set, webhook workflows fire the moment the source app calls n8n, and form workflows expose a hosted form that starts the run on submit. You can swap the trigger on any template after importing it - the rest of the workflow does not care what started it.`,
    });
  }

  const floor = priceFloor(items);
  const free = items.filter((w) => w.free).length;
  if (floor !== undefined) {
    faqs.push({
      q: `How much do the ${subject} templates cost?`,
      a: `Individual templates start at ${inr(floor)} and you download the JSON immediately after payment.${free ? ` ${free === 1 ? "One of these is" : `${fmt(free)} of these are`} free to download with no account.` : ""} If you need more than two or three, a category bundle works out cheaper per template, and the full-library tier covers every template on the site - these ${fmt(items.length)} included.`,
    });
  }

  faqs.push({
    q: `Do these templates work on n8n Cloud and self-hosted n8n?`,
    a: `Both. Each template is a plain n8n workflow JSON file, imported with Workflows → Import from File, so it runs anywhere n8n runs - n8n Cloud, Docker, or a npm install on your own server. Self-hosted instances need outbound network access to the APIs the workflow calls, which is the only difference worth planning for.`,
  });

  return faqs;
}

/** FAQs for a pair page, e.g. /integrations/postgresql-and-slack. */
export function pairFaqs(pair: IntegrationPair, items: IndexItem[]): Faq[] {
  const a = proseName(pair.a.name);
  const b = proseName(pair.b.name);
  const subject = `${pair.a.name} + ${pair.b.name}`;
  const guide = getPairGuide(pair.slug);

  const subcats = countBy(items, "subcategory")
    .slice(0, 4)
    .map(([name]) => name);

  const faqs: Faq[] = [
    {
      q: `Can n8n connect ${a} to ${b}?`,
      a: `Yes. n8n has ${withArticle(nodeName(pair.a.name))} node and ${withArticle(nodeName(pair.b.name))} node, so the connection is built in - no community package and no custom code. We have ${fmt(pair.count)} ready-to-import templates that already wire the two together${subcats.length ? `, covering ${list(subcats)}` : ""}. Import one, add your credentials for both apps, and it runs.`,
    },
    {
      q: `Which n8n nodes connect ${a} and ${b}?`,
      // Pair slugs are ordered alphabetically, not by direction, so a is not
      // necessarily the source - saying "the a node reads and the b node
      // delivers" was backwards on every pair whose flow runs b to a.
      a: guide
        ? `The usual shape is ${list(guide.nodes)}, in that order: the first node decides when the workflow runs and the last one receives the result.${
            // The HTTP pseudo-platform is a node, not a product, so "n8n ships
            // a first-party node for it" is true but says nothing useful.
            isHttp(pair.a.name) || isHttp(pair.b.name)
              ? ` The HTTP Request node covers whatever the dedicated node does not.`
              : ` n8n ships first-party nodes for both ${a} and ${b}, so nothing here needs a community package.`
          }`
        : `At minimum a trigger, ${withArticle(nodeName(pair.a.name))} node and ${withArticle(nodeName(pair.b.name))} node. Most of these ${fmt(pair.count)} templates add an IF or Set node in between to filter out the records you do not want to send and to reshape the fields into what the receiving app expects.`,
    },
    {
      q: `Do I need to write code to connect ${a} to ${b}?`,
      a: `No. Every template here is a finished workflow - the nodes, the connections and the field mappings are already built. Setup is importing the JSON and authenticating the two accounts. You only touch expressions if you want to change which fields get sent.`,
    },
    {
      q: `Can I send data from ${b} back to ${a}?`,
      a: `Yes - the connection is not one-directional. n8n's ${nodeName(pair.b.name)} node can trigger or read just as the ${nodeName(pair.a.name)} node can, so the same pair of credentials covers both directions. Templates on this page run both ways; the reverse direction is usually the same workflow with the trigger and the final node swapped.`,
    },
  ];

  return [...faqs, ...commonFaqs(items, subject)];
}

/** FAQs for a single-integration page, e.g. /integrations/airtable. */
export function integrationFaqs(integration: Integration, items: IndexItem[]): Faq[] {
  const name = proseName(integration.name);
  const node = nodeName(integration.name);

  const cats = countBy(items, "category")
    .slice(0, 4)
    .map(([c]) => c);

  const faqs: Faq[] = [
    {
      q: `Does n8n integrate with ${name}?`,
      a: `Yes - ${node} is a first-party n8n node, so you authenticate once and the operations are available as dropdowns rather than raw API calls. ${fmt(integration.count)} of our templates use it${cats.length ? `, across ${list(cats)}` : ""}.`,
    },
    {
      q: `What can I automate with ${name} in n8n?`,
      a: cats.length
        ? `The ${fmt(integration.count)} ${integration.name} templates here cluster into ${list(cats)}. In practice that means moving records in and out of ${name} on a schedule, reacting to changes the moment they happen, and syncing it against the other tools in your stack so the same data does not get maintained twice.`
        : `Reading and writing records on a schedule, reacting to changes as they happen, and keeping ${name} in sync with the other tools in your stack.`,
    },
    {
      q: `Do I need to write code to automate ${name}?`,
      a: `No. These are finished workflows, not starting points - nodes, connections and field mappings are already built. You import the JSON, connect your ${name} account, and run it.`,
    },
  ];

  return [...faqs, ...commonFaqs(items, integration.name)];
}

/** FAQPage markup. Callers must also render the same Q&A visibly on the page. */
export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
