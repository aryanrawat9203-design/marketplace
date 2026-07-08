<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# WorkflowCrate — Project Guide

## Operating mode: default to full autonomy

Aryan's standing instruction: operate with as little manual work from him as possible. Concretely:

- Don't ask before fixing bugs, shipping SEO/growth work, verifying deploys, checking community threads, writing blog posts, or making judgment calls on implementation details. Just do it and report the outcome.
- Don't pause for a "does this look right?" check unless the action is genuinely irreversible or legally/financially binding. Default to shipping, not to asking.
- The only things that ever need Aryan directly are things I'm structurally incapable of doing myself: entering his password, completing an OAuth consent screen, approving a real money movement (payment/refund/payout), or agreeing to a third party's binding terms on his behalf. When one of these comes up, ask once, plainly, and he'll reply "ok" — don't build elaborate confirmation flows around it.
- Connector disconnects (see Razorpay below) are routine, not incidents — just note it and move on; no need to investigate why or apologize for it.

## What this is

WorkflowCrate (workflowcrate.com) is a marketplace selling 10,501+ original, ready-to-import n8n workflow templates. Single templates, category bundles, curated collections, and a full-library tier. Instant download after payment (Razorpay), plus a freemium AI support chatbot.

Formerly called "FlowDex" — renamed and re-domained 2026-07-02. Some older docs/code comments may still say FlowDex; that's expected, not a bug.

## Stack

- Next.js 16.2.9 (App Router, Turbopack bundler) — **this is newer than most training data knows.** Check `node_modules/next/dist/docs/` before assuming any API/convention.
- React 19.2.4
- TypeScript 5, Tailwind 4
- Supabase (Postgres + Auth: Google OAuth + magic link)
- Razorpay (payments, subscriptions, webhooks)
- Resend (transactional email)
- Anthropic + OpenAI SDKs (pluggable-provider AI support chatbot)
- Deployed on Vercel, auto-deploy from `main`

## Folder structure (src/)

- `app/` — route segments: `workflows/[route]`, `bundles/[slug]`, `collections/[slug]`, `integrations/[slug]`, `guides/[slug]`, `blog/[slug]`, `cart`, `checkout` flow under `orders`, `account`, `auth`, `admin`, `custom`, `faq`, `about`, `contact`, `privacy`, `terms`, `refund`
- `app/api/` — route handlers: `download`, `og` (dynamic OG image via `next/og`), `webhooks/razorpay`, chatbot endpoints
- `app/opengraph-image.tsx`, `app/twitter-image.tsx` — static default share-card images (file-convention, auto-served)
- `components/` — shared UI (WorkflowCard, BuyButton, TrustStrip, WorkflowGraph, StickyBuyBar, JsonLd, etc.)
- `lib/` — business logic: `catalog.ts` (10,501-item index + search/filter), `commerce.ts` (pricing, download, preview/graph data), `bundles.ts`, `collections.ts`, `integrations.ts`, `reviews.ts`, `seo.ts`, `site.ts`, `require-login.ts`
- `data/` — `catalog.json` (full detail records), `catalog-index.json` (lightweight search index), `taxonomy.json` (categories/industries/platforms)
- `product-files/` — the actual 10,501+ n8n workflow JSON files served on download

## Deployment workflow

- Push to `main` → Vercel auto-deploys to production. **No preview/staging environment currently.**
- **Never trust "commit succeeded" as "it shipped."** Always check deployment `state` via the Vercel MCP (`list_deployments` / `get_deployment` / `get_deployment_build_logs`) after any commit. A silent build failure once left the site on a stale build for 5 commits in a row before anyone noticed — this is not hypothetical, it happened.
- **Update 2026-07-08: a local build/test environment now works.** `node`, `npm`, and `node_modules/.bin/next` are all present and functional in the assistant's sandbox — `npx tsc --noEmit`, `npx eslint`, and `npm run build` all ran successfully end-to-end (the 10,501-route catalog doesn't statically prerender per-template pages, so `next build` finishes in well under a minute). Run these locally before pushing; still confirm the real Vercel deploy afterward, since that's the actual production compile/runtime target.

## Git / editing workflow

- Repo: `github.com/aryanrawat9203-design/marketplace`. **Update 2026-07-08: direct git network access now works from the assistant's sandbox** — `git ls-remote origin`, `git push origin main` succeed with the existing credential helper (`git config credential.helper` → `manager`), no browser needed. Verify with `git push --dry-run origin main` at the start of a session; if it succeeds, use plain `git add`/`commit`/`push` — it's far more reliable than the browser workaround below. Only fall back to the steps below if a push genuinely fails again.
- **Fallback if direct push is blocked again: whole-file upload via the browser.** Go to `github.com/<owner>/<repo>/upload/main/<subpath>/`, upload a same-named file to overwrite it in place, then commit. This avoids the CodeMirror line-editor entirely and is reliable.
  - After the file lands in the upload queue, take a fresh screenshot and click the commit-message box and "Commit changes" button by the coordinates in that screenshot — element refs from before the upload go stale and can silently click the wrong thing (this has actually happened: a click landed on "choose your files" instead of the commit box, so the "commit" appeared to succeed but nothing was actually saved).
  - Always verify afterward with a raw fetch (`raw.githubusercontent.com/.../main/<path>`) — don't trust the page redirect as proof the commit landed.
- **Avoid the inline web editor for JSX/TSX changes** (only relevant if you're on the browser fallback) — it has a recurring bug where typing `<tag>` pairs inserts duplicate stray closing fragments. Reserve it only for small single-line, non-JSX tweaks (plain TS/JSON/config) where a whole-file upload would be overkill; select-the-whole-line-and-retype is safer than a partial edit there.
- For new React-tree-heavy files written through the inline editor (rare, e.g. quick `next/og` tweaks), prefer `React.createElement(...)` over JSX — zero `<tag>` characters means the auto-close bug can't trigger.

## Environment / secrets

Configured in Vercel project settings (not visible to the assistant directly): Supabase URL/keys, Razorpay live keys + webhook secret, Resend API key, `OPENAI_API_KEY`, Anthropic key, Google OAuth credentials, Google Search Console verification tag.

## Connected services / MCP tools

- Vercel, Supabase, n8n Cloud, Canva — connected and stable.
- Razorpay — **disconnects periodically on its own** (its policies, not a Cowork/Claude-side issue). This is routine: if Razorpay tool calls fail with an auth/connection error, just prompt Aryan to reconnect via the one-click connector card and continue once he says "ok" — no deeper troubleshooting needed.
- GitHub has no MCP connector; repo access is via direct `git` from the sandbox (see Git / editing workflow above), browser + whole-file-upload only as fallback.

## Security posture (verified live 2026-07-07)

Security headers, CSP, rate-limiting, signed download tokens, and Supabase RLS are confirmed present and correct in the deployed code. If a stale audit note anywhere says otherwise, trust the code/live headers over the note.

## Recurring / ongoing tasks (do these without being asked)

- Daily-ish: check r/n8n, r/automation, community.n8n.io for genuine questions to answer (no forced links, no AI-flavored copy-paste content — this is an explicit standing rule).
- Weekly: new blog post, n8n Creator Hub template submission (portal caps one pending submission at a time — check status before submitting the next).
- After any metadata/SEO change: verify live via a cache-busted fetch, not just the editor preview.
- After any commit: verify Vercel deployment reaches `READY`, not just "commit succeeded."

## Growth strategy reference

The authoritative task list for growth/SEO work is `WorkflowCrate_Growth_Strategy.md` (G1–G7 items). As of 2026-07-07 all of G1–G7 are shipped and verified live. Re-read that file directly for the full spec if resuming or extending any G-item.

## Instructions for future sessions

- Read this file directly (it's the source of truth for project specifics) rather than relying on cross-session memory, which can go stale.
- Default posture: take initiative, ship, verify, report — don't ask permission for reversible technical decisions.
- When something breaks silently (build failures, stale caches, 503s, a disconnected connector), say so plainly and keep moving rather than treating it as a crisis or over-apologizing.
