import { bandFor, type SkillBand } from "./bundles";
import type { Caps } from "./node-facts";

/**
 * "What you'll learn" copy for a template's product page.
 *
 * Every bullet that names an n8n node carries a `needs` predicate over the
 * template's real capability facts, and is dropped when that node is not in
 * the graph. The pattern name only chooses which bullets are *candidates* —
 * it can never, on its own, put a claim on the page.
 *
 * This replaces a fixed 3-bullet block per architecture pattern, which
 * promised nodes the file did not contain on 3,026 of 6,870 probed claims
 * (44%) — "per-session conversation memory" on 85% of Chatbot Responder
 * templates that have no memory node, "strict schema extraction" on 100% of
 * Document Generation templates, and so on. Same defect class as the phantom
 * `platforms` bug fixed in July: copy generated from a label instead of from
 * the graph.
 */

type Bullet = {
  /** A function when the bullet names this template's own systems. */
  text: string | ((c: Caps) => string);
  /** Omitted only when the bullet names no node and is true of every template. */
  needs?: (c: Caps) => boolean;
};

/** "Slack and Google Sheets", "Slack, Notion and Gmail". */
function joinSystems(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

const agentic = (c: Caps) => c.hasAgent && c.hasTools;

// Candidate techniques per architecture pattern. Order is preference order.
const PATTERN_SKILLS: Record<string, Bullet[]> = {
  "AI Agent": [
    { text: "Wiring an AI Agent to a chat model, memory, and multiple tools", needs: (c) => c.hasAgent && c.hasChatModel && c.hasMemory && c.hasTools },
    { text: "Wiring an AI Agent to a chat model and a set of tools", needs: (c) => agentic(c) && c.hasChatModel },
    { text: "Writing a system message that controls when the agent reaches for each tool", needs: agentic },
    { text: "Giving a model a structured output parser so downstream nodes get clean fields", needs: (c) => c.hasOutputParser },
  ],
  "AI Summarize & Route": [
    { text: "Using a Chain for fixed AI steps instead of paying for an Agent", needs: (c) => c.hasChain && !c.hasAgent },
    { text: "Classifying text with a Text Classifier and acting on the label", needs: (c) => c.hasClassifier },
    { text: "Routing classified output into separate action branches", needs: (c) => c.hasSwitch || c.hasIf },
    { text: "Rejoining parallel branches with Merge so the run reports once", needs: (c) => c.hasMerge },
  ],
  "Chatbot Responder": [
    { text: "Handling a live chat trigger and keeping per-session conversation memory", needs: (c) => c.triggers.includes("Chat") && c.hasMemory },
    { text: "Handling a live chat trigger and shaping each reply before it is sent", needs: (c) => c.triggers.includes("Chat") },
    { text: "Grounding replies in retrieved context rather than model recall", needs: (c) => c.hasVectorStore },
    { text: "Escalating to a human when the bot cannot answer", needs: (c) => c.hasBranching },
  ],
  "RAG Pipeline": [
    { text: "Chunking documents with overlap and embedding them into a vector store", needs: (c) => c.hasVectorStore && c.hasTextSplitter },
    { text: "Embedding content and querying it back out of a vector store", needs: (c) => c.hasVectorStore && c.hasEmbeddings },
    { text: "Exposing a vector index to an agent as a semantic-search tool", needs: (c) => c.hasVectorStore && agentic(c) },
    { text: "Re-ranking retrieved passages before they reach the model", needs: (c) => c.hasReranker },
    { text: "Summarizing long source text with a summarization chain", needs: (c) => c.hasChain },
  ],
  "Data Enrichment": [
    { text: "Building a provider waterfall that only pays for a fallback on a real miss", needs: (c) => c.hasHttp && c.hasBranching },
    { text: "Scoring records after enrichment so the score sees the richest data", needs: (c) => c.hasCode },
    { text: "Upserting so repeat runs update rather than duplicate", needs: (c) => c.hasDedupe || c.hasCompare },
  ],
  "Two-System Sync": [
    { text: "Diffing two datasets into add / update / in-sync / backfill lanes", needs: (c) => c.hasCompare },
    { text: "Choosing a stable matching key for reconciliation", needs: (c) => c.hasCompare || c.hasDedupe },
    { text: "Making a sync safe to re-run without creating duplicates", needs: (c) => c.hasDedupe },
  ],
  "Webhook Pipeline": [
    { text: "Acknowledging fast, then doing the real work, to avoid delivery retries", needs: (c) => c.hasRespond },
    { text: "Routing event kinds with Switch and catching unknown types", needs: (c) => c.hasSwitch },
    { text: "Branching on the inbound payload before anything is written", needs: (c) => c.triggers.includes("Webhook") && c.hasBranching },
    { text: "Validating an inbound webhook payload before trusting it", needs: (c) => c.triggers.includes("Webhook") },
  ],
  "Scheduled Digest": [
    { text: "Collecting from multiple sources and blending them into one stream", needs: (c) => c.hasMerge },
    { text: "Rolling many rows up into a few reportable numbers", needs: (c) => c.hasSummarize || c.hasAggregate },
    { text: "Summarizing and formatting a readable digest", needs: (c) => c.hasAI || c.hasMarkdown },
    { text: "Archiving each run for an audit trail", needs: (c) => c.hasExecutionData },
  ],
  "Threshold Monitoring": [
    { text: "Grading severity into tiers instead of a single yes/no alert", needs: (c) => c.hasSwitch },
    { text: "Routing each tier to a channel matched to its urgency", needs: (c) => c.hasBranching && c.integrations.length >= 2 },
    { text: "Suppressing repeat alerts so one incident pages once", needs: (c) => c.hasDedupe },
  ],
  "Lead Capture & Routing": [
    { text: "Scoring inbound leads and routing them by heat", needs: (c) => c.hasCode && c.hasBranching },
    { text: "Assigning an accountable owner round-robin", needs: (c) => c.hasCode },
    { text: "Upserting into a CRM keyed on email", needs: (c) => c.integrations.includes("HubSpot") },
  ],
  "Approval Workflow": [
    { text: "Pausing a workflow on a Wait node until a human decides", needs: (c) => c.hasWait },
    { text: "Embedding a resume URL so approving is one click", needs: (c) => c.hasWait },
    { text: "Branching cleanly on approve versus decline", needs: (c) => c.hasBranching },
  ],
  "Form Intake": [
    { text: "Serving an n8n-hosted form and shaping each submission", needs: (c) => c.triggers.includes("Form") },
    { text: "Validating required fields before anything is written", needs: (c) => c.hasBranching },
    { text: "Sending incomplete submissions to review instead of storing them", needs: (c) => c.hasIf || c.hasFilter },
  ],
  "Drip Sequence": [
    { text: "Sequencing multi-day sends with durable Wait nodes", needs: (c) => c.hasWait },
    { text: "Checking for conversion before every step so the drip stops", needs: (c) => c.hasBranching },
    { text: "Segmenting the audience up front", needs: (c) => c.hasFilter || c.hasSwitch },
  ],
  "Content Generation": [
    { text: "Chaining a writer pass and a separate critic pass for better output", needs: (c) => c.hasChain || c.hasAgent },
    { text: "Converting markdown to HTML for delivery", needs: (c) => c.hasMarkdown },
    { text: "Publishing as a draft so a human stays the final gate", needs: (c) => c.hasBranching },
  ],
  "Document Generation": [
    { text: "Extracting structured fields from free text with a strict schema", needs: (c) => c.hasExtractor || c.hasOutputParser },
    { text: "Pulling text out of an uploaded file before parsing it", needs: (c) => c.hasExtractFromFile },
    { text: "Validating required fields before the write", needs: (c) => c.hasBranching },
    { text: "Upserting so reprocessing a document does not duplicate it", needs: (c) => c.hasDedupe },
  ],
  "File Processing": [
    { text: "Downloading and parsing CSV, XLSX, or PDF into JSON items", needs: (c) => c.hasExtractFromFile },
    { text: "Serializing processed items back out to a file", needs: (c) => c.hasConvertToFile },
    { text: "Quarantining malformed rows without failing the whole batch", needs: (c) => c.hasFilter || c.hasIf },
    { text: "Archiving the processed file", needs: (c) => c.integrations.includes("Google Drive") },
  ],
  "Web Scraping": [
    { text: "Extracting values from raw HTML with CSS selectors", needs: (c) => c.hasHtml },
    { text: "Fetching pages over HTTP and shaping the response into items", needs: (c) => c.hasHttp },
    { text: "Diffing against the previous snapshot so only real changes alert", needs: (c) => c.hasDedupe || c.hasCompare },
    { text: "Zipping parallel arrays into one item per record", needs: (c) => c.hasCode || c.hasSplitOut },
  ],
  "Event Notification": [
    { text: "Reacting to an event and notifying the right channel", needs: (c) => c.integrations.length >= 1 },
    { text: "Keeping alert volume low enough to stay meaningful", needs: (c) => c.hasDedupe || c.hasFilter },
  ],
  "Social Scheduler": [
    { text: "Reading a content calendar and publishing only what is due", needs: (c) => c.hasFilter || c.hasIf },
    { text: "Spacing posts with a batch loop and Wait to respect rate limits", needs: (c) => c.hasBatch && c.hasWait },
    { text: "Walking a list in batches instead of firing everything at once", needs: (c) => c.hasBatch },
    { text: "Marking rows published only after the post succeeds", needs: (c) => c.integrations.includes("Google Sheets") || c.integrations.includes("Airtable") },
  ],
  "Social Listening": [
    { text: "Polling a feed and deduplicating across executions", needs: (c) => c.hasDedupe },
    { text: "Pulling an RSS feed on a schedule and shaping each entry", needs: (c) => c.hasRss },
    { text: "Filtering to only what is worth surfacing", needs: (c) => c.hasFilter },
    { text: "Cross-posting to several channels in parallel", needs: (c) => c.integrations.length >= 2 },
  ],
  "Backup & Archive": [
    { text: "Exporting a dataset and serializing it to a file", needs: (c) => c.hasConvertToFile },
    { text: "Compressing before upload to cut transfer and storage", needs: (c) => c.hasCompression },
    { text: "Alarming on an empty backup instead of failing silently", needs: (c) => c.hasIf || c.hasStopAndError },
  ],
  "Order Fulfillment": [
    { text: "Reacting to order events and updating systems idempotently", needs: (c) => c.hasDedupe },
    { text: "Branching on order state", needs: (c) => c.hasSwitch || c.hasIf },
    { text: "Notifying customers and staff on the right channels", needs: (c) => c.integrations.length >= 2 },
  ],
  "Abandoned Cart Recovery": [
    { text: "Detecting inactivity with a durable Wait", needs: (c) => c.hasWait },
    { text: "Checking for conversion before each reminder", needs: (c) => c.hasBranching },
    { text: "Personalizing recovery messages from cart data", needs: (c) => c.hasCode },
  ],
  "Reminders & Follow-ups": [
    { text: "Scheduling time-based follow-ups that survive restarts", needs: (c) => c.hasWait },
    { text: "Computing due dates and windows from timestamps", needs: (c) => c.hasCode },
    { text: "Exiting the sequence when the task is already done", needs: (c) => c.hasBranching },
  ],
  "Onboarding Sequence": [
    { text: "Staging a multi-step onboarding with waits between steps", needs: (c) => c.hasWait },
    { text: "Tracking progress so steps are not repeated", needs: (c) => c.hasDedupe },
    { text: "Branching by segment", needs: (c) => c.hasSwitch || c.hasIf },
  ],
  "Meeting Scheduling": [
    { text: "Checking calendar availability before booking", needs: (c) => c.integrations.includes("Google Calendar") },
    { text: "Handling the slot-taken path with alternatives", needs: (c) => c.hasBranching },
    { text: "Sending confirmations and timed reminders", needs: (c) => c.integrations.length >= 1 },
  ],
  "Ticket Triage": [
    { text: "Classifying tickets with an LLM instead of keyword rules", needs: (c) => c.hasClassifier || c.hasChain || c.hasAgent },
    { text: "Routing each class to the right queue or owner", needs: (c) => c.hasSwitch || c.hasIf },
    { text: "Escalating negative sentiment quickly", needs: (c) => c.hasSentiment },
  ],
  "Recruitment Pipeline": [
    { text: "Parsing applications into structured candidate records", needs: (c) => c.hasExtractor || c.hasExtractFromFile },
    { text: "Scoring and routing by stage", needs: (c) => c.hasBranching },
    { text: "Keeping the applicant tracking system in sync", needs: (c) => c.integrations.length >= 1 },
  ],
  "Survey & Feedback": [
    { text: "Collecting responses and detecting sentiment", needs: (c) => c.hasSentiment },
    { text: "Routing detractors to a human fast", needs: (c) => c.hasBranching },
    { text: "Aggregating results into reportable numbers", needs: (c) => c.hasSummarize || c.hasAggregate },
  ],
  "Trading Alert": [
    { text: "Computing indicators from raw price series in a Code node", needs: (c) => c.hasCode },
    { text: "Grading signals into severity tiers", needs: (c) => c.hasSwitch || c.hasIf },
    { text: "Alerting without spamming on every tick", needs: (c) => c.hasDedupe || c.hasFilter },
  ],
  "SEO Audit": [
    { text: "Pulling page and ranking data on a schedule", needs: (c) => c.triggers.includes("Scheduled") && c.hasHttp },
    { text: "Rolling raw rows up into KPIs with Summarize", needs: (c) => c.hasSummarize },
    { text: "Reporting changes worth acting on", needs: (c) => c.hasFilter || c.hasIf },
  ],
  "Expense Tracking": [
    { text: "Extracting totals and vendors from receipts", needs: (c) => c.hasExtractor || c.hasExtractFromFile },
    { text: "Validating before writing to the ledger", needs: (c) => c.hasBranching },
    { text: "Flagging anomalies for review", needs: (c) => c.hasIf || c.hasFilter },
  ],
  "Video Production": [
    { text: "Moving media assets through a processing pipeline", needs: (c) => c.integrations.includes("Google Drive") || c.hasHttp },
    { text: "Staging metadata and descriptions for publishing", needs: (c) => c.hasAI || c.hasCode },
    { text: "Archiving finished assets", needs: (c) => c.hasConvertToFile || c.integrations.includes("Google Drive") },
  ],
  "Workflow Automation": [
    { text: "Delegating a step to a sub-workflow so it can be reused", needs: (c) => c.hasSubWorkflow },
    { text: "Structuring a workflow as trigger, validate, act, notify" },
    { text: "Leaving an audit trail every run", needs: (c) => c.hasExecutionData },
  ],
};

/**
 * Top-ups, most specific first. The leading entries name this template's own
 * systems and trigger so a page that falls through to them still reads as its
 * own page; the last three name no node at all and hold for every template in
 * the catalog, so the block is never empty.
 */
const FALLBACKS: Bullet[] = [
  {
    text: (c) => `Moving data between ${joinSystems(c.integrations.slice(0, 3))} in a single run`,
    needs: (c) => c.integrations.length >= 2,
  },
  {
    text: (c) => `Driving ${c.integrations[0]} from a ${c.triggers[0]!.toLowerCase()} trigger`,
    needs: (c) => c.integrations.length === 1 && c.triggers.length >= 1,
  },
  { text: "Failing loudly on a bad run instead of letting it pass silently", needs: (c) => c.hasStopAndError },
  { text: "Splitting one run into branches and merging the results back", needs: (c) => c.hasBranching && c.hasMerge },
  { text: "Rolling many rows up into a few reportable numbers", needs: (c) => c.hasSummarize || c.hasAggregate },
  { text: "Walking a long list in batches instead of firing everything at once", needs: (c) => c.hasBatch },
  { text: "Normalising timestamps before anything downstream compares them", needs: (c) => c.hasDateTime },
  { text: "Adding retries and an explicit error path to external calls", needs: (c) => c.hasRetries },
  { text: "Testing against pinned sample data before connecting anything real", needs: (c) => c.hasPinData },
  { text: "Structuring a workflow as trigger, validate, act, and notify" },
  { text: "Keeping secrets in n8n credentials rather than in node parameters" },
  { text: "Reading each node's own doc card before changing what it does" },
];

// What the difficulty band itself signals about the build.
const BAND_NOTE: Record<SkillBand, string> = {
  Foundation:
    "A starter-sized build - small enough to hold in your head while you learn the pattern.",
  Core: "A compact production shape: validation and error handling without extra machinery.",
  Advanced: "Adds branching depth and audit logging on top of the core pattern.",
  Production:
    "Production-grade: idempotency, dead-letter handling, and reconciliation included.",
  Architect:
    "The deepest tier - sub-workflow delegation, state snapshots, and full observability.",
};

export type LearningInfo = {
  band: SkillBand;
  bandNote: string;
  skills: string[];
};

export function patternOf(longDescription: string | null | undefined): string | null {
  const m = /'([^']+)' pattern/.exec(longDescription ?? "");
  return m ? m[1] : null;
}

const SKILL_COUNT = 3;

export function learningFor(
  item: { tier: string | null; totalNodes: number; longDescription?: string | null },
  caps: Caps | null
): LearningInfo {
  const band = bandFor(item);
  const bandNote = BAND_NOTE[band];

  // With no graph to check against, only claims that name no node may run.
  if (!caps) {
    const safe = FALLBACKS.filter((b) => !b.needs && typeof b.text === "string").map(
      (b) => b.text as string
    );
    return { band, bandNote, skills: safe.slice(0, SKILL_COUNT) };
  }

  const pattern = patternOf(item.longDescription);
  const candidates = [...(pattern ? PATTERN_SKILLS[pattern] ?? [] : []), ...FALLBACKS];

  const skills: string[] = [];
  for (const b of candidates) {
    if (skills.length >= SKILL_COUNT) break;
    if (b.needs && !b.needs(caps)) continue;
    const text = typeof b.text === "function" ? b.text(caps) : b.text;
    if (text && !skills.includes(text)) skills.push(text);
  }
  return { band, bandNote, skills };
}
