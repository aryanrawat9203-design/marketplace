# Workflow Template Redesign Plan (Step 1)

_Analysis date: 2026-07-08. Corpus: `product-files/workflows`, 10,501 files, 25 categories, 100 subcategories, 393 (category/subcategory/difficulty) sibling groups._

## 1. What the analysis found

The user-reported problem ("templates differ by only 1–3 nodes") is confirmed and is actually worse at full scale:

| Metric | Current value |
|---|---|
| Workflows | 10,501 |
| Unique structural signatures (node-type multiset) | **3,064** |
| Workflows sharing their exact structure with ≥1 other file | **9,186 (87.5%)** |
| Largest identical-structure cluster | **70 files** (spanning multiple categories) |
| True architecture families after normalizing provider/channel swaps (Groq↔OpenAI, Slack↔Discord, Postgres↔Notion…) | **212** |
| Share of catalog covered by the top 57 families | **80%** |
| Distinct n8n node types used across all 10,501 files | **49** (n8n ships 400+) |
| Node-count values | Only 20 distinct values; spikes at exactly 15 (2,317 files), 20 (2,927), 31 (812) |

### Root cause

Every file was generated from one universal skeleton with bolt-on blocks:

```
Trigger → Validate (set) → Input Valid? (if) → Log Invalid Input (noOp)
       → [1–2 work nodes] → [decision if] → two noOp leaf branches
       → Handle Error (set) → Alert on Failure (slack) → Success Notification (slack)
```

- Same node names everywhere ("Validate Input", "Input Valid?", "Handle Error", "Alert on Failure", "Success Notification") — even across unrelated categories.
- "Variation" = swapping which LLM/notification/storage node fills a slot, plus renaming an IF label. Example: WF09179 (E-commerce/Order Ops) vs WF09528 (Notifications/Escalations) differ by **zero** node types — only the IF label ("High-Value Order?" vs "Breaches Threshold?").
- Action branches are `noOp` placeholders — e.g. a branch named "Priority Fulfillment" literally does nothing. Buyers get dead ends where real logic should be.
- Graph topology is 100% determined by the node multiset (3,064 = 3,064): identical wiring everywhere.

### Tier bands (must be preserved)

`bandFor()` in `src/lib/bundles.ts`: Foundation = Starter/Free tier (4–8 nodes today), Core = Professional ≤14 nodes, Advanced = Professional ≥15, Production = Premium (17–21), Architect = Enterprise (28–32). Catalog: 497 Foundation / 1,418 Core / 2,479 Advanced / 4,795 Production / 1,312 Architect.

**Hard constraint:** Core files must stay ≤14 nodes or they flip bands. All other bands are tier-driven, so node counts can grow freely.

## 2. Redesign approach

Hand-editing 10,501 files is impossible; the fix is a **blueprint-library generator** (Python, run locally, output committed) that rebuilds every file from a genuinely diverse architecture library while keeping each file's catalog identity (title, platforms, AI provider, trigger, category, tier) truthful.

### 2.1 Architecture spine library (~40 spines)

Drawn from the N8N knowledge base (Section 8 patterns + Sections 9/10 rules), each with fundamentally different execution paths — not slot-swaps:

- **AI:** RAG query (vector store tool + embeddings + reranker), RAG ingestion (loader → splitter → embeddings → store insert), classify-then-route (textClassifier/sentiment → switch → per-class chains), information-extractor pipeline, multi-agent orchestrator (agent + toolWorkflow specialists), memory-persistent chat (Redis/Postgres memory), HITL approval agent (Wait-resume + approval channel), summarization map-reduce, structured-output agent (output parser + auto-fix).
- **Data:** incremental ETL with watermark cursor, staging + validation + quarantine ETL, compareDatasets two-way sync, dedupe/merge enrichment waterfall, paginated API harvester (splitInBatches loop + IF exit), batch + Wait rate-limited writer, aggregate/summarize reporting digest, backup/export (convertToFile → S3/Drive), migration with reconciliation counts.
- **Ops/event:** webhook API service (verify signature → process → respondToWebhook), monitoring probe with alert-dedup state, threshold escalation ladders, scheduled health scan across endpoints, error-handler with dead-letter store, stopAndError fail-fast validation.
- **Files/content:** extractFromFile → transform → publish, editImage/media pipelines, RSS → summarize → post, markdown/html conversion chains, crypto-signature verification flows.

Each spine has **band-scaled depth** (Foundation = minimal linear version … Architect = sub-workflow decomposition, idempotency keys, audit logging, reconciliation) and **category palettes** (Trading uses HTTP price APIs + thresholds; HR uses forms + docs + calendar; SEO uses HTTP + HTML extract + Sheets; etc.).

### 2.2 Node palette expansion: 49 → ~140 verified node types

Only exact type IDs + typeVersions from the knowledge base (no invented nodes): splitInBatches, splitOut, aggregate, summarize, sort, limit, removeDuplicates, compareDatasets, dateTime, crypto, compression, xml, markdown, html, rssFeedRead, graphql, extractFromFile, convertToFile, respondToWebhook, stopAndError, executeWorkflow, emailReadImap, many app triggers (slackTrigger, githubTrigger, stripeTrigger, telegramTrigger, gmailTrigger, googleSheetsTrigger…), app nodes (github, jira, stripe, shopify, zendesk, intercom, mailchimp, sendgrid, googleCalendar, googleDocs, googleBigQuery, awsS3, awsSes, mongoDb, redis, elasticsearch…), and the full LangChain cluster (chainRetrievalQa, textClassifier, sentimentAnalysis, informationExtractor, outputParserStructured, memoryRedisChat, memoryPostgresChat, toolVectorStore, toolWorkflow, toolCode, toolCalculator, toolThink, vectorStorePinecone/Qdrant/Supabase/PGVector/InMemory, embeddings*, textSplitter*, documentDefaultDataLoader, reranker).

### 2.3 Per-file instantiation rules

- Deterministic seed = workflow ID → reproducible builds.
- Honor catalog metadata: declared platforms become real nodes, declared trigger type is used, declared AI provider fills the model slot. Catalog copy stays truthful.
- **No noOp placeholder actions** — every branch ends in a real node. noOp allowed only as an explicit merge anchor (rare).
- Real, plausible parameters per KB Section 7 (expressions, `$json` mappings, retry settings on external nodes, batching options), unique per-file node names per KB naming conventions (verb + object).
- Clean canvas layout (positions feed the site's `WorkflowGraph` preview), with space reserved for Step 2 sticky notes.
- Node counts: **never below the current file's count**; Core capped at 14; other bands may grow (Advanced 15→up to 21, Production 17–21→up to 26, Architect 28–32→up to 38).
- **Within-subcategory rotation:** the generator refuses to emit two files in the same subcategory with the same structural signature; on collision it re-rolls optional stages/topology until unique.

### 2.4 Acceptance targets (re-run the analyzer to prove)

| Metric | Now | Target |
|---|---|---|
| Unique structural signatures | 3,064 (29%) | **≥9,000 (≥85%)** |
| Max identical cluster size | 70 | **≤3, never within one subcategory** |
| Normalized architecture families | 212 | **≥1,200** |
| Distinct node types used | 49 | **≥130** |
| noOp placeholder action branches | thousands | **0** |
| Node count decreases | — | **0 files** |

### 2.5 Verification & rollout

1. Generate → JSON-validate every file (parse, one trigger, unique names, connection integrity, whitelist types/typeVersions, band node-count rules).
2. Validate a stratified sample (~40 files, every band × major category) with the official n8n MCP `validate_workflow`.
3. Re-run the similarity analyzer; require all acceptance targets.
4. Sync `src/data/catalog.json` `totalNodes` (only field that stores node info; index has none). Platforms/trigger/AI provider remain accurate by construction.
5. Local dev-server spot-check of workflow detail pages + graph previews.
6. Commit in batches, verify Vercel deployment reaches READY.

### Execution phases (after approval)

- **Phase A:** generator core + spine library + validators; regenerate 3 pilot categories; run all checks.
- **Phase B:** extend palettes to all 25 categories; regenerate everything; full metric proof.
- **Phase C:** catalog sync, site spot-check, commit, deploy verification.
- **Step 2 (separate approval):** sticky-note documentation pass over the new files (overview note + per-node notes + branch/error/rate-limit notes).
