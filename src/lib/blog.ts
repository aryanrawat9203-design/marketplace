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
  ];

export function getPost(slug: string): BlogPost | undefined {
    return posts.find((p) => p.slug === slug);
}
  return posts.find((p) => p.slug === slug);
}
