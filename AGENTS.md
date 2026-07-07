<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# WorkflowCrate — Project Guide

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
- No local build/test environment against this exact repo is available to the AI assistant editing it. The Vercel build log is the real compile-check; read it, don't assume.

## Git / editing workflow

- Repo: `github.com/aryanrawat9203-design/marketplace`, edited by Claude via a connected browser session (no direct git/API network access from the assistant's sandbox — confirmed blocked at the proxy level).
- **Preferred edit method: whole-file upload.** Write the corrected file, then use GitHub's own "Add file → Upload files" web page to drag-and-drop a same-path replacement and commit. This avoids the CodeMirror line-editor entirely.
- **Avoid the inline web editor for JSX/TSX changes** — GitHub's browser editor has a recurring bug where typing `<tag>` pairs inserts duplicate stray closing fragments. If the inline editor must be used for a small non-JSX change (plain TS, JSON, config), select-the-whole-line-and-retype is safer than partial edits.
- For new React-tree-heavy files (e.g. `next/og` image routes), prefer `React.createElement(...)` over JSX syntax when writing through the inline editor — zero `<tag>` characters means the auto-close bug structurally cannot trigger.
- Always verify the committed result with a raw fetch (`raw.githubusercontent.com/.../main/<path>`) or cache-busted live fetch (`?cb=<n>`) — GitHub's rendered diff/preview and screenshots have both been unreliable for confirming exact byte content in the past. CDN/ISR can also serve a stale cached page on the very first fetch right after a deploy; a cache-bust query param forces a fresh read.

## Environment / secrets

Configured in Vercel project settings (not visible to the assistant directly): Supabase URL/keys, Razorpay live keys + webhook secret, Resend API key, `OPENAI_API_KEY`, Anthropic key, Google OAuth credentials, Google Search Console verification tag.

## Security posture (verified live 2026-07-07)

Security headers, CSP, rate-limiting, signed download tokens, and Supabase RLS are confirmed present and correct in the deployed code. If a stale audit note anywhere says otherwise, trust the code/live headers over the note.

## Recurring / ongoing tasks

- Daily-ish: check r/n8n, r/automation, community.n8n.io for genuine questions to answer (no forced links, no AI-flavored copy-paste content — this has been an explicit standing rule).
- Weekly: new blog post, n8n Creator Hub template submission (portal caps one pending submission at a time — check status before submitting the next).
- After any metadata/SEO change: verify live via a cache-busted fetch, not just the editor preview.
- After any commit: verify Vercel deployment reaches `READY`, not just "commit succeeded."

## Growth strategy reference

The authoritative task list for growth/SEO work is `WorkflowCrate_Growth_Strategy.md` (G1–G7 items). As of 2026-07-07 all of G1–G7 are shipped and verified live. Re-read that file directly for the full spec if resuming or extending any G-item.

## Instructions for future sessions

- This project's owner (Aryan) prefers minimal back-and-forth: default to taking initiative and shipping, only pausing for things that are genuinely irreversible, require his credentials/OAuth, or are explicitly public-facing publishes.
- Prefer fixing root causes over safe fallbacks once the fragile-editor risk is under control (see: OG image fix went from safe-fallback to full per-template implementation once risk was manageable).
- When something breaks silently (build failures, stale caches, 503s), say so plainly rather than assuming success from a green checkmark alone.
