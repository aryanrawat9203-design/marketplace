export type GuideSection = { h: string; p: string[] };

export type Guide = {
  slug: string;
  title: string;
  description: string;
  intro: string[];
  /**
   * Long-form body below the intro. The short guides (category round-ups) have
   * none and lean on the template grid; the editorial ones - the comparisons
   * and the free-alternative answer - are almost entirely sections, because
   * that is the content that actually ranks. Search Console: hand-written
   * pages sit on page one, generated pages do not.
   */
  sections?: GuideSection[];
  /** Rendered as an FAQPage block as well as visible copy. */
  faq?: { q: string; a: string }[];
  category?: string;
  freeOnly?: boolean;
  /** Show the highest-demand templates overall (used by the comparison guides). */
  popular?: boolean;
  /** Where the template grid should sit relative to the sections. */
  gridAfterSections?: boolean;
  /** Shown under the title; the comparisons are dated because prices move. */
  updated?: string;
  closing: string;
};

export const guides: Guide[] = [
  {
    slug: "why-pay-for-n8n-templates",
    freeOnly: true,
    title: "Why pay for an n8n template when n8n.io gives them away free?",
    description:
      "An honest answer to the obvious objection: what the free n8n template libraries give you, where they fall short, and when paying is and is not worth it.",
    updated: "10 August 2026",
    intro: [
      "It is a fair question and we would rather answer it than pretend nobody asks. n8n.io hosts more than eleven thousand community templates, free, on the domain you already trust, inside the product you already use. GitHub repositories like awesome-n8n-templates collect hundreds more. If you have one of those open in another tab right now, you are doing the sensible thing.",
      "So here is the honest version: for a lot of people, the free libraries are enough, and you should use them. What follows is what you actually get for money, where the free route costs you more than it saves, and the cases where we would tell you not to buy.",
    ],
    sections: [
      {
        h: "Start here: when the free libraries are the right answer",
        p: [
          "If you are learning n8n, browse the community library and import everything that looks interesting. Nothing we sell will teach you faster than taking apart twenty free workflows in an evening, and paying for that stage would be a waste of money.",
          "If you need one common, well-trodden automation - an RSS feed into Slack, a form into a spreadsheet - the free library almost certainly has a working version. Take it.",
          "If your requirement is unusual enough that no template will match, you are going to build from scratch either way, and a template of any price is not going to change that.",
        ],
      },
      {
        h: "What the community library actually is",
        p: [
          "The n8n.io template library is a community upload directory. Anyone can publish to it, there is no editorial gate, and quality ranges from excellent to abandoned. That is not a criticism - it is the correct design for a community library, and it is why it has eleven thousand entries and we have ten and a half.",
          "The consequences follow from the design rather than from anyone doing anything wrong. Templates are uploaded at a point in time and not necessarily maintained as nodes change. Documentation is whatever the author felt like writing, which is often a paragraph and sometimes nothing. Error handling is whatever the author needed for their own use, which is usually none, because it was working on their machine.",
          "The practical cost is search and evaluation time. Finding the right free template is quick. Determining whether it works, what it assumes, and what happens when the API it calls returns a 500 - that is the part that takes an afternoon.",
        ],
      },
      {
        h: "What you are paying for here, specifically",
        p: [
          "Documentation that exists. Every template we sell carries per-node documentation, credential setup notes, and a troubleshooting section, written per workflow rather than generated - a median of roughly 1,500 words each. You can read all of it on the template page before you pay anything, which is the point: you are not buying a description, you are buying something you have already inspected.",
          "Error handling as standard. Every template in the catalog has retry logic and error rails on the nodes that talk to external services. Free templates typically fail silently, because the author was watching the execution when they built it and never needed the workflow to survive a 429 at three in the morning.",
          "A catalog rather than a pile. Templates are categorised, difficulty-laddered, searchable by integration, and previewable as a full node graph before purchase. Eleven thousand entries with weak filtering is not eleven thousand times more useful than a few thousand you can actually navigate.",
          "Files that import. Each one is schema-validated and secret-scanned before it ships. A community template that references a node version your instance does not have, or that has someone's API key still sitting in it, is a normal thing to encounter in a free library.",
        ],
      },
      {
        h: "The honest arithmetic",
        p: [
          "Do not buy a template to save building time on something you could build in twenty minutes. Buy one when reading a documented, working version of a pattern you have not built before is worth more to you than the price - which for most people is a question about their hourly rate and how many evenings they want to spend on it.",
          "The case is weakest for simple workflows and strongest for the ones with awkward parts: pagination, rate limits, deduplication, partial-failure recovery. Those are the parts a free template usually omits and the parts that take a day to get right on your own.",
          "We also keep a permanent free tier here, no email required, for exactly this reason. If our documentation and error handling do not look meaningfully better to you than what you can get free, download a few, compare them side by side, and do not buy anything.",
        ],
      },
      {
        h: "What we do not claim",
        p: [
          "We are not claiming the free templates are bad. Many are excellent, and some are better than anything in our catalog for their specific job.",
          "We are not claiming ours are exclusive knowledge. Every pattern we sell is one you could work out yourself with the n8n docs and enough time. What you are buying is the time, the documentation, and the failure handling - not a secret.",
          "And we are not going to tell you these are original in the sense of being unlike anything else. They are original in the sense that we built them, in-house, rather than repackaging someone else's public workflow - which is a specific claim about provenance, not about novelty.",
        ],
      },
    ],
    faq: [
      {
        q: "Are the templates on n8n.io free to use commercially?",
        a: "Community templates are published by their authors and their terms vary; most carry no explicit licence at all, which is worth knowing if you are shipping something for a client. n8n itself is fair-code under the Sustainable Use License - free to self-host and modify for your own internal business use, with reselling the software restricted.",
      },
      {
        q: "Can I just modify a free template instead of buying one?",
        a: "Yes, and often you should. The question is whether the modification is quick. Changing a destination is quick; adding deduplication, retries and pagination to a workflow that has none is usually slower than starting from one that already has them.",
      },
      {
        q: "What if a template I buy does not work?",
        a: "Contact us within 7 days of purchase and we will fix it or refund you. Every purchase also shows you the full node graph and documentation before payment, so there should be no surprises after it.",
      },
      {
        q: "Do you have free templates too?",
        a: "Yes - a permanent free tier, downloadable without an account or an email address. They are the same build standard as the paid ones, which is the point of having them.",
      },
    ],
    closing:
      "The fastest way to settle this is to download a few of our free templates and open a few from the community library side by side. If the difference is not obvious to you, do not spend anything.",
  },
  {
    slug: "n8n-vs-zapier",
    popular: true,
    title: "n8n vs Zapier: which one for your use case (2026)",
    description:
      "A balanced comparison of n8n and Zapier - billing models, where each one genuinely wins, and how to decide which fits the automation you are actually building.",
    updated: "10 August 2026",
    intro: [
      "Both tools connect apps and run automations, and either will do the job for a simple two-app workflow. The difference shows up in how you are billed, how much control you have, and what happens when the automation gets complicated.",
      "Prices below were checked in August 2026 and both vendors change them; treat the numbers as indicative and the billing models as the durable part.",
    ],
    sections: [
      {
        h: "The single biggest difference is what you are billed for",
        p: [
          "Zapier bills per task. A task is roughly one action step that runs - so a Zap with five action steps, running once, consumes five tasks. Filters that stop a Zap early do not consume tasks, but everything downstream of a trigger that fires does.",
          "n8n bills per execution. One workflow run is one execution, whether it contains three nodes or forty. Self-hosted n8n does not meter executions at all.",
          "This is not a small accounting difference; it inverts the incentives. On Zapier you are nudged toward fewer, simpler steps. On n8n the marginal cost of an extra node is zero, so elaborate workflows are free to build. If your automations are naturally many-step, this one difference tends to dominate everything else in the comparison.",
        ],
      },
      {
        h: "Where Zapier genuinely wins",
        p: [
          "Breadth of integrations. Zapier's app directory is several times the size of n8n's node catalog, and the long tail matters - if your automation depends on a niche SaaS product, Zapier probably supports it and n8n probably requires an HTTP Request node and reading the API docs yourself.",
          "Time to first working automation. For a non-technical user, Zapier is faster to a result and always will be: guided setup, plain-English field mapping, no concepts to learn. n8n asks you to understand items, node outputs and expressions before you get far.",
          "Nothing to operate. Zapier is only ever a hosted product. There is no version to upgrade, no instance to keep running, no backup to worry about. n8n Cloud gets you close, but self-hosted n8n is infrastructure you own.",
          "Reliability you are not responsible for. When a self-hosted n8n instance falls over at 2am, that is your problem. When Zapier has an incident, it is Zapier's - and for a business-critical automation run by a team without an on-call rota, that is worth real money.",
        ],
      },
      {
        h: "Where n8n genuinely wins",
        p: [
          "Cost at volume, by a wide margin. Because you pay per run rather than per step, workflows with many steps get dramatically cheaper, and self-hosting removes the metering entirely - a VPS costs a few dollars a month regardless of how much you run through it.",
          "Anything the built-in nodes do not cover. n8n has a Code node running JavaScript or Python and an HTTP Request node that will talk to any API. When you hit the edge of what the tool anticipated, you can keep going instead of filing a feature request.",
          "Data residency and self-hosting. If the data must not leave your infrastructure - health data, financial records, anything with a compliance officer attached - self-hosted n8n is an option and Zapier structurally is not.",
          "Serious branching and looping. Multi-branch logic, loops over batches, sub-workflows and error workflows are first-class in n8n. Zapier's Paths handle branching, but complex control flow is where its model starts to strain.",
          "AI workflows. n8n's AI Agent and vector-store nodes are built for chaining models with tools, and the platform's recent development has been concentrated there.",
        ],
      },
      {
        h: "How to actually decide",
        p: [
          "Choose Zapier if the people maintaining the automation are non-technical, the workflows are short, the apps are unusual, and nobody wants to run infrastructure. That is a large and legitimate set of situations.",
          "Choose n8n if the workflows are long or branchy, the volume is high, you need an API that no one has built a connector for, the data cannot leave your servers, or you are building AI agent pipelines. Note that the first two are cost arguments and the last three are capability arguments - they are separable, and only some of them may apply to you.",
          "A pattern worth considering: many teams run both. Zapier handles the simple app-to-app plumbing that non-technical colleagues own, and n8n handles the heavy, high-volume or bespoke workflows. Neither tool is improved by being forced to do the other's job.",
        ],
      },
      {
        h: "The migration question",
        p: [
          "Rebuilding a Zap in n8n is not a conversion, it is a rebuild - the models are different enough that there is no meaningful import path. Budget for that honestly rather than assuming a tool will do it.",
          "If you are migrating for cost reasons, work out the real numbers first: count your monthly tasks, count how many of those are steps within a single run, and compare against n8n's per-execution pricing or a VPS. For many workflows the saving is large. For a handful of simple two-step Zaps running occasionally, it is not worth the weekend.",
        ],
      },
    ],
    faq: [
      {
        q: "Is n8n free?",
        a: "Self-hosted n8n Community Edition is free to run - you pay only for the server. It is fair-code under the Sustainable Use License, not OSI open source: free for your own internal business use, with restrictions on reselling it as a service. n8n Cloud is paid and starts in the low tens of dollars per month.",
      },
      {
        q: "Does n8n have as many integrations as Zapier?",
        a: "No, and it is not close in raw count. n8n offsets this with a generic HTTP Request node that can call any REST API, which covers most gaps at the cost of reading documentation yourself.",
      },
      {
        q: "Which is better for AI workflows?",
        a: "n8n, for most people. Its AI Agent, LLM chain and vector-store nodes are designed for tool-using agents, and per-execution billing means a chatty multi-step agent does not multiply your bill the way per-task billing would.",
      },
      {
        q: "Can I self-host Zapier?",
        a: "No. Zapier is a hosted product only. If self-hosting is a requirement, the comparison ends there.",
      },
    ],
    closing:
      "If you land on n8n, the templates below are the shortest path from a decision to something running - each one is a complete, documented workflow you can import and read rather than a screenshot of one.",
  },
  {
    slug: "n8n-vs-make",
    popular: true,
    title: "n8n vs Make: an honest comparison (2026)",
    description:
      "n8n and Make compared on billing model, visual design, error handling, self-hosting and where each one is the better choice.",
    updated: "10 August 2026",
    intro: [
      "Make (formerly Integromat) is the closest competitor to n8n in spirit: both are visual, both handle branching and iteration properly, and both are aimed at people who found Zapier's model too restrictive. Choosing between them comes down to a few specific differences rather than a general verdict.",
      "Checked August 2026. Both vendors change pricing; the billing models below are the durable part.",
    ],
    sections: [
      {
        h: "Billing: operations versus executions",
        p: [
          "Make bills per operation. An operation is one module doing one thing to one bundle of data - so a scenario that fetches 100 records and updates each one consumes roughly 100 operations, not one. Iterating over a list is where Make budgets actually go.",
          "n8n bills per execution: one workflow run, one execution, regardless of how many items pass through it. A workflow that processes 100 records in a batch is one execution.",
          "For record-by-record work - syncing a table, enriching a list, processing a feed - this difference is large and consistently favours n8n. For scenarios that handle one item per run, the two models are much closer and the price comparison depends on the plan tier rather than the architecture.",
        ],
      },
      {
        h: "Where Make genuinely wins",
        p: [
          "The visual editor is better. Make's canvas, with its circular modules and inline data preview, is more legible than n8n's for medium-sized scenarios, and its error-path visualisation is genuinely good. People who find n8n's canvas cluttered are not wrong.",
          "Data mapping is friendlier. Make's mapping panel shows you the available fields from every upstream module and lets you drag them in. n8n's expression editor is more powerful and less approachable, and beginners spend real time confused about item structure.",
          "Built-in scheduling and error handling are more polished out of the box, and the entry-level paid tier is cheap for what it includes.",
          "It is fully hosted with no operational burden - the same argument that favours Zapier applies here.",
        ],
      },
      {
        h: "Where n8n genuinely wins",
        p: [
          "Self-hosting. Make has no self-hosted option at all. If data residency, air-gapped operation or unlimited volume on your own hardware matters, this decides it.",
          "Code when you need it. n8n's Code node runs JavaScript or Python over the whole item set. Make has functions and a limited custom-code capability on higher tiers, but n8n treats writing code as normal rather than as an escape hatch.",
          "Per-execution billing on high-item workflows, as above.",
          "AI and agent tooling. n8n has invested heavily in AI Agent nodes, tool calling and vector stores; Make has AI modules but the agent-building experience is less developed.",
          "Version control and portability. An n8n workflow is a JSON file you can diff, commit and move between instances. Make scenarios are exportable as blueprints, but the workflow-as-a-file model is more natural in n8n and is why a template ecosystem exists there at all.",
        ],
      },
      {
        h: "How to decide",
        p: [
          "Choose Make if the priority is a pleasant visual builder for a team that is not going to write code, the workflows are mostly single-item, and hosting it yourself is not on the table.",
          "Choose n8n if you process lists and batches, want to self-host, expect to write some code, or are building AI agents.",
          "If you are undecided and technical, the deciding factor is usually the iteration question: sketch your busiest scenario and count how many modules would run per record. If the answer is 'a lot, times a lot of records', n8n's model will cost less and the difference will grow.",
        ],
      },
    ],
    faq: [
      {
        q: "Is Make cheaper than n8n?",
        a: "At the entry tier, Make's paid plan is inexpensive and competitive with n8n Cloud. At volume, particularly for workflows that loop over many records, n8n's per-execution billing usually wins, and self-hosted n8n removes metering entirely.",
      },
      {
        q: "Can I import Make scenarios into n8n?",
        a: "No. Make blueprints and n8n workflow JSON are unrelated formats. Migration means rebuilding, though the logic usually transfers conceptually node for module.",
      },
      {
        q: "Which has more integrations?",
        a: "Make has more built-in apps than n8n. Both can call arbitrary REST APIs - Make with its HTTP module, n8n with its HTTP Request node - so the gap matters less than the raw counts suggest.",
      },
    ],
    closing:
      "If n8n is the answer, the templates below show the patterns that make per-execution billing pay off - batching, looping and enrichment done in one run rather than one call at a time.",
  },
  {
    slug: "best-n8n-alternatives-to-zapier-and-make",
    popular: true,
    title: "The best n8n alternatives to Zapier, Make and Power Automate",
    description:
      "Where n8n fits among the automation tools people usually compare it against - Zapier, Make, Power Automate, Activepieces and Windmill - and which to pick for which job.",
    updated: "10 August 2026",
    intro: [
      "People arrive at n8n from several directions: Zapier bills got expensive, Make could not be self-hosted, Power Automate only made sense inside Microsoft, or a compliance requirement ruled out hosted tools entirely. This is a map of that landscape rather than an argument for one answer.",
      "The short version: there is no best tool, there is a best tool for a billing model, a hosting constraint and a team's appetite for code. Those three questions decide almost every case.",
    ],
    sections: [
      {
        h: "Zapier - the default, and why people leave it",
        p: [
          "Zapier has the largest app directory and the gentlest learning curve, and for short automations owned by non-technical people it remains the sensible default.",
          "People leave for two reasons. Cost, because per-task billing multiplies with workflow length. And ceilings, because complex branching, looping and custom API work run into the edges of what the model expresses. Neither is a flaw exactly - they are the cost of a design optimised for approachability.",
        ],
      },
      {
        h: "Make - the visual middle ground",
        p: [
          "Make sits between Zapier and n8n: proper branching and iteration, a genuinely good canvas, still fully hosted with no self-host option.",
          "It is the right destination for a team leaving Zapier over capability rather than cost, and staying hosted. It is the wrong destination if the reason for leaving is per-item billing, since operations-based pricing has the same shape of problem for list-heavy work.",
        ],
      },
      {
        h: "Power Automate - if you already live in Microsoft 365",
        p: [
          "Power Automate's case is entirely about the estate around it. Deep integration with SharePoint, Teams, Outlook, Dataverse and Entra, licensing that may already be bundled with what you pay Microsoft, and an approvals model that fits corporate process work.",
          "Outside that estate it is a harder sell: connectors to non-Microsoft services are more variable, the premium-connector licensing gets complicated, and the developer experience is not the reason anyone chooses it. If your automation is mostly Microsoft-to-Microsoft, it is often already paid for. If it is not, it rarely wins on merit.",
        ],
      },
      {
        h: "n8n - self-hostable, per-execution, code-friendly",
        p: [
          "n8n's case is the combination rather than any single feature: a visual builder, per-execution billing, a real Code node, and the option to run the whole thing on your own server under a fair-code licence.",
          "The trade is a steeper learning curve than Zapier or Make, fewer native integrations than either, and - if you self-host - an instance that is yours to keep running, back up and upgrade.",
          "It is the strongest fit for technical teams, high-volume or many-step workflows, data that cannot leave your infrastructure, and AI agent pipelines.",
        ],
      },
      {
        h: "The open-source and developer-first options",
        p: [
          "Activepieces is genuinely MIT-licensed and self-hostable, with a simpler interface than n8n and a smaller integration catalog. It is worth a look if the licensing purity matters to you or if n8n's canvas feels heavy.",
          "Windmill approaches the same problem from the developer's end: scripts first, with a flow builder layered on top. If your team would rather write TypeScript or Python than drag nodes, it fits better than any of the above.",
          "Temporal and similar durable-execution frameworks are a different category altogether - engineering infrastructure for long-running, reliability-critical workflows, not app-connection tools. If someone suggests one as a Zapier alternative, they are answering a different question.",
        ],
      },
      {
        h: "Three questions that settle it",
        p: [
          "Must the data stay on your own infrastructure? If yes, the list is n8n, Activepieces or Windmill, and the rest are out regardless of their other merits.",
          "Will your workflows loop over many records, or run many steps per trigger? If yes, per-execution billing (n8n) or self-hosting saves substantially over per-task (Zapier) or per-operation (Make) models.",
          "Who maintains it after you build it? If the answer is a non-technical colleague, weight approachability heavily - a Zap they can edit beats an elegant n8n workflow only you understand.",
        ],
      },
    ],
    faq: [
      {
        q: "What is the closest free alternative to Zapier?",
        a: "Self-hosted n8n Community Edition or Activepieces. Both are free to run on a small VPS; the cost moves from a subscription to a few dollars of hosting plus your own time maintaining it.",
      },
      {
        q: "Is n8n actually open source?",
        a: "Not by the OSI definition. n8n uses the Sustainable Use License - source-available and free for internal business use, with restrictions on reselling it as a hosted service. n8n calls this fair-code. Activepieces, by contrast, is MIT-licensed.",
      },
      {
        q: "Which alternative has the most integrations?",
        a: "Zapier, by a wide margin, followed by Make and Power Automate. n8n, Activepieces and Windmill all rely more on generic HTTP calls for the long tail.",
      },
    ],
    closing:
      "If n8n is where you land, the templates below cover the patterns people usually migrate first - notifications, syncs and enrichment - documented well enough to learn the tool from rather than only to run.",
  },
  {
    slug: "how-to-import-an-n8n-workflow-template",
    title: "How to import an n8n workflow template",
    description:
      "A step-by-step guide to importing a downloaded n8n workflow JSON file into your own n8n instance.",
    intro: [
      "Every WorkflowCrate template is delivered as a ZIP holding the n8n workflow JSON and a generated SETUP.md for that template (a bundle holds several pairs). Importing the JSON takes under a minute; the setup it then needs is what the SETUP.md is for.",
      "In your n8n instance, open Workflows, then use the menu in the top right and choose Import from File. Select the JSON file you downloaded and n8n will load the full workflow, including all nodes and their connections.",
      "Before running it, open each node that talks to an external service (for example HubSpot, Google Sheets, or Slack) and attach your own credentials - templates never ship with live credentials baked in. Credentials are not the whole job, though: most templates also leave the specific spreadsheet, database or folder for you to choose, and n8n renders those as a dropdown with a placeholder name already showing, so a node can look configured when nothing is selected. The SETUP.md in the download lists every one of them for that template, by node and parameter. Work through it, clear the pinned sample data on the trigger so your test run uses real data, then activate.",
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
