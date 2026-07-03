# WorkflowCrate — Competitor Research, Gap Analysis & Implementation Plan

Date: 2 July 2026. Research performed with live web analysis (search + page fetches +
rendered-browser fetch via Apify for JS-heavy sites).

---

## 1. Competitor discovery results

### Direct competitors (sell or distribute n8n/automation workflow templates)

| # | Competitor | Model | Scale |
|---|------------|-------|-------|
| 1 | **n8n.io/workflows** (official library) | Free templates, creator/affiliate program | 10,388+ templates |
| 2 | **n8nmarkets.com** | Paid marketplace + hire-an-expert | 850+ templates, "8,000+ professionals" |
| 3 | **automationworkflows.io** | Multi-platform buy/sell marketplace (Make, n8n, Zapier, AI agents), 15% commission | Growing catalog, $5–$2,999 range |
| 4 | **haveworkflow.com** | Buy + sell + custom-build requests (Zapier/Make/n8n) | Small catalog (Estonian company) |
| 5 | **n8nmarket.com** | Paid n8n template store | Unknown (JS-only site) |
| 6 | **Creative Tim — n8n Workflow Templates Collection** | Subscription "Access Pass" ($29–89/mo), 200+ templates | Large audience (2.79M developers claimed) |
| 7 | **Etsy / Gumroad sellers** | Cheap mega-bundles (e.g. "n8n no-code bundle, instant download") | Long tail, review-driven |
| 8 | **agents.sabrina.dev** | Free AI agents/automations (lead-gen for services) | Free |

### Indirect / best-in-class references (template commerce UX leaders)

| # | Site | Why studied |
|---|------|-------------|
| 9 | **Notion Marketplace** (notion.com/templates) | Best-in-class category UX, creator profiles, collections, curation |
| 10 | **Zapier & Make template libraries** | "What's in your stack" app-pairing discovery |
| 11 | **Creative Market / UI8 / ThemeForest** | Digital-asset commerce patterns (licensing tiers, previews, reviews) |

Confidence: high that no significant direct competitor is missing — searches across
"buy n8n templates", "n8n template store", "sell automation workflows", and community
threads (community.n8n.io "Where can I sell my n8n workflow") repeatedly surfaced the
same set.

---

## 2. Individual competitor analysis (summary of findings)

### n8n.io official template library — the elephant
- **Discovery:** "What's in your stack?" — pick your integrations (Google Sheets, OpenAI,
  Telegram…) and see matching workflows. Category browsing (AI, Sales, IT Ops, Marketing,
  Document Ops, Support). 10,388 template count shown as scale proof.
- **Template page:** creator attribution + avatar, "last updated X ago", n8n version
  requirement, linked integrations, categories, testimonials, social share, **interactive
  read-only workflow canvas preview**, one-click "Use workflow" into n8n cloud.
- **Trust:** verified-creator profiles with template counts; 9 testimonials; GitHub stars.
- **Weaknesses (our opportunity):** everything free but generic — no curation for business
  outcomes, no bundles, no instant-money-back guarantee, requires n8n signup to use.

### n8nmarkets.com
- Buy/sell/hire model; headline social proof ("Save 100+ hours", "Trusted by 8,000+
  professionals"). Expert-hire vertical is its differentiator. Fully client-rendered site
  (bad SEO — renders nothing without JS; a real weakness).

### automationworkflows.io — strongest commerce UX among direct rivals
- **Cards:** thumbnail, platform tag, price with strikethrough anchor, 1–2 line description,
  seller + star rating "5.0 (2)", New/SALE badges, Add to Cart.
- **Filters:** Free | Premium | On Sale, platform type, newest/top-rated sorting.
- **Trust:** vetted sellers, Stripe payments, refund policy in footer, affiliate program.
- **Growth:** newsletter signup ("Get free automation tips & templates").
- **Weaknesses:** no search bar(!), thin review volume, generic thumbnails, no workflow preview.

### haveworkflow.com
- Buy + sell + "commission a custom workflow" (interesting third revenue stream).
- Cards show category tags, cover images, platform logos. Almost no trust signals, vague
  pricing. Weak overall — mostly a cautionary example.

### Creative Tim n8n collection
- Subscription-only (no single purchase — friction for one-off buyers), 14-day
  no-questions refund, corporate logos, license tiers (Freelancer→Enterprise), category
  count breakdown ("50+ AI, 40+ social media…"). No reviews on the product itself.

### Etsy/Gumroad sellers
- Win on: review counts, bestseller badges, dirt-cheap bundle anchoring. Lose on: no
  preview, no updates, no support, no SEO of their own.

### Notion Marketplace (pattern source)
- Hierarchical categories + audience segmentation, creator profiles everywhere,
  **thematic collections**, editorial curation before algorithmic lists, free-tier
  visibility, "Become a creator" supply loop, volume stats per category as social proof.

---

## 3. Feature comparison matrix (best implementation per feature)

| Feature | Best implementation | Where |
|---|---|---|
| Workflow visual preview | Read-only canvas of the real node graph | n8n.io (only one that has it) |
| Integration-based discovery | "What's in your stack" picker / integration pages | n8n.io, Zapier |
| Search | Keyword + autosuggest dropdown | Notion (none of the direct rivals do this well) |
| Product cards | Price anchor + badges + platform tags + rating | automationworkflows.io |
| Bundles/pricing ladder | Single → subcategory → category → full library → lifetime | **WorkflowCrate already best-in-class here** |
| Guarantee | 14-day no-questions refund, stated at point of sale | Creative Tim |
| Newsletter capture | Persistent site-wide signup with free-template hook | automationworkflows.io |
| Trust near buy button | Secure checkout + refund + instant delivery strip | WorkflowCrate (has it) + reinforce |
| Import instructions | Step-by-step "how to use" on product page | n8n.io docs pattern |
| SEO | Server-rendered pages, product schema, category/integration landing pages | WorkflowCrate + n8n.io |
| Social proof | Real ratings/testimonials only; category volume stats | Notion volume stats (honest option) |
| Recently viewed / continue browsing | Standard e-commerce pattern | Amazon-class stores (none of the rivals) |
| Cart / multi-item checkout | Add to cart, combined order | automationworkflows.io |

---

## 4. WorkflowCrate audit (what exists today)

**Strong:** full server rendering (SEO advantage over n8nmarkets/n8nmarket), 10,501-item
catalog with taxonomy filters + sort + pagination, bundle pricing ladder with honest
"individually worth" math, free lead-magnet samples with optional email capture, Product +
Breadcrumb + FAQ JSON-LD, OG/Twitter images, sitemap + robots, order lookup + email
receipts + webhook, Supabase auth, trust strip, node-type "What's inside" preview,
related templates, bundle upsell on product page, guides section, accessibility pass done.

**Weak / missing (validated against competitor set):**
1. No visual preview of the actual workflow graph (text-only node list).
2. Search is substring-only; no ranking, no multi-word support, no autosuggest.
3. No integration-based discovery (the #1 discovery pattern at n8n.io/Zapier) and no
   integration landing pages for SEO.
4. No import how-to or product-level FAQ on the product page (buyer uncertainty at the
   decision point).
5. No newsletter capture outside the free-download flow.
6. No recently-viewed continuity.
7. Mobile: buy box scrolls away on product pages (no sticky buy bar).
8. No guarantee messaging beyond one footer-size line (competitors state it loudly).
9. No cart — single-item checkout only.
10. INR-only pricing display (fine for the Indian market focus; revisit if international
    traffic grows).
11. /guides missing from sitemap.
12. No reviews/ratings — correctly deferred until real ones exist (honesty constraint).

---

## 5. Gap analysis & prioritized roadmap

| P | Gap | Why it matters | Chosen implementation | Impact |
|---|-----|----------------|----------------------|--------|
| 1 | Workflow graph preview | #1 trust/proof element before paying; only n8n.io has it, no *paid* rival does | Server-rendered SVG from the real JSON (names/types/positions/connections only — parameters stay private) | High — conversion + differentiation |
| 1 | Search ranking + autosuggest | Search is the main nav for a 10k catalog; rivals are weak here | Weighted multi-term ranking + `/api/suggest` typeahead dropdown | High — discovery/conversion |
| 1 | Integration discovery + landing pages | Proven discovery pattern; big SEO surface (top-integration pages) | Home section + `/integrations` + `/integrations/[slug]` pages, in sitemap | High — SEO/discovery |
| 2 | Product-page buyer reassurance | Reduce decision anxiety at point of sale | "How to import" steps + product FAQ w/ FAQPage JSON-LD + louder 7-day guarantee | Medium-high — conversion |
| 2 | Sticky mobile buy bar | Mobile conversion best practice | Client component, appears when buy box scrolls out | Medium |
| 2 | Newsletter capture | List-building = repeat sales for bundles | Site-wide footer band → existing `/api/leads` | Medium — retention |
| 2 | Recently viewed | Session continuity on a 10k catalog | localStorage strip on product + home | Medium |
| 3 | Cart / multi-item checkout | Rivals have it; increases order value | Deferred: touches checkout/verify/webhook/delivery integrity — needs its own careful pass | Medium — AOV |
| 3 | Reviews | Strongest social proof | Deferred until real post-purchase review collection (Resend follow-up email) exists; never fake | High later |
| 3 | USD price hint | International buyers | Deferred; needs FX strategy | Low-medium |

---

## 6. Implemented in this pass (see git diff)

1. **WorkflowGraph** — server-rendered SVG preview of the actual node graph on every
   product page (safe: node names/types/positions/connections only).
2. **Search upgrade** — weighted multi-term relevance ranking in `queryCatalog`;
   new `/api/suggest` endpoint; SearchBar now a debounced autosuggest combobox with
   keyboard navigation.
3. **Integration discovery** — "Browse by integration" home section, `/integrations`
   index, `/integrations/[slug]` SEO landing pages (metadata + breadcrumb JSON-LD +
   top templates + category links), added to sitemap; `/guides` also added to sitemap.
4. **Product page conversion pack** — "How to import into n8n" steps, product FAQ
   accordion with FAQPage JSON-LD, prominent 7-day guarantee block, sticky mobile buy bar.
5. **NewsletterSignup** — site-wide footer band wired to the existing leads API.
6. **Recently viewed** — localStorage-based strip on product pages and homepage.
7. **Why WorkflowCrate** — honest value-prop band on the homepage (no fake social proof).

## 7. Implemented in wave 2 (same day, second pass)

1. **Login-modal fix** — the every-page + every-4-minutes sign-in nag now fires once per
   visitor per 7 days (localStorage cooldown). Manual opens (Buy/Log in) unchanged.
2. **My library** — `/account` lists every paid order for the signed-in email with fresh
   one-hour download links (`/api/orders/mine`, Bearer-authenticated). Linked from the
   header and footer; guests are pointed to the order-lookup flow.
3. **Buyer-only reviews** — order-confirmation emails now carry a signed 90-day review
   link (`/review?token=…`); submissions land as `pending` and appear on product pages
   (with masked-email or chosen display name + "Verified buyer" badge) only after
   approval in Supabase. Product JSON-LD gains `aggregateRating` + `review` once real
   reviews exist. No fake social proof anywhere.
4. **Cart / multi-item checkout** — add-to-cart on product pages, header cart badge,
   `/cart` page with order summary and savings math. Checkout persists the cart
   server-side (`carts` table), prices every item server-side, creates one Razorpay
   order referencing the cart id, and delivers a single ZIP (bundles flatten to their
   member files). Verify/webhook/download/order-lookup all understand the new `cart`
   kind, so receipts, re-downloads and My library keep working.
5. **`SUPABASE_SETUP.sql`** — run once in the Supabase SQL Editor to create the
   `reviews` and `carts` tables (instructions + moderation queries inside).

### Action required to go live with wave 2
- Run `SUPABASE_SETUP.sql` in the Supabase SQL Editor (reviews + carts tables).
- Reviews are moderated: approve pending rows in the dashboard (`status = 'approved'`).

### Post-implementation adversarial review (fixes applied)
A multi-agent review of the full diff surfaced one **critical, pre-existing payment
vulnerability** which is now fixed: `/api/verify` trusted the client-supplied `kind`/`key`
and only checked that *some* Razorpay order was paid — so a ₹149 payment's signature could
be replayed with `key=full-library` (₹9,999) to mint a download token for anything.
`/api/verify` now fetches the order from Razorpay and reads what was bought from the
order's server-set `notes`; the client only proves the payment happened. Also fixed in the
same pass: signature comparison made timing-safe; checkout now records the signed-in
account email in order notes so My-library rows always match (Razorpay-modal email could
differ); search/suggest got query-size caps, per-query regex compilation, and rate
limiting; the account page can no longer flash one user's orders to the next; the review
form distinguishes server errors from validation errors; a stale cart line is auto-removed
instead of dead-ending checkout; the graph parser rejects non-finite node coordinates.

## 8. Implemented in wave 3: curated collections

Notion-style themed packs, shipped as `/collections` + 8 statically-generated
`/collections/[slug]` pages (AI Agency Starter Kit, Lead Gen Machine, Inbox Zero, Content
Engine, E-commerce Ops Pack, Knowledge Base & RAG, Support Command Center, Beginner
Essentials). Members are chosen live from the catalog by rules (categories/platforms/
difficulty, demand-sorted) with a diversity picker (per-subcategory caps + near-duplicate
title rejection), so lists never go stale and never look copy-pasted. Purchase is the
cart: one add-all button, one payment, one ZIP — no new SKUs or payment-path changes.
Single-category packs upsell their full category bundle. Homepage row, header/footer nav,
sitemap, ItemList JSON-LD.

## 9. Next iterations (recommended order)

1. Custom-workflow request funnel (haveworkflow's third revenue stream) via contact form preset.
2. USD display toggle for international traffic (check analytics geo split first).
3. Review-collection follow-up cadence (a second email ~7 days post-purchase).
4. Admin moderation page for reviews (replace dashboard SQL with a small UI).
