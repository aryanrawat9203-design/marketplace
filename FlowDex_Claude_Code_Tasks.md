# FlowDex — Implementation Task List for Claude Code

Repo: `C:\Apify_n8n_full_data\marketplace` (Next.js 16, App Router, React 19, TypeScript, Tailwind v4, Razorpay, Supabase, Resend, deployed on Vercel).

Rules for every task below:
- New/edited source files must be ASCII-only (rupee via `String.fromCharCode(0x20b9)`; JSX text uses entities: `&rarr; &mdash; &copy; &#8377;`).
- Never commit secrets. Add new env vars to both `.env.local` and Vercel (Production), and note them in this file's env list at the bottom.
- After each task: `npm run dev`, test locally, `git add . && git commit -m "..."`, `git push` (Vercel auto-deploys), then verify on the live URL.
- Existing helpers to reuse, don't duplicate: `lib/commerce.ts` (purchasable + HMAC signed-download tokens), `lib/pricing.ts`, `lib/bundles.ts`, `lib/zip.ts`, `src/lib/auth-server.ts` (Supabase session check), `src/components/AuthProvider.tsx` / `LoginModal`, `BuyButton.tsx`.

Work top to bottom. Each numbered item is one task/prompt.

---

## Phase 1 — Reliability & trust (do first)

1. Install `resend`. Create `src/lib/email.ts` exporting `sendOrderConfirmation({to, orderId, itemTitle, amountInPaise, downloadUrl})` using `process.env.RESEND_API_KEY` and `process.env.ORDERS_FROM_EMAIL`. HTML receipt: order id, item title, amount (rupee via `String.fromCharCode(0x20b9)`), a styled download button, plain-text fallback link, support note. Call it from the existing Razorpay verify route immediately after a payment verifies. Wrap in try/catch so a failed email never blocks the response.

2. Create `src/app/api/webhooks/razorpay/route.ts` (`export const runtime = 'nodejs'`). Read the raw body with `await req.text()` (do NOT parse JSON first). Verify HMAC-SHA256 of the raw body against `process.env.RAZORPAY_WEBHOOK_SECRET` using the `x-razorpay-signature` header with `crypto.timingSafeEqual`. Reject invalid signatures with 400. On `payment.captured`, read `payload.payment.entity` (id, order_id, amount, email, notes), rebuild the signed download URL from `notes` via the existing commerce/token helper, and call `sendOrderConfirmation`. Always return 200 for handled events (log failures, don't retry-storm Razorpay). Update the Razorpay checkout call to pass `notes: { itemTitle, kind, ref }` so the webhook can rebuild the correct download link.

3. In the download-token signer (`lib/commerce.ts`), add an optional `expiresIn` param. Keep the in-browser instant link at 30 minutes; sign the link used in the confirmation email with a 30-day expiry. Confirm `/download/[token]` accepts both.

4. Create `src/app/api/contact/route.ts`: accepts `{name, email, message}`, validates email+message present, sends via Resend to `process.env.SUPPORT_EMAIL` with `replyTo` set to the sender. Replace the current placeholder Contact page (which just prints "hello@flowdex.example ... replace this") with a real form (name, email, message, submit) that POSTs to this route and shows a success/error state. Also do a repo-wide find-and-replace of every `hello@flowdex.example` occurrence (footer, About, Terms, Privacy, Refund) with `process.env.SUPPORT_EMAIL` or a real address once Aryan supplies one.

5. Add security headers via `next.config.ts` `headers()` (or middleware): `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a `Content-Security-Policy` (nonce-based, `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, allow Razorpay's checkout script/frame domains explicitly). Add basic in-memory or edge rate limiting (e.g. a small token-bucket keyed by IP) on `/api/checkout`, `/api/verify`, `/api/contact`, and `/api/webhooks/razorpay`.

6. Custom domain cutover (once Aryan owns the domain): update `NEXT_PUBLIC_SITE_URL` (local + Vercel, then redeploy), update the Razorpay webhook URL in the Razorpay dashboard, verify the domain in Resend and switch `ORDERS_FROM_EMAIL` to `orders@<domain>`.

## Phase 2 — Accounts & recoverability

7. Supabase SQL (run in Supabase SQL Editor, not by Claude Code):
```sql
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  razorpay_order_id text,
  razorpay_payment_id text unique,
  email text not null,
  item_kind text,
  item_ref text,
  item_title text,
  amount_paise integer,
  status text default 'paid'
);
create index on public.orders (email);
alter table public.orders enable row level security;
```
Then: install `@supabase/supabase-js` if not already present, add a server-only Supabase client using `SUPABASE_SERVICE_ROLE_KEY`, and in the webhook handler (task 2) upsert a row into `orders` on `razorpay_payment_id` conflict-do-nothing so retries never duplicate.

8. Create `/orders/lookup`: a form for email + Razorpay order id. Server route queries `orders` for a match; on hit, generate a fresh 30-day signed download link and either display it or email it via Resend. Add basic rate limiting on this route (it's a guessable-ID surface).

9. Revisit the mandatory-login-before-checkout requirement: once there's real traffic, compare conversion with login required vs a guest-checkout variant (behind a simple env flag or feature toggle) to see whether the current forced-login setup is costing sales. Not a code change now — just wire an env flag (`REQUIRE_LOGIN_TO_BUY=true|false`) around the existing `BuyButton.tsx` gate so this is a one-line toggle for later A/B testing rather than a hardcoded requirement.

## Phase 3 — Trust, conversion, content

10. Add a persistent header: logo + nav links (All templates, Bundles & pricing, Most popular) + a search input. Search should hit a route that filters the existing catalog data (`src/data/catalog.json`/`catalog-index.json`) by title/keywords/integration — no new DB needed. Make it responsive: a hamburger/menu on mobile that exposes the same links. Keep it on every page via the root layout.

11. On `/workflows`, surface visible filter controls for difficulty, tier, and integration (the data/URL params already support category and sort — extend the same pattern), plus a page-jump control instead of "Next"-only pagination across 438 pages.

12. On each product page, add a preview block: parse the workflow's JSON (already shipped per purchase) to render the trigger type, a node-count badge, and a list of node types as labelled chips — no purchase required to see this, only the JSON's structure, not its full parameter values. Add a "Free sample" badge and link to 2-3 genuinely free templates prominently on the homepage and `/workflows`.

13. Add a trust strip under every Buy button (product and bundle pages): "Secure checkout &middot; Payments by Razorpay &middot; Instant download &middot; 7-day refund policy" with the refund text linking to `/refund`. ASCII-safe entities only.

14. Add Open Graph + Twitter metadata: a real `/public/og.png` (1200x630, branded), `twitter:card` set to `summary_large_image`, `og:image` using `NEXT_PUBLIC_SITE_URL`, plus `/app/icon.png` and `favicon.ico`. (Design assets can be requested separately if Aryan wants them generated.)

15. Add JSON-LD structured data: `Product` + `Offer` (name, description, price in INR, priceCurrency INR, availability, url) on every product page; `BreadcrumbList` on category/product pages; `FAQPage` on `/faq`. Once real reviews exist (see task 17), add `aggregateRating`/`review` — never fabricate these fields.

16. Replace the placeholder "F" logo and finalize the brand name sitewide (header, footer, metadata, legal pages) once Aryan locks the final name — single find-and-replace pass plus swapping `/public/logo.svg`.

17. Add a post-purchase review-request email (send N days after a real order, via a scheduled job or the confirmation email itself with a review link) and a mechanism to display genuine reviews once they start coming in. Never seed fake reviews, ratings, or sale counters.

18. Add `@vercel/analytics/react` to the root layout. Optionally add a GA4 measurement tag behind an env var.

19. On the free-template download flow, add an optional (skippable) email capture step that stores the email in a Supabase `leads` table or a Resend Audience. Do not block the download if skipped.

20. Accessibility pass: add/verify alt text on all badge/icon/logo images, confirm visible focus-ring styles on the pager, filters, and nav (don't rely on browser defaults being removed by Tailwind resets), and check contrast ratios on the tier/discount pill background+text color combos against WCAG AA (4.5:1 for normal text).

21. Add a couple of SEO content pages (a lightweight `/blog` or `/guides` section, e.g. "best n8n workflows for lead generation," "how to import an n8n template") using the catalog data already on hand — even 3-5 solid pages compound over time.

## Phase 4 — Scale/later

22. Before the full-library ZIP sells at meaningful volume, move `product-files/workflows/**` to Supabase Storage and serve signed URLs instead of bundling the ZIP from the Vercel filesystem at request time.

23. Add a lightweight `/status` page (even a static "all systems operational" plus last-deploy timestamp) for an extra trust signal, matching direct-competitor practice.

24. Add coupon codes and a simple abandoned-download/email nudge flow once the leads table (task 19) and orders table (task 7) both have real data to work with.

---

## Env vars this task list introduces (add to `.env.local` + Vercel Production, redeploy after each)

| Variable | Used in task |
|---|---|
| `RESEND_API_KEY` | 1 |
| `ORDERS_FROM_EMAIL` | 1 |
| `SUPPORT_EMAIL` | 4 |
| `RAZORPAY_WEBHOOK_SECRET` | 2 |
| `SUPABASE_SERVICE_ROLE_KEY` (server only) | 7 |
| `REQUIRE_LOGIN_TO_BUY` | 9 |

(`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `DOWNLOAD_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` already set per prior work.)
