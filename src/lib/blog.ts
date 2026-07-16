export type BlogPost = {
    slug: string;
    title: string;
    description: string;
    date: string;
    tags: string[];
    body: string[];
    platform?: string;
    category?: string;
    closing: string;
};

export const posts: BlogPost[] = [
  {
        slug: "keep-slack-from-becoming-noise-with-n8n",
        title: "5 n8n workflows that keep your Slack channel from turning into noise",
        description:
                "Practical n8n patterns for routing, batching, and quieting down Slack notifications instead of adding to them.",
        date: "2026-07-04",
        tags: ["Slack", "Notifications", "Workflow Automation"],
        body: [
                "Once more than one or two workflows post into the same Slack channel, it stops being useful and starts being something people mute. The fix is rarely 'send fewer messages' - it is usually one of five structural patterns.",
                "Route by content, not by workflow. Instead of every automation dumping into #general, use a Switch node keyed on event type before the Slack node, and send leads to #leads, errors to #ops-alerts, and so on. A channel that only ever contains one kind of update stays scannable.",
                "Digest instead of ping. For anything that is not urgent, collect events into an array with a Set node across the day, then use a Schedule Trigger to flush the batch as a single formatted message every few hours instead of pinging per event.",
                "Thread noisy sequences. If a workflow posts several updates about the same underlying event (a deploy starting, then finishing, then failing a check), reply in-thread using the parent message's thread timestamp instead of posting new top-level messages each time.",
                "Respect a quiet window. An IF node checking the current time against a working-hours range, before the Slack node runs, stops 2am alerts for anything that can safely wait until morning.",
                "Keep the message to one line. Name, status, and a link back to the source (an execution, a record, a ticket) is enough - push detail behind the link or a thread reply rather than a wall of text in the channel.",
                "None of this requires custom code inside n8n - Switch, Set, Schedule Trigger, and IF are all core nodes, and Slack's own API supports both channel targeting and threaded replies natively through the Slack node.",
              ],
        platform: "Slack",
        closing:
                "If you would rather start from a working example than build the routing logic from scratch, a few of our Slack-integrated templates below cover exactly these patterns.",
  },
  {
        slug: "automate-hubspot-lead-follow-up-with-n8n",
        title: "How to automate HubSpot lead follow-up with n8n (no code)",
        description:
                "The capture, enrich, and route pattern behind most HubSpot lead-follow-up automations built in n8n.",
        date: "2026-07-04",
        tags: ["HubSpot", "Lead Generation"],
        body: [
                "Most HubSpot lead-follow-up automations in n8n follow the same three-stage shape, whatever the specific business logic ends up being: capture, enrich, route.",
                "Capture. A webhook trigger fires on a new form submission or deal-stage change, or, if you would rather not expose a public endpoint, a Schedule Trigger polls a saved HubSpot list every few minutes using the HubSpot node's search operation.",
                "Enrich. Before anything gets written back to HubSpot, an HTTP Request node can call a third-party enrichment API (company size, industry, tech stack) or an AI node can summarize the lead's own website into a short lead-scoring note, which then gets written to a custom HubSpot property.",
                "Route. A Switch node keyed on the lead score or source decides what happens next: high-score leads get a personalized outreach draft from an AI node, handed to a human to review before it goes out through Gmail or Outlook; lower-score leads get logged to a sheet for a weekly batch review instead of an individual email.",
                "The review step matters more than it sounds. Auto-sending AI-drafted outreach without a human check is how good lead lists turn into spam complaints - keep a human in the loop for anything that actually sends, and use n8n only to prepare the draft and the context around it.",
                "This same shape - capture, enrich, route - shows up across most of our lead-generation templates, just with different trigger sources and enrichment steps depending on where the lead originates.",
              ],
        platform: "HubSpot",
        closing:
                "A handful of our HubSpot-integrated templates below already wire up this exact pattern, if you want a starting point instead of building the three stages from a blank canvas.",
  },
  {
        slug: "n8n-workflow-templates-for-practice",
        title: "n8n workflow templates for practice: the fastest way to actually learn n8n",
        description:
                "Why importing real n8n workflow templates beats video tutorials for practice, and a simple four-step ladder from your first import to building production workflows.",
        date: "2026-07-16",
        tags: ["Beginners", "Learning n8n", "Workflow Automation"],
        body: [
                "Most people trying to learn n8n start with video tutorials, and most of them stall in the same place: they can follow along while the video plays, but stare at a blank canvas the moment it ends. The faster route is the one developers have always used - read working code before writing your own. In n8n terms, that means importing finished workflow templates and pulling them apart.",
                "A workflow template is just a JSON file describing nodes and the connections between them. Import one and you get a working, inspectable system: you can click into every node, see how it is configured, run it step by step, and watch real data move through each hop. That last part - executing one node at a time and reading its output - teaches you more about how n8n thinks than any amount of passive watching.",
                "A practice ladder that works: start with a two-or-three-node workflow, something like a schedule trigger feeding a Google Sheets append. Run it, break it, fix it. Second rung: pick a template with an IF or Switch node and trace both branches until routing logic feels obvious. Third: take a template with an HTTP Request node and point it at a different API than the one it was built for - remapping fields between systems is half of real automation work. Fourth: open a template that does something close to a real task you have, and modify it until it does your task exactly.",
                "When you import a template, read it in this order: trigger first (what starts it), then the last node (what it produces), then the middle (how data gets from one to the other). Beginners who read left to right through every node config get lost in settings; the trigger-and-destination frame keeps you oriented.",
                "Expect imported templates to fail on first run - that is normal, not a defect. Credentials do not travel inside template JSON, so every node that touches an external service needs your own connection before it will execute. Wiring up credentials is itself worth practicing, because it is the first thing you will do with every workflow you ever build.",
                "Practice on workflows that are slightly above your level, not far above it. A 40-node AI agent pipeline teaches a beginner nothing except intimidation. A 6-node lead-capture flow with one branch and one external API is the sweet spot: complex enough to be worth studying, small enough to hold in your head.",
                "You do not need many templates to get good - you need a handful of well-built ones across different trigger types (webhook, schedule, form, chat) and different shapes (linear, branching, looping). Once you have rebuilt three or four from memory, the blank canvas stops being blank; you start seeing every automation request as a trigger, a transform, and a destination.",
              ],
        platform: "Google Sheets",
        closing:
                "If you want ready-made practice material, the beginner-friendly templates below import in one click and are small enough to pull apart in an evening.",
  },
  {
        slug: "n8n-workflow-examples-for-beginners",
        title: "7 n8n workflow examples for beginners (and what each one teaches you)",
        description:
                "Seven beginner-friendly n8n workflow examples, from a scheduled Gmail digest to a simple AI summarizer, with the core n8n concept each one teaches.",
        date: "2026-07-16",
        tags: ["Beginners", "Examples", "Email Automation"],
        body: [
                "The best first workflows share two traits: they produce something you can see within five minutes, and each one teaches exactly one core n8n concept. These seven examples are ordered so every workflow adds one new idea on top of the last.",
                "One - the scheduled email digest. A Schedule Trigger fires every morning, a Gmail node searches yesterday's unread messages, and a second Gmail node sends you a one-line-per-email summary. Concept learned: the trigger-action shape that every workflow in n8n reduces to.",
                "Two - form to spreadsheet. A Form Trigger gives you a hosted form URL; each submission appends a row to Google Sheets. Concept learned: how data items flow between nodes as JSON, and how field mapping works when the source and destination name things differently.",
                "Three - the RSS-to-messenger pipeline. An RSS trigger watches a feed and posts new items to Telegram or Slack. Concept learned: polling triggers and deduplication - n8n remembering what it has already seen so you do not get the same item twice.",
                "Four - the conditional router. Take example two and add an IF node: submissions containing a company name go to a 'leads' sheet, the rest to 'general'. Concept learned: branching, and reading node output to decide what a condition should test.",
                "Five - the API enricher. After the form submission, an HTTP Request node calls a free public API (a geolocation lookup on the submitter's country works well) and writes the enriched row. Concept learned: talking to services n8n has no built-in node for - the skill that makes n8n effectively unlimited.",
                "Six - the error-aware workflow. Add an Error Trigger workflow that messages you when any other workflow fails. Concept learned: executions, error handling, and the difference between a workflow that works on your desk and one you can trust while you sleep.",
                "Seven - the AI summarizer. A webhook receives text, an AI node (OpenAI or Anthropic) summarizes it to three bullet points, and the result lands in Notion or a sheet. Concept learned: prompting inside a workflow, and passing upstream data into an AI node's context - the pattern behind almost every 'AI agent' template you will ever import.",
                "Build these seven in order and you have touched schedules, forms, polling, branching, raw APIs, error handling, and AI - the complete conceptual toolkit. Everything past this point is composition: bigger workflows are just these seven ideas stacked.",
              ],
        platform: "Gmail",
        closing:
                "Every pattern above exists as a ready-to-import template in our library - the Gmail-integrated picks below are a good place to start if you would rather import and dissect than build from scratch.",
  },
  ];

export function getPost(slug: string): BlogPost | undefined {
    return posts.find((p) => p.slug === slug);
}
