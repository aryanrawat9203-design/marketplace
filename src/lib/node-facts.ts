/**
 * Capability facts derived from a template's actual node graph.
 *
 * This is the only thing a product page is allowed to make a technique claim
 * from. Copy that names an n8n node — "pauses on a Wait node", "keeps
 * per-session memory", "embeds into a vector store" — must gate on a flag
 * here, so a claim can never outrun the file the customer downloads.
 *
 * Populated from the raw node `type` strings in the shipped workflow JSON
 * (see previewWorkflow in commerce.ts), never from a pattern name or any
 * other label.
 */

export type Caps = {
  /** Functional node count, sticky notes excluded. */
  nodes: number;
  /** Distinct third-party systems, excluding the generic HTTP escape hatch. */
  integrations: string[];
  triggers: string[];

  hasWait: boolean;
  hasSwitch: boolean;
  hasIf: boolean;
  hasBranching: boolean;
  hasFilter: boolean;
  hasMerge: boolean;
  hasCode: boolean;
  hasDedupe: boolean;
  hasCompare: boolean;
  hasAggregate: boolean;
  hasSummarize: boolean;
  hasSort: boolean;
  hasBatch: boolean;
  hasSplitOut: boolean;
  hasStopAndError: boolean;
  hasSubWorkflow: boolean;
  hasExecutionData: boolean;
  hasHttp: boolean;
  hasRespond: boolean;
  hasConvertToFile: boolean;
  hasExtractFromFile: boolean;
  hasCompression: boolean;
  hasCrypto: boolean;
  hasHtml: boolean;
  hasMarkdown: boolean;
  hasRss: boolean;
  hasDateTime: boolean;

  hasAgent: boolean;
  hasChain: boolean;
  hasChatModel: boolean;
  hasMemory: boolean;
  hasTools: boolean;
  hasVectorStore: boolean;
  hasEmbeddings: boolean;
  hasTextSplitter: boolean;
  hasClassifier: boolean;
  hasSentiment: boolean;
  hasExtractor: boolean;
  hasOutputParser: boolean;
  hasReranker: boolean;
  hasAI: boolean;

  /** At least one node carries retryOnFail. */
  hasRetries: boolean;
  /** The trigger ships pinned sample data, so the workflow runs before setup. */
  hasPinData: boolean;
};

/** Third-party systems, keyed to the platform names the catalog already uses. */
export const SERVICE_NODES: Record<string, string> = {
  "n8n-nodes-base.slack": "Slack",
  "n8n-nodes-base.googleSheets": "Google Sheets",
  "n8n-nodes-base.notion": "Notion",
  "n8n-nodes-base.hubspot": "HubSpot",
  "n8n-nodes-base.postgres": "PostgreSQL",
  "n8n-nodes-base.mySql": "MySQL",
  "n8n-nodes-base.airtable": "Airtable",
  "n8n-nodes-base.airtableTrigger": "Airtable",
  "n8n-nodes-base.googleDrive": "Google Drive",
  "n8n-nodes-base.discord": "Discord",
  "n8n-nodes-base.telegram": "Telegram",
  "n8n-nodes-base.telegramTrigger": "Telegram",
  "n8n-nodes-base.gmail": "Gmail",
  "n8n-nodes-base.gmailTrigger": "Gmail",
  "n8n-nodes-base.microsoftTeams": "Microsoft Teams",
  "n8n-nodes-base.twilio": "Twilio",
  "n8n-nodes-base.microsoftOutlook": "Outlook",
  "n8n-nodes-base.wordpress": "WordPress",
  "n8n-nodes-base.googleCalendar": "Google Calendar",
  "n8n-nodes-base.shopify": "Shopify",
  "n8n-nodes-base.shopifyTrigger": "Shopify",
  "n8n-nodes-base.zendesk": "Zendesk",
  "n8n-nodes-base.jira": "Jira",
  "n8n-nodes-base.jiraTrigger": "Jira",
  "n8n-nodes-base.trello": "Trello",
  "n8n-nodes-base.trelloTrigger": "Trello",
  "n8n-nodes-base.asana": "Asana",
  "n8n-nodes-base.asanaTrigger": "Asana",
  "n8n-nodes-base.emailReadImap": "IMAP email",
};

const TRIGGER_NODES: Record<string, string> = {
  "n8n-nodes-base.scheduleTrigger": "Scheduled",
  "n8n-nodes-base.webhook": "Webhook",
  "n8n-nodes-base.formTrigger": "Form",
  "@n8n/n8n-nodes-langchain.chatTrigger": "Chat",
  "n8n-nodes-base.telegramTrigger": "Webhook",
  "n8n-nodes-base.shopifyTrigger": "Webhook",
  "n8n-nodes-base.trelloTrigger": "Webhook",
  "n8n-nodes-base.jiraTrigger": "Webhook",
  "n8n-nodes-base.asanaTrigger": "Webhook",
  "n8n-nodes-base.airtableTrigger": "Webhook",
  "n8n-nodes-base.gmailTrigger": "Email",
  "n8n-nodes-base.emailReadImap": "Email",
};

export type CapsExtras = { nodeCount?: number; retries?: boolean; pinData?: boolean };

export function capsFromTypes(rawTypes: readonly string[], extras: CapsExtras = {}): Caps {
  const { nodeCount = 0, retries = false, pinData = false } = extras;
  const set = new Set(rawTypes);
  const has = (t: string) => set.has(t);
  const some = (pred: (t: string) => boolean) => rawTypes.some(pred);

  const integrations: string[] = [];
  for (const t of rawTypes) {
    const name = SERVICE_NODES[t];
    if (name && !integrations.includes(name)) integrations.push(name);
  }
  const triggers: string[] = [];
  for (const t of rawTypes) {
    const name = TRIGGER_NODES[t];
    if (name && !triggers.includes(name)) triggers.push(name);
  }

  return {
    nodes: nodeCount,
    integrations,
    triggers,

    hasWait: has("n8n-nodes-base.wait"),
    hasSwitch: has("n8n-nodes-base.switch"),
    hasIf: has("n8n-nodes-base.if"),
    hasBranching:
      has("n8n-nodes-base.switch") || has("n8n-nodes-base.if") || has("n8n-nodes-base.filter"),
    hasFilter: has("n8n-nodes-base.filter"),
    hasMerge: has("n8n-nodes-base.merge"),
    hasCode: has("n8n-nodes-base.code"),
    hasDedupe: has("n8n-nodes-base.removeDuplicates"),
    hasCompare: has("n8n-nodes-base.compareDatasets"),
    hasAggregate: has("n8n-nodes-base.aggregate"),
    hasSummarize: has("n8n-nodes-base.summarize"),
    hasSort: has("n8n-nodes-base.sort"),
    hasBatch: has("n8n-nodes-base.splitInBatches"),
    hasSplitOut: has("n8n-nodes-base.splitOut"),
    hasStopAndError: has("n8n-nodes-base.stopAndError"),
    hasSubWorkflow: has("n8n-nodes-base.executeWorkflow"),
    hasExecutionData: has("n8n-nodes-base.executionData"),
    hasHttp: has("n8n-nodes-base.httpRequest"),
    hasRespond: has("n8n-nodes-base.respondToWebhook"),
    hasConvertToFile: has("n8n-nodes-base.convertToFile"),
    hasExtractFromFile: has("n8n-nodes-base.extractFromFile"),
    hasCompression: has("n8n-nodes-base.compression"),
    hasCrypto: has("n8n-nodes-base.crypto"),
    hasHtml: has("n8n-nodes-base.html"),
    hasMarkdown: has("n8n-nodes-base.markdown"),
    hasRss: has("n8n-nodes-base.rssFeedRead"),
    hasDateTime: has("n8n-nodes-base.dateTime"),

    hasAgent: has("@n8n/n8n-nodes-langchain.agent"),
    hasChain:
      has("@n8n/n8n-nodes-langchain.chainLlm") ||
      has("@n8n/n8n-nodes-langchain.chainSummarization"),
    hasChatModel: some((t) => t.includes(".lmChat")),
    hasMemory: some((t) => t.includes(".memory")),
    hasTools: some((t) => /\.tool[A-Z]/.test(t)),
    hasVectorStore: some((t) => t.includes("vectorStore")),
    hasEmbeddings: some((t) => t.includes(".embeddings")),
    hasTextSplitter: some((t) => t.includes("textSplitter")),
    hasClassifier: has("@n8n/n8n-nodes-langchain.textClassifier"),
    hasSentiment: has("@n8n/n8n-nodes-langchain.sentimentAnalysis"),
    hasExtractor: has("@n8n/n8n-nodes-langchain.informationExtractor"),
    hasOutputParser: has("@n8n/n8n-nodes-langchain.outputParserStructured"),
    hasReranker: some((t) => t.includes("reranker")),
    hasAI: some((t) => t.startsWith("@n8n/n8n-nodes-langchain.")),

    hasRetries: retries,
    hasPinData: pinData,
  };
}

/**
 * Difficulty derived from the graph rather than from the label the generator
 * happened to stamp on. Counts functional nodes only.
 */
export function difficultyFromCaps(c: Caps): "Beginner" | "Intermediate" | "Advanced" | "Expert" {
  const int = c.integrations.length;
  if (
    c.nodes >= 26 ||
    c.hasVectorStore ||
    (c.hasAgent && c.hasTools && c.hasMemory) ||
    (c.hasBatch && c.hasWait)
  ) {
    return "Expert";
  }
  if (c.nodes >= 19 || int >= 4 || (c.hasAgent && c.hasTools)) return "Advanced";
  if (c.nodes >= 11 || int >= 3 || c.hasAI) return "Intermediate";
  return "Beginner";
}

/**
 * Human label for a raw n8n node type - "n8n-nodes-base.googleSheets" becomes
 * "Google Sheets". Lives here rather than in commerce.ts because the setup
 * checklist needs the same label the product page already shows: a step
 * telling someone to configure "Google Sheets" has to name the node the way
 * the rest of the page names it, or it reads as being about something else.
 */
export function friendlyNodeType(type: string): string {
  const short = type.replace(/^n8n-nodes-base\./, "").replace(/^@n8n\/n8n-nodes-langchain\./, "");
  return short
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
