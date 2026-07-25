import { bandFor, type SkillBand } from "./bundles";

/**
 * "What you'll learn" copy for a template's product page.
 *
 * Everything here is derived at render time from data the catalog already
 * carries (the pattern named in longDescription, plus tier/totalNodes via
 * bandFor), so no catalog rewrite or extra payload is involved.
 */

// The concrete n8n techniques each architecture pattern teaches.
const PATTERN_SKILLS: Record<string, string[]> = {
  "AI Agent": [
    "Wiring an AI Agent to a chat model, memory, and multiple tools",
    "Writing a system message that controls when the agent reaches for each tool",
    "Gating low-confidence answers to a human instead of shipping them",
  ],
  "AI Summarize & Route": [
    "Using a Chain for fixed AI steps instead of paying for an Agent",
    "Routing classified output into separate action branches",
    "Rejoining parallel branches with Merge so the run reports once",
  ],
  "Chatbot Responder": [
    "Handling a live chat trigger and keeping per-session conversation memory",
    "Grounding replies in retrieved context rather than model recall",
    "Escalating to a human when the bot cannot answer",
  ],
  "RAG Pipeline": [
    "Chunking documents with overlap and embedding them into a vector store",
    "Exposing a vector index to an agent as a semantic-search tool",
    "Keeping the embedding model identical between indexing and querying",
  ],
  "Data Enrichment": [
    "Building a provider waterfall that only pays for a fallback on a real miss",
    "Scoring records after enrichment so the score sees the richest data",
    "Upserting so repeat runs update rather than duplicate",
  ],
  "Two-System Sync": [
    "Diffing two datasets into add / update / in-sync / backfill lanes",
    "Choosing a stable matching key for reconciliation",
    "Making a sync safe to re-run without creating duplicates",
  ],
  "Webhook Pipeline": [
    "Verifying an inbound webhook signature before trusting the payload",
    "Acknowledging fast, then doing the real work, to avoid delivery retries",
    "Routing event kinds with Switch and catching unknown types",
  ],
  "Scheduled Digest": [
    "Collecting from multiple sources and blending them into one stream",
    "Summarizing and formatting a readable digest",
    "Archiving each run for an audit trail",
  ],
  "Threshold Monitoring": [
    "Grading severity into tiers instead of a single yes/no alert",
    "Routing each tier to a channel matched to its urgency",
    "Suppressing repeat alerts so one incident pages once",
  ],
  "Lead Capture & Routing": [
    "Scoring inbound leads and routing them by heat",
    "Assigning an accountable owner round-robin",
    "Upserting into a CRM keyed on email",
  ],
  "Approval Workflow": [
    "Pausing a workflow on a Wait node until a human decides",
    "Embedding a resume URL so approving is one click",
    "Branching cleanly on approve versus decline",
  ],
  "Form Intake": [
    "Serving an n8n-hosted form and shaping each submission",
    "Validating required fields before anything is written",
    "Sending incomplete submissions to review instead of storing them",
  ],
  "Drip Sequence": [
    "Sequencing multi-day sends with durable Wait nodes",
    "Checking for conversion before every step so the drip stops",
    "Segmenting the audience up front",
  ],
  "Content Generation": [
    "Chaining a writer pass and a separate critic pass for better output",
    "Publishing as a draft so a human stays the final gate",
    "Converting markdown to HTML for delivery",
  ],
  "Document Generation": [
    "Extracting structured fields from free text with a strict schema",
    "Validating required fields before the write",
    "Upserting so reprocessing a document does not duplicate it",
  ],
  "File Processing": [
    "Downloading and parsing CSV, XLSX, or PDF into JSON items",
    "Quarantining malformed rows without failing the whole batch",
    "Archiving the processed file",
  ],
  "Web Scraping": [
    "Extracting values from raw HTML with CSS selectors",
    "Diffing against the previous snapshot so only real changes alert",
    "Zipping parallel arrays into one item per record",
  ],
  "Event Notification": [
    "Reacting to an event and notifying the right channel",
    "Adding retries and an error rail to every external call",
    "Keeping alert volume low enough to stay meaningful",
  ],
  "Social Scheduler": [
    "Reading a content calendar and publishing only what is due",
    "Spacing posts with a batch loop and Wait to respect rate limits",
    "Marking rows published only after the post succeeds",
  ],
  "Social Listening": [
    "Polling a feed and deduplicating across executions",
    "Filtering to only what is worth surfacing",
    "Cross-posting to several channels in parallel",
  ],
  "Backup & Archive": [
    "Exporting a dataset and serializing it to a file",
    "Compressing before upload to cut transfer and storage",
    "Alarming on an empty backup instead of failing silently",
  ],
  "Order Fulfillment": [
    "Reacting to order events and updating systems idempotently",
    "Branching on order state",
    "Notifying customers and staff on the right channels",
  ],
  "Abandoned Cart Recovery": [
    "Detecting inactivity with a durable Wait",
    "Checking for conversion before each reminder",
    "Personalizing recovery messages from cart data",
  ],
  "Reminders & Follow-ups": [
    "Scheduling time-based follow-ups that survive restarts",
    "Exiting the sequence when the task is already done",
    "Choosing the right reminder channel",
  ],
  "Onboarding Sequence": [
    "Staging a multi-step onboarding with waits between steps",
    "Tracking progress so steps are not repeated",
    "Branching by segment",
  ],
  "Meeting Scheduling": [
    "Checking calendar availability before booking",
    "Handling the slot-taken path with alternatives",
    "Sending confirmations and timed reminders",
  ],
  "Ticket Triage": [
    "Classifying tickets with an LLM instead of keyword rules",
    "Routing each class to the right queue or owner",
    "Escalating negative sentiment quickly",
  ],
  "Recruitment Pipeline": [
    "Parsing applications into structured candidate records",
    "Scoring and routing by stage",
    "Keeping the applicant tracking system in sync",
  ],
  "Survey & Feedback": [
    "Collecting responses and detecting sentiment",
    "Routing detractors to a human fast",
    "Aggregating results into reportable numbers",
  ],
  "Trading Alert": [
    "Computing indicators from raw price series in a Code node",
    "Grading signals into severity tiers",
    "Alerting without spamming on every tick",
  ],
  "SEO Audit": [
    "Pulling page and ranking data on a schedule",
    "Rolling raw rows up into KPIs with Summarize",
    "Reporting changes worth acting on",
  ],
  "Expense Tracking": [
    "Extracting totals and vendors from receipts",
    "Validating before writing to the ledger",
    "Flagging anomalies for review",
  ],
  "Video Production": [
    "Moving media assets through a processing pipeline",
    "Staging metadata and descriptions for publishing",
    "Archiving finished assets",
  ],
  "Workflow Automation": [
    "Structuring a workflow as trigger, validate, act, notify",
    "Adding retries and an explicit error path to external calls",
    "Leaving an audit trail every run",
  ],
};

const DEFAULT_SKILLS = [
  "Structuring a workflow as trigger, validate, act, and notify",
  "Adding retries and an explicit error path to every external call",
  "Keeping writes idempotent so re-runs stay safe",
];

// What the difficulty band itself signals about the build.
const BAND_NOTE: Record<SkillBand, string> = {
  Foundation:
    "A starter-sized build - small enough to hold in your head while you learn the pattern.",
  Core: "A compact production shape: validation and error handling without extra machinery.",
  Advanced:
    "Adds branching depth and audit logging on top of the core pattern.",
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

export function learningFor(item: {
  tier: string | null;
  totalNodes: number;
  longDescription?: string | null;
}): LearningInfo {
  const band = bandFor(item);
  const pattern = patternOf(item.longDescription);
  const skills = (pattern && PATTERN_SKILLS[pattern]) || DEFAULT_SKILLS;
  return { band, bandNote: BAND_NOTE[band], skills };
}
