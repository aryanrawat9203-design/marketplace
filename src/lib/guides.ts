export type Guide = {
  slug: string;
  title: string;
  description: string;
  intro: string[];
  category?: string;
  freeOnly?: boolean;
  closing: string;
};

export const guides: Guide[] = [
  {
    slug: "how-to-import-an-n8n-workflow-template",
    title: "How to import an n8n workflow template",
    description:
      "A step-by-step guide to importing a downloaded n8n workflow JSON file into your own n8n instance.",
    intro: [
      "Every FlowDex template is delivered as a single n8n workflow JSON file (a bundle is a ZIP of several). Importing one takes under a minute.",
      "In your n8n instance, open Workflows, then use the menu in the top right and choose Import from File. Select the JSON file you downloaded and n8n will load the full workflow, including all nodes and their connections.",
      "Before running it, open each node that talks to an external service (for example HubSpot, Google Sheets, or Slack) and attach your own credentials - templates never ship with live credentials baked in. Once every node is connected, activate the workflow and it is ready to run.",
    ],
    closing:
      "If a template does not import cleanly, contact us within 7 days of purchase and we will fix it or refund you - see our Refund Policy.",
  },
  {
    slug: "best-n8n-workflows-for-lead-generation",
    title: "Best n8n workflows for lead generation",
    description:
      "Original n8n automations for finding, enriching, and routing new leads, picked from our lead-generation category.",
    intro: [
      "Lead generation is one of the most common reasons teams pick up n8n: pulling new contacts from forms, enriching them with third-party data, and getting them into a CRM without manual copy-paste.",
      "Below are our most popular lead-generation templates right now, ranked by demand.",
    ],
    category: "Lead Generation",
    closing:
      "Need several of these? A category bundle is usually far cheaper per template than buying them one at a time.",
  },
  {
    slug: "best-n8n-workflows-for-email-automation",
    title: "Best n8n workflows for email automation",
    description:
      "Original n8n automations for sorting, summarizing, and responding to email, picked from our email-automation category.",
    intro: [
      "Email is still where a lot of manual work hides - triage, summarizing long threads, forwarding the right message to the right person. These templates automate the repetitive parts.",
      "Here are our most popular email-automation templates right now, ranked by demand.",
    ],
    category: "Email Automation",
    closing:
      "Buying more than one? A category bundle bundles every email-automation template we have at a much lower price per template.",
  },
  {
    slug: "best-n8n-workflows-for-ai-agents",
    title: "Best n8n workflows for AI agents",
    description:
      "Original n8n automations that use an AI agent or LLM step, picked from our AI Agents category.",
    intro: [
      "AI agent workflows connect a language model to real tools - CRMs, spreadsheets, search, your own APIs - so it can take actions, not just answer questions.",
      "Here are our most popular AI agent templates right now, ranked by demand.",
    ],
    category: "AI Agents",
    closing:
      "This is our largest category. If you need more than a couple of these, the AI Agents bundle is the better value.",
  },
  {
    slug: "free-n8n-templates-to-try-first",
    title: "Free n8n templates to try first",
    description: "Genuinely free n8n workflow templates - no card, no signup - to see the quality before you buy.",
    intro: [
      "Every template we sell is original work we built in-house, and we keep a set of them free permanently so you can judge the quality before spending anything.",
      "A few of our free templates:",
    ],
    freeOnly: true,
    closing: "Like what you see? Browse the full catalog for hundreds more across 25 categories.",
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
