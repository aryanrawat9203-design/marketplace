/**
 * Hand-written "How to connect X to Y" tutorials for the integration pairs
 * with measured search demand.
 *
 * The generic three-step block those pages used to carry ("pick a template,
 * import it, add credentials") was identical on all 107 pair pages with two
 * nouns swapped, and the pages sat at positions 26-62 for queries their
 * competitors answered properly. Real specifics - which node, which credential
 * type, which failure mode - are the only thing that closes that gap, and they
 * cannot be generated from the catalog, so they are written per pair here.
 *
 * A pair without an entry falls back to the generic steps on the page.
 */

export type PairGuideSection = { h: string; p: string[] };

export type PairGuide = {
  /**
   * The page it renders on: a canonical pair slug ("postgresql-and-slack") or,
   * where the demand is for one tool rather than a pair, a single-integration
   * slug ("airtable" - the measured query is "airtable n8n", which is the
   * integration page, not a pair).
   */
  slug: string;
  /** Nodes the reader will actually place on the canvas, in order. */
  nodes: string[];
  sections: PairGuideSection[];
};

export const pairGuides: PairGuide[] = [
  {
    slug: "postgresql-and-slack",
    nodes: ["Schedule Trigger / Postgres Trigger", "Postgres", "IF", "Slack"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "n8n ships a first-party Postgres node and a first-party Slack node, so nothing here needs an HTTP Request node or community package. The usual shape is a Schedule Trigger, a Postgres node running a SELECT, an IF or Filter node to decide whether the result is worth reporting, and a Slack node posting the message.",
          "There is also a Postgres Trigger node that listens on a LISTEN/NOTIFY channel. It is the right choice when you control the database and can add a trigger that calls pg_notify, and the wrong choice when the database is managed by someone else or sits behind a connection pooler - PgBouncer in transaction mode drops LISTEN registrations, which is why a Postgres Trigger that works locally goes silent in production. When in doubt, poll on a schedule.",
        ],
      },
      {
        h: "Setting up the PostgreSQL credential",
        p: [
          "The Postgres credential wants host, port (5432 unless you changed it), database, user and password - not a connection string. If you have a postgres://user:pass@host:5432/dbname URL from a managed provider, split it into those fields by hand.",
          "SSL is where most first connections fail. Supabase, Neon, Render and Amazon RDS all require TLS, so set SSL to 'Require'. If the provider uses a self-signed or private CA, 'Allow Unauthorized Certificates' gets you connected, at the cost of not verifying the server - acceptable inside a private network, not over the public internet. Self-hosted n8n also has to be able to reach the database: a cloud database will reject the connection outright unless n8n's egress IP is on its allowlist.",
          "Give the workflow its own database role with only the privileges it needs. A reporting workflow needs SELECT on two or three tables and nothing else, and a read-only role is the difference between a bad WHERE clause returning wrong numbers and it deleting rows.",
        ],
      },
      {
        h: "Setting up the Slack credential",
        p: [
          "There are two ways in. OAuth2 is the faster one if you are on n8n Cloud - you approve the app and n8n stores the token. An access token from a Slack app you create yourself is better for self-hosted, because you choose the scopes and the token does not expire with a user session.",
          "For posting, the bot token needs chat:write, plus channels:read if you want to select a channel from a dropdown rather than typing an ID. Posting to a private channel additionally needs groups:write, and the bot has to be invited to that channel - /invite @yourbot - or the API returns not_in_channel no matter what scopes you granted.",
          "Incoming webhooks are the third option and the one to reach for when a workflow only ever posts to a single channel. A webhook URL is one channel, permanently, and it cannot read anything - a small blast radius if the URL leaks. Send it from an HTTP Request node with a JSON body; you do not need the Slack node at all for that.",
        ],
      },
      {
        h: "Not posting the same row twice",
        p: [
          "This is the failure that turns a useful alert into a muted channel. A polling workflow re-runs the same SELECT every few minutes, so anything matching the WHERE clause is reported again on every run.",
          "The durable fix is a high-water mark in the database itself: keep a created_at or updated_at column, have the query ask for rows newer than the last value you processed, and write that value back after a successful post. Storing the mark in the database rather than in n8n's static data means a workflow that is deleted and re-imported does not replay a week of history.",
          "The cheaper fix, when you own the table, is a boolean notified column - SELECT the rows where it is false, post them, then UPDATE them to true in a second Postgres node after the Slack node. Order matters: update after the post succeeds, not before, or a Slack outage silently swallows the rows.",
          "Add 'Retry On Fail' to the Slack node (three attempts, a few seconds apart) so a single 429 from Slack's rate limiter does not lose a batch. Slack allows roughly one message per second per channel; a query returning 200 rows should be batched into one message, not looped into 200.",
        ],
      },
      {
        h: "Going the other way: Slack to PostgreSQL",
        p: [
          "The reverse direction starts with a Slack Trigger subscribed to the events you care about (message posted, reaction added, slash command) and ends with a Postgres node performing an insert or upsert. The Slack Trigger needs its Request URL registered in your Slack app's Event Subscriptions, and Slack requires that URL to answer its verification challenge - so activate the workflow in n8n before you paste the URL into Slack, not after.",
          "Insert into a table with a unique constraint on the Slack message timestamp and use the Postgres node's upsert operation. Slack retries deliveries it thinks failed, and without that constraint a slow workflow quietly writes the same message three times.",
        ],
      },
    ],
  },
  {
    slug: "airtable",
    nodes: ["Airtable Trigger / Schedule Trigger", "Airtable", "Set", "Airtable"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "Airtable has a first-party n8n node covering search, create, update, upsert and delete, plus an Airtable Trigger that polls a table for new or changed records. Almost every Airtable automation is some arrangement of: trigger, search for a matching record, transform fields with a Set or Code node, then update or upsert.",
          "The Airtable Trigger polls - it does not receive a push - so its interval is the floor on how quickly the workflow reacts. Set it to the slowest interval you can tolerate; polling every minute across several workflows is the quickest way to hit Airtable's rate limit.",
        ],
      },
      {
        h: "Setting up the Airtable credential",
        p: [
          "Airtable retired user-level API keys in early 2024. Use a Personal Access Token created at airtable.com/create/tokens, and scope it to the specific bases the workflow touches rather than all of them.",
          "Grant only the scopes you need: data.records:read for anything that only queries, plus data.records:write to create or update, plus schema.bases:read if you want n8n to populate the table and field dropdowns instead of making you type IDs. A token missing schema.bases:read still works, but every field selector turns into a manual ID entry and the workflow becomes far harder to read later.",
          "Reference tables by ID (tblXXXXXXXX), not by name, in anything you intend to keep. Renaming a table in Airtable's UI is a one-click action that silently breaks every workflow referencing it by name.",
        ],
      },
      {
        h: "The rate limit, and how to stay under it",
        p: [
          "Airtable allows 5 requests per second per base. Exceed it and the API returns 429 and then locks that base out for 30 seconds - long enough that a single burst can fail an entire run.",
          "The fix is batching, not retrying. Airtable's create and update endpoints accept 10 records per call, so a Loop Over Items node with a batch size of 10 turns 500 single-record writes into 50 calls. Add a short wait between batches - one second is plenty - and set the Airtable node's 'Retry On Fail' so an occasional 429 recovers instead of failing the execution.",
          "If several workflows write to the same base, the limit is shared across all of them. Two workflows that each stay comfortably under the ceiling alone will still trip it when they run at the same minute of the hour, so stagger their schedules.",
        ],
      },
      {
        h: "Field types that break imports",
        p: [
          "Most Airtable errors in n8n are type mismatches rather than connection problems. A Single Select rejects any value that is not already one of its options unless the token has schema write permission and typecast is enabled. A Linked Record field expects an array of record IDs, not names - so you look the linked record up first and pass its ID. A Date field wants ISO 8601; a date rendered as DD/MM/YYYY is accepted as a string by the API and then read back wrong.",
          "Attachment fields take an array of objects with a url property, and Airtable fetches that URL itself - which means the URL has to be publicly reachable. A signed link that expires in five minutes will sometimes work and sometimes not, depending on how busy Airtable is.",
          "Computed fields - formulas, rollups, autonumber, created time - are read-only. Including one in an update payload fails the whole record, so strip them in a Set node before the write.",
        ],
      },
      {
        h: "Going the other way: n8n into Airtable as a database",
        p: [
          "Airtable is often the easiest place to park data an automation produces - scraped rows, form submissions, AI-generated summaries - because it is legible to non-technical colleagues in a way a Postgres table is not.",
          "Use the upsert operation with a column you control as the match key (an external ID, a URL, an email address) rather than create, so re-running a workflow corrects records instead of duplicating them. A base with a unique-ish key column and upsert on every write is effectively idempotent, which is what you want when a run half-fails and you need to run it again.",
        ],
      },
    ],
  },
  {
    slug: "postgresql-and-shopify",
    nodes: ["Shopify Trigger", "Shopify", "Set", "Postgres"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "The export direction - Shopify to PostgreSQL - is a Shopify Trigger (or a Schedule Trigger plus the Shopify node for backfills), a Set or Code node to flatten the order payload, and a Postgres node doing an upsert. Shopify's order object is deeply nested; the flattening step is where most of the actual work lives.",
          "Use the Shopify Trigger for anything ongoing. It registers a webhook with Shopify, so orders arrive within seconds rather than whenever a poll happens to run, and it does not burn API calls waiting for something to happen.",
        ],
      },
      {
        h: "Setting up the Shopify credential",
        p: [
          "For your own store, create a custom app in Shopify admin under Settings, Apps and sales channels, Develop apps. That gives you an Admin API access token which n8n uses as an access-token credential - simpler and more stable than the OAuth route, which exists for apps distributed to other merchants.",
          "Grant read_orders and read_products, and read_all_orders as well if you need orders older than 60 days - Shopify hides anything beyond that window from apps without it, which is why a backfill that works in a test store returns nothing on a real one.",
          "Shopify's Admin API is versioned quarterly and versions are supported for roughly a year. A workflow pinned to a version that gets retired starts failing with no code change on your side, so note which version your n8n release targets and re-test after upgrades.",
        ],
      },
      {
        h: "Designing the PostgreSQL side",
        p: [
          "Create the target table with the Shopify order ID as a unique key and use the Postgres node's upsert operation against it. Shopify sends webhooks at least once, not exactly once - a duplicate delivery is normal, not an error - so the unique constraint is what keeps a retry from becoming a second row.",
          "Store money as numeric, never as float. Shopify returns amounts as strings ('42.50'); parsing that into a double and summing a few thousand of them produces revenue totals that are subtly and unfixably wrong. Keep the currency code in its own column too, or a multi-currency store's numbers become meaningless when added up.",
          "Line items are one-to-many with the order, so they belong in their own table keyed on the order ID rather than flattened into columns. If you also want the raw payload, add a jsonb column and write the whole object into it - disk is cheap, and re-deriving a field you did not think to extract is far easier than re-fetching six months of orders.",
        ],
      },
      {
        h: "The failure you will hit first",
        p: [
          "Shopify expects a webhook endpoint to respond within five seconds. A workflow that does its database write, an enrichment call and a Slack notification inline will sometimes exceed that, at which point Shopify retries - and keeps retrying with backoff for up to 48 hours, after which it disables the webhook entirely.",
          "The fix is to make the triggered workflow do almost nothing: write the raw payload to Postgres and finish. A separate Schedule Trigger workflow then picks up unprocessed rows and does the slow work. That also gives you a replayable log - when the enrichment step has a bug, you fix it and re-run against stored rows instead of asking Shopify for the data again.",
        ],
      },
      {
        h: "Going the other way: PostgreSQL to Shopify",
        p: [
          "The reverse - pushing inventory levels or price changes from a database into Shopify - uses a Schedule Trigger, a Postgres SELECT for changed rows, and the Shopify node's update operation. Shopify's REST Admin API allows 2 requests per second on a standard plan with a leaky-bucket allowance of 40, so batch the updates and add Retry On Fail; a 429 here is expected traffic shaping, not a bug.",
        ],
      },
    ],
  },
  {
    slug: "discord-and-trello",
    nodes: ["Trello Trigger", "Trello", "IF", "Discord"],
    sections: [
      {
        h: "What connecting Trello and Discord actually does",
        p: [
          "Trello holds the board; Discord is where the team actually talks. The connection exists because nobody reloads a board to find out that something changed - so work sits in a list nobody has looked at since Tuesday, and the conversation about it happens somewhere the board never sees.",
          "Wiring them together means Trello events become Discord messages, and Discord messages become Trello cards. In practice that is five or six recognisable jobs: announce a card when it lands in a particular list (Done, Blocked, Needs review); nag when a due date passes and the card has not moved; post a once-a-day digest of the board instead of a running commentary; turn a support message or a slash command into a card so requests stop living in scrollback; and mirror checklist progress into a thread so the people discussing the work can see how far it has got.",
          "What it does not do is make Discord a project manager. Trello stays the record - the board is still where state lives - and Discord becomes the surface that tells people when the record changed. Workflows that try to invert that, keeping the real status in a channel, are the ones that end up disagreeing with the board.",
        ],
      },
      {
        h: "Which nodes you need",
        p: [
          "Both sides have first-party nodes. The common direction is a Trello Trigger watching a board or list, an IF node filtering to the cards that matter, and a Discord node posting to a channel. Going the other way, a Discord Trigger on a message or slash command feeds a Trello node that creates a card.",
          "The Trello Trigger registers a webhook against a board, a list or a single card. Watching the board gives you everything and a lot of noise - card moved, label added, comment posted - so filter early. Reading action.type in an IF node ('createCard', 'updateCard', 'commentCard') is the cheapest way to cut the volume.",
        ],
      },
      {
        h: "Setting up the Trello credential",
        p: [
          "Trello wants an API key and a token. The key comes from trello.com/power-ups/admin (Power-Up admin, then the API key section); the token is generated from that page by authorising your own account, and it is what actually carries permissions.",
          "Generate the token with read and write scope, and set the expiry deliberately. A token issued with a 30-day expiry is the single most common cause of a Trello workflow that worked for a month and then stopped without anyone changing it. If you want it to keep running, issue it as never-expiring and treat it like a password.",
          "The token inherits the permissions of the account that created it. A token made from a personal account that later loses access to the board leaves the workflow returning 401 with no obvious cause.",
        ],
      },
      {
        h: "Setting up the Discord side",
        p: [
          "For posting only, use a Discord webhook: channel settings, Integrations, Webhooks, New Webhook, copy the URL. n8n's Discord node accepts it directly, it takes seconds to set up, and it cannot read messages or do anything beyond posting to that one channel.",
          "Use a bot token instead when the workflow needs to read messages, react, manage threads, or be triggered by Discord events. That means creating an application in the Discord developer portal, adding a bot user, enabling the Message Content intent if you need message text, and inviting the bot to the server with the right permissions. Discord treats message content as privileged data; without that intent enabled, message bodies arrive empty and the workflow looks broken while everything else appears fine.",
          "Discord rejects messages over 2000 characters outright. A card description pasted straight into a message will eventually hit that, so truncate in a Set node, or use an embed - embed descriptions allow 4096 - and put a link back to the card rather than its full text.",
        ],
      },
      {
        h: "Keeping the channel readable",
        p: [
          "A board of any size will produce more events than a channel can absorb. Filter to a specific list ID (the 'Done' list, or an escalation list) rather than the whole board, so the channel carries one meaningful kind of update instead of an activity log.",
          "Trello fires an update action for every field change, including ones nobody cares about. Comparing the action's data.old object against the new value in an IF node - and only continuing when the field that changed is the one you are reporting - removes most of the noise without losing anything.",
          "For high-traffic boards, collect events across an interval and post one digest on a Schedule Trigger instead of one message per card. Five updates in a single message is read; five separate messages is muted.",
        ],
      },
      {
        h: "Going the other way: Discord to Trello",
        p: [
          "A Discord Trigger listening for a slash command or a specific reaction emoji, feeding a Trello node's create-card operation, turns a support channel into an intake queue. Put the Discord message ID in the card description so the card links back to the conversation.",
          "Discord's interaction endpoints expect a response within three seconds. If card creation is slow, acknowledge the command immediately and do the Trello work afterwards, or the user sees an interaction-failed error even though the card was created.",
        ],
      },
      {
        h: "If none of the six templates is quite your case",
        p: [
          "This pairing has a short list here, and that is a fair reflection of it: Trello-to-Discord is a small, well-defined problem, and the whole graph is usually four nodes. There is not a hundred genuinely different workflows to be had, and a page claiming otherwise would be padding.",
          "The practical consequence is that adapting is easy. Almost every difference between one of these workflows and the one you want is a parameter, not a redesign: the board or list ID on the trigger, the action.type you filter on in the IF node, the channel on the Discord node, and whether the message is plain text or an embed. Import the closest one, change those four things, and you are done - that is a five-minute edit, not a rebuild.",
          "If you need the Discord side wired to something with more depth behind it, the pairings below share one of these two tools and have far more ready-made workflows. And if the workflow you want genuinely does not exist, a custom build is a fixed quote rather than a subscription.",
        ],
      },
    ],
  },
  {
    slug: "asana-and-discord",
    nodes: ["Asana Trigger", "Asana", "Set", "Discord"],
    sections: [
      {
        h: "What connecting Asana and Discord actually does",
        p: [
          "Asana is where work is assigned and dated; Discord is where the team is actually present. Asana's own notifications go to email and to an inbox most people declare bankruptcy on, so the common complaint is not that nobody was told - it is that being told did not reach anyone.",
          "Connecting the two moves the signal to where people already are. The jobs worth automating are narrower than they first look: announce when a task is completed or moves into a section that means something (In review, Blocked, Ready to ship); alert the channel when a task is assigned to the team rather than to a person; warn on tasks whose due date has passed while still incomplete; and take requests raised in a channel and file them as real tasks with a workspace, a project and an assignee, so they stop being a message someone promised to remember.",
          "Asana differs from a card-based tracker here in a way that shapes the workflow: its events carry a task GID and almost nothing else, so every useful message requires a second call to fetch the task before it can be written. That single fact is why an Asana-to-Discord workflow is a node or two longer than it looks like it should be, and why filtering matters more - each event you fail to discard costs an API call as well as a message.",
        ],
      },
      {
        h: "Which nodes you need",
        p: [
          "n8n has first-party Asana and Discord nodes. The standard shape is an Asana Trigger on a project, a Set node building a readable message, and a Discord node posting it. The reverse - creating an Asana task from a Discord message - is a Discord Trigger into the Asana node's task-create operation.",
          "Asana's events are deliberately thin. A webhook tells you a task changed and gives you its GID; it does not tell you what the task now says. So the Asana node almost always appears twice: once implicitly in the trigger, and once immediately after it fetching the full task by GID before you can build a message from it.",
        ],
      },
      {
        h: "Setting up the Asana credential",
        p: [
          "A Personal Access Token from Asana's developer console is the quickest route and the right one for automations you own; OAuth2 is for apps acting on behalf of other people. The token carries your own permissions, so it can only see projects your account can see - a workflow that returns an empty task list is usually looking at a project the token's owner was never added to.",
          "Asana rate-limits at 150 requests per minute for free plans and 1500 for paid ones, per token. Fetching the full task for every event on a busy project can approach the free-plan ceiling faster than expected; batching and a Retry On Fail on the Asana node handle it.",
        ],
      },
      {
        h: "Making Asana webhooks stay alive",
        p: [
          "Asana's webhook handshake is stricter than most. When you register one, Asana immediately sends a request carrying an X-Hook-Secret header and expects that exact header echoed back within seconds. n8n's Asana Trigger does this for you - but only when the workflow is active and the production URL is reachable from the internet. Registering while testing against a local n8n, or against a URL behind auth, leaves a webhook that never delivers.",
          "Asana also disables webhooks that fail repeatedly, and it does not announce it. If a workflow stops receiving events after an n8n restart or a domain change, re-save and re-activate the trigger to force re-registration rather than looking for a bug in the workflow.",
          "Filter on resource type and action inside the workflow. A project-level webhook fires on subtask changes, comment additions and field edits, and posting all of them to Discord makes the channel unusable within a day.",
        ],
      },
      {
        h: "Formatting the Discord message",
        p: [
          "Asana's task notes are HTML, not plain text or Markdown. Passing them straight to Discord produces visible <body> and <strong> tags. Strip them in a Code node, or send only the task name and a permalink and let people click through - the second option is almost always the better one.",
          "Build the permalink as https://app.asana.com/0/<project_gid>/<task_gid>; both GIDs are on the fetched task object. A message that is a task name, an assignee and a working link is more useful than one that tries to reproduce the task inside Discord.",
        ],
      },
      {
        h: "Going the other way: Discord to Asana",
        p: [
          "A Discord Trigger on a slash command feeding the Asana node's create-task operation turns requests posted in a channel into tracked work. Set the workspace and project explicitly - Asana requires a workspace GID on create, and the error when it is missing names neither field.",
          "Put the Discord message link in the task notes so the task carries its own context, and post the created task's permalink back to the channel so the person who asked can follow it.",
        ],
      },
      {
        h: "Building on four templates",
        p: [
          "Four ready-made workflows is a small set, and it is worth being straight about why: the Asana-to-Discord shape barely varies. Trigger, fetch the task by GID, filter, format, post. Once you have that skeleton, the difference between one useful workflow and another is which project it watches and which events it keeps - not a different architecture.",
          "So treat these as a working skeleton rather than a catalogue. The parts you will change are the project GID on the trigger, the resource and action values you filter on, the fields you lift into the message in the Set node, and the destination channel. The awkward parts - the webhook handshake, the second fetch, stripping HTML out of task notes - are already solved in the file, and those are the parts that cost an afternoon when you start from an empty canvas.",
          "Where Asana itself is the limit rather than the template, note that its free plan rate-limits at 150 requests a minute and its events do not include field-level detail, so anything wanting a full audit trail belongs on a schedule reading the task list rather than on a webhook. If you want more inventory to work from, the pairings below share one of these two tools and have considerably more behind them.",
        ],
      },
    ],
  },
  {
    slug: "discord-and-notion",
    nodes: ["Notion Trigger / Schedule Trigger", "Notion", "Set", "Discord"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "Both have first-party nodes. Notion to Discord is a Notion Trigger (or a Schedule Trigger plus a Notion database query), a Set node shaping the message, and a Discord node. Discord to Notion is a Discord Trigger feeding the Notion node's create-database-page operation.",
          "Notion's trigger polls rather than pushes - Notion has no general-purpose outbound webhook for database changes - so reaction time is bounded by the poll interval, and 'instant' is not on the table. For anything time-sensitive, have the human action write to Notion through n8n rather than waiting to notice a Notion change.",
        ],
      },
      {
        h: "Setting up the Notion credential",
        p: [
          "Create an internal integration at notion.so/my-integrations and use its secret as an API-key credential in n8n. Then - and this is the step everyone misses - open the Notion page or database itself, use the ... menu, Connections, and add your integration to it.",
          "A Notion integration has access to nothing by default. The credential tests green, the API answers, and every query returns an empty result until the page is explicitly shared with the integration. If your Notion node returns no rows from a database you can plainly see in your browser, this is why, essentially every time.",
          "Sharing a parent page shares its children, so connecting the integration to a top-level workspace page is usually less maintenance than connecting each database individually.",
        ],
      },
      {
        h: "Notion property types that trip you up",
        p: [
          "The Notion API's property model is verbose and unforgiving. Title and Rich Text are arrays of rich-text objects, not strings; Select needs a name that already exists unless the integration may create options; Relation takes page IDs; People takes Notion user IDs, which are not email addresses. Multi-select rejects any value containing a comma, silently.",
          "Formula, rollup, created-time and last-edited-time properties are read-only and fail the whole page update if included. Build the payload in a Set node listing only writable properties rather than passing an object through from upstream.",
          "Notion's API allows roughly three requests per second per integration and returns 429 with a Retry-After header above it. Enable Retry On Fail on the Notion node; it honours the header, which is enough for most workflows.",
        ],
      },
      {
        h: "Going the other way: Discord to Notion",
        p: [
          "Capturing a Discord message into a Notion database is one of the more useful small automations - a bug reported in a channel becomes a row in a tracker without anyone retyping it.",
          "Use a reaction as the trigger rather than every message: a Discord Trigger filtered on a specific emoji means a human decides what gets captured, which keeps the database clean without any filtering logic on your side. Store the Discord message ID as a text property so re-reacting updates the existing row rather than adding a second one.",
        ],
      },
    ],
  },
  {
    slug: "airtable-and-discord",
    nodes: ["Airtable Trigger", "Airtable", "IF", "Discord"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "An Airtable Trigger polling a view, an IF node narrowing to the records worth announcing, and a Discord node posting - webhook for a single channel, bot token if the workflow also needs to read or react.",
          "Point the trigger at a *view*, not the whole table. An Airtable view is a saved filter, so 'records where Status is Ready and Owner is set' becomes a configuration in Airtable that non-technical colleagues can adjust, rather than logic buried in an n8n IF node that only you can change.",
        ],
      },
      {
        h: "Credentials, briefly",
        p: [
          "Airtable needs a Personal Access Token scoped to the base, with data.records:read at minimum and schema.bases:read if you want field dropdowns to populate. Discord needs either a channel webhook URL (post-only) or a bot token with the Message Content intent if it must read anything.",
          "Both are covered in more depth on the Airtable and Discord integration pages; the pairing itself adds no extra credential requirements.",
        ],
      },
      {
        h: "The duplicate-notification problem",
        p: [
          "Airtable's trigger fires on record creation and on modification, and 'modification' includes changes made by your own workflow. A workflow that posts to Discord and then writes a 'Notified at' timestamp back to Airtable will trigger itself, post again, write again, and loop.",
          "Break the cycle in the view: filter the view to records where the notified field is empty. Writing the timestamp then removes the record from the view instead of re-triggering it. This is more reliable than trying to detect your own edits, because Airtable's change payload does not clearly attribute who made the change.",
          "If you would rather not add a field, keep a Notified checkbox and have the IF node check it before the Discord node - but the view filter is the version that still works when someone edits a record by hand.",
        ],
      },
      {
        h: "Going the other way: Discord to Airtable",
        p: [
          "A Discord Trigger into the Airtable node's upsert operation, matching on the Discord message ID, turns channel activity into rows without duplicating on retries. Attachments need care: Airtable fetches attachment URLs itself, and Discord's CDN links now carry expiring signatures, so download the file and re-host it somewhere stable before handing Airtable the URL.",
        ],
      },
    ],
  },
  {
    slug: "mysql-and-slack",
    nodes: ["Schedule Trigger", "MySQL", "IF", "Slack"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "n8n's MySQL node handles queries, inserts, updates and deletes against MySQL and MariaDB. There is no MySQL trigger node, so the workflow always starts with a Schedule Trigger (or a webhook from your application) and polls.",
          "The usual shape: Schedule Trigger, MySQL node running a SELECT, an IF node so an empty result posts nothing, then Slack. Skipping the IF node is why teams end up with a channel receiving 'no rows' every fifteen minutes.",
        ],
      },
      {
        h: "Setting up the MySQL credential",
        p: [
          "Host, port 3306, database, user, password - and a dedicated user rather than root. Grant SELECT on the specific tables the workflow reads; a reporting workflow has no business holding DROP.",
          "Managed MySQL (PlanetScale, Amazon RDS, Aiven) requires TLS, so enable SSL on the credential. Self-hosted n8n also needs to be allowlisted at the database's firewall - a connection that times out rather than being refused is almost always this rather than a wrong password.",
          "MySQL 8 defaults to the caching_sha2_password auth plugin. Older client stacks fail against it with an authentication-plugin error; either upgrade the n8n image or create the user with mysql_native_password. That error message names the plugin, which makes it one of the easier problems to identify once you have seen it once.",
        ],
      },
      {
        h: "Writing the query so the message is useful",
        p: [
          "Do the aggregation in SQL, not in n8n. A query that returns one row with the numbers you want makes the Slack step trivial; returning 5,000 rows and summing them in a Code node is slower, uses more memory, and breaks quietly when the result set grows.",
          "Always put a LIMIT on a query feeding a notification. A missing WHERE clause against a large table will pull the table into n8n's memory and fail the execution in a way that looks like an n8n bug rather than a query bug.",
          "Use query parameters rather than string-concatenating values from earlier nodes. n8n's MySQL node supports parameterised queries, and it is the difference between a workflow that handles an apostrophe in a customer name and one that does not.",
        ],
      },
      {
        h: "Avoiding repeat alerts",
        p: [
          "The same discipline as any polling workflow: track a high-water mark. Keep an auto-increment ID or an updated_at column, query for rows past the last processed value, and persist that value - in the database, not in workflow static data, so a re-import does not replay history.",
          "For threshold alerts (queue depth, error count) the mark is a state rather than a row: only post when the state changes from OK to breached, and post a recovery message when it changes back. Posting on every poll while the threshold is breached is how alerting channels get muted.",
        ],
      },
      {
        h: "Going the other way: Slack to MySQL",
        p: [
          "A Slack Trigger on a slash command into a MySQL insert gives you a lightweight logging or intake path - standups, incident notes, on-call handovers - without a form. Validate and parameterise the input; a slash command body is user input from the internet, and it reaches your database.",
        ],
      },
    ],
  },
  {
    slug: "discord-and-hubspot",
    nodes: ["HubSpot Trigger", "HubSpot", "Set", "Discord"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "A HubSpot Trigger on a contact or deal event, a HubSpot node to fetch the full record, a Set node to build the message, and a Discord node to post it. As with Asana, the trigger payload identifies the object rather than describing it, so the fetch step is not optional.",
          "The reverse direction - a Discord Trigger creating or updating a HubSpot contact - uses the HubSpot node's create-or-update contact operation, which upserts on email and saves you a lookup.",
        ],
      },
      {
        h: "Setting up the HubSpot credential",
        p: [
          "HubSpot removed API keys at the end of 2022. Use a Private App: HubSpot settings, Integrations, Private Apps, create one, and copy its access token into n8n's HubSpot App Token credential. OAuth2 exists for apps installed into other people's portals.",
          "Grant scopes narrowly - crm.objects.contacts.read and crm.objects.deals.read for a notifier, adding the matching .write scopes only if the workflow modifies records. A missing scope produces a 403 that names the scope required, which makes this one of the friendlier errors to debug.",
          "HubSpot's Private App webhooks are configured in the HubSpot app itself, not in n8n. Paste n8n's production webhook URL into the app's Webhooks tab and subscribe to the specific events you want; the trigger will sit silent forever if that subscription is missing.",
        ],
      },
      {
        h: "Custom properties and the shape of the payload",
        p: [
          "HubSpot returns only default properties unless you ask for more. If a custom property is missing from your Discord message, the cause is almost always that the HubSpot node's properties list does not include it - not that the value is empty.",
          "Custom property names in the API are internal names, not the labels shown in the UI. A property labelled 'Lead Score' may be internally lead_score, or score__c, or a hash if it was created by an import. Check the internal name in HubSpot's property settings rather than guessing from the label.",
          "Deal stage and pipeline arrive as IDs, not names. Mapping those IDs to readable names in a Set node is what separates a Discord message saying 'moved to 1234567' from one saying 'moved to Contract Sent'.",
        ],
      },
      {
        h: "Not turning a sales channel into a firehose",
        p: [
          "A propertyChange subscription on contacts fires for every field edit, including ones made by HubSpot's own enrichment. Subscribe to the specific properties that matter - lifecycle stage, deal stage, owner - rather than to all changes.",
          "For deal notifications, filter on amount as well as stage. 'Deal moved to Closed Won' is worth a message for a five-figure deal and worth a weekly summary for a trial upgrade, and one IF node is the whole difference.",
        ],
      },
      {
        h: "Going the other way: Discord to HubSpot",
        p: [
          "A Discord slash command that captures an email address and creates a contact is useful for community-led teams, but treat the input as untrusted: validate the email format before the HubSpot node, and set a source property so these contacts are distinguishable from form fills later. HubSpot's create-or-update operation matching on email keeps repeated commands from creating duplicates.",
        ],
      },
    ],
  },
  {
    slug: "google-drive-and-notion",
    nodes: ["Google Drive Trigger", "Google Drive", "Extract from File", "Notion"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "A Google Drive Trigger watching a folder, a Google Drive node downloading the file, an Extract from File node turning it into text, and a Notion node creating a page. This is the backbone of most document-intake automations, with an AI node optionally sitting between extraction and Notion to summarise.",
          "The Drive trigger can watch a specific folder or the whole drive. Watch a folder - a designated inbox folder makes the automation legible to everyone using it, and keeps the workflow from firing on unrelated files.",
        ],
      },
      {
        h: "Setting up the Google Drive credential",
        p: [
          "OAuth2 is the practical choice. In Google Cloud Console, enable the Drive API, create an OAuth client with n8n's redirect URL, and connect it in n8n. While the consent screen is in Testing mode, refresh tokens expire after seven days - which is why a Drive workflow reliably stops working a week after setup. Publish the app, or accept re-authorising weekly.",
          "drive.readonly is enough to watch and download. Use the full drive scope only if the workflow moves or renames files - for example moving a processed file to a Done folder, which is a good pattern because it makes 'what has been handled' visible in the folder rather than only in n8n's execution log.",
          "A service account is the better fit for shared drives and unattended operation, but it only sees files explicitly shared with its address, and files it creates are owned by the service account rather than by anyone in your organisation.",
        ],
      },
      {
        h: "Getting text out of the file",
        p: [
          "Extract from File handles PDF, CSV, XLSX, DOCX and plain text. Native Google formats - Docs, Sheets, Slides - are not files in the ordinary sense and have to be exported first: the Google Drive node's download operation lets you choose a conversion target, so export a Doc as text or a Sheet as CSV before extraction.",
          "Scanned PDFs contain images, not text, and extraction returns empty output rather than an error. If the source is scanned documents, an OCR step - a vision-capable AI node or an external OCR API - is required, and the workflow should check for empty text and route those files somewhere a human will see them.",
          "Large files are held in memory. A 200MB video dropped into a watched folder will fail the execution; filter on MIME type early so the workflow only downloads what it can actually process.",
        ],
      },
      {
        h: "Writing into Notion cleanly",
        p: [
          "Notion's API caps a rich-text block at 2000 characters and a single request at 100 blocks. Extracted document text routinely exceeds both, so split it into chunks in a Code node and append them in batches rather than sending one enormous page-create call.",
          "Store the Drive file ID as a property on the Notion page. That makes the workflow idempotent - query Notion for the file ID before creating, and update the existing page instead of adding a second one when Drive re-fires for the same file, which it does after any edit.",
          "Remember the integration-sharing step: the Notion database must be explicitly connected to your integration through the ... menu, Connections, or every write fails with an object-not-found error against a database you can see perfectly well in the browser.",
        ],
      },
      {
        h: "Going the other way: Notion to Google Drive",
        p: [
          "Exporting Notion pages into Drive - as a backup, or to hand a document to someone outside the workspace - is a Notion node reading blocks, a Code node rendering them to Markdown or HTML, a Convert to File node, and a Drive upload. Notion returns blocks in pages of 100, so paginate; a long page silently truncates otherwise.",
        ],
      },
    ],
  },
  {
    slug: "google-sheets-and-slack",
    nodes: ["Google Sheets Trigger / Schedule Trigger", "Google Sheets", "IF", "Slack"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "Both sides are first-party nodes, so nothing here needs an HTTP Request node. The common shape is a Google Sheets Trigger (or a Schedule Trigger plus a Google Sheets 'Get Row(s)' node), an IF or Filter node to decide which rows are worth reporting, and a Slack node posting the result.",
          "The Google Sheets Trigger polls rather than subscribing - Google does not push spreadsheet edits - so it fires on an interval, not instantly. It watches for 'Row Added' or 'Row Updated' on one named sheet within one document. If you need to watch several tabs, that is one trigger per tab, or a Schedule Trigger reading each range in turn.",
        ],
      },
      {
        h: "Setting up the Google Sheets credential",
        p: [
          "Two options, and the right answer depends on who owns the spreadsheet. OAuth2 signs in as you and inherits whatever you can already open - fastest on n8n Cloud, where the redirect URL is filled in for you. A service account is the better choice for anything unattended, because it does not break when the person who authorised it leaves or changes their password.",
          "The service account failure that costs people an afternoon: the sheet is not shared with it. A service account has its own identity, so open the JSON key, copy the client_email value (it ends in .iam.gserviceaccount.com), and share the spreadsheet with that address as you would with a colleague - Editor if the workflow writes, Viewer if it only reads. Until you do, every call returns a 403 even though the credential itself tests fine.",
          "Self-hosted n8n on OAuth2 also needs the Google Sheets API and the Google Drive API enabled in your Google Cloud project, and the exact n8n callback URL registered as an authorised redirect URI. Sheets alone is not enough - the node uses Drive to resolve documents by name, so a Drive-less project fails at the document picker rather than at the sign-in.",
        ],
      },
      {
        h: "Reading the rows you actually want",
        p: [
          "The node returns one n8n item per row, using the header row for field names. Keep headers short and stable: renaming a column silently changes the field name every downstream node references, which surfaces as an empty Slack message rather than an error.",
          "Filter in the sheet range where you can, not in n8n. Pulling A1:Z10000 to keep three rows costs quota on every run and makes the workflow slower to debug. Give the node an explicit range, or use its filter/lookup options to match a column value.",
          "Empty trailing rows are the other quiet problem. Google returns rows that look blank but exist, so a run can produce a burst of items whose fields are all empty strings. An IF node checking that your key column is non-empty, placed immediately after the read, prevents a Slack channel full of blank messages.",
        ],
      },
      {
        h: "Not posting the same row twice",
        p: [
          "A Schedule Trigger re-reads the same range on every run, so anything matching your condition is reported again and again until someone mutes the channel.",
          "The durable fix is a status column in the sheet itself. Read only rows where 'Notified' is empty, post them, then use the Google Sheets 'Update Row' or 'Append or Update' operation to write a timestamp into that column - after the Slack node, never before. Order matters: update first and a Slack outage loses the rows for good.",
          "'Append or Update' needs a column to match on, and it has to be genuinely unique. Matching on an email address in a sheet where the same person appears twice will overwrite the wrong row. If there is no natural key, add an ID column and fill it once.",
          "Google's quota is per project and generous but not infinite - roughly 300 read requests per minute. Writing back one row at a time inside a loop is what actually trips it; use a single update with multiple rows where the operation supports it, and turn on 'Retry On Fail' for the write.",
        ],
      },
      {
        h: "Setting up the Slack credential",
        p: [
          "OAuth2 is quickest on n8n Cloud. For self-hosted, create your own Slack app and use a bot token - you pick the scopes and it does not expire with a user session.",
          "Posting needs chat:write, plus channels:read if you want to pick the channel from a dropdown instead of pasting an ID. Private channels also need groups:write and the bot must be invited to the channel with /invite @yourbot, or Slack returns not_in_channel regardless of scopes.",
          "Batch before you post. Twelve rows should be one message with twelve lines, not twelve messages - Slack allows roughly one message per second per channel, and a loop over a hundred rows will be rate-limited halfway through. Turn on 'Retry On Fail' so a single 429 does not drop the batch.",
        ],
      },
      {
        h: "Going the other way: Slack to Google Sheets",
        p: [
          "Logging Slack activity into a spreadsheet is a Slack Trigger subscribed to the events you care about, then a Google Sheets 'Append Row' node. Register the trigger's Request URL in your Slack app's Event Subscriptions, and activate the workflow in n8n before pasting the URL - Slack calls it immediately to verify it, and an inactive workflow fails that check.",
          "Slack retries deliveries it believes failed, so a slow workflow can log the same message twice. Append the Slack message timestamp (the ts field) as a column and use 'Append or Update' matching on it, which turns a duplicate delivery into a harmless overwrite.",
        ],
      },
    ],
  },
  {
    slug: "http-rest-api-and-slack",
    nodes: ["Schedule Trigger", "HTTP Request", "IF", "Slack"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "There is no 'REST API' node - the HTTP Request node is the general-purpose client you use when an API has no dedicated n8n node, or when the dedicated node does not expose the endpoint you need. Paired with Slack it covers the whole 'poll something, tell the team' category: a Schedule Trigger, an HTTP Request node calling the API, an IF node deciding whether the response is worth reporting, and a Slack node posting it.",
          "If the API can call you instead of being polled, invert the workflow: a Webhook node in place of the Schedule Trigger and HTTP Request. That removes the polling delay and the wasted calls, and it is almost always the better design when the source supports webhooks.",
        ],
      },
      {
        h: "Authenticating without pasting secrets into the URL",
        p: [
          "The HTTP Request node has a 'Predefined Credential Type' option that reuses any credential n8n already knows - so you can call an undocumented Google or HubSpot endpoint while n8n handles the OAuth refresh. Reach for that first; it is the difference between a token that renews itself and one that expires at 3am.",
          "Otherwise use Generic Credentials: Header Auth for an API key, Basic Auth for user/password, or the built-in OAuth2 flow. What you should not do is put the key in the URL as a query parameter - it ends up in n8n's execution logs, and anyone with access to the execution history can read every past run's secret.",
          "Some APIs also insist on a User-Agent header and reject requests without one, which shows up as a 403 that looks like an auth problem but is not.",
        ],
      },
      {
        h: "Handling pagination and large responses",
        p: [
          "Most list endpoints return one page. The HTTP Request node has built-in pagination that handles the common patterns - a cursor in the response body, a Link header, or an incrementing page parameter - and it is worth configuring rather than building a manual loop.",
          "Always set a maximum page count. A pagination rule with a condition that never becomes false will loop until the execution times out, and against a rate-limited API that is also the fastest way to get your key suspended.",
          "By default the node parses JSON into items. If the endpoint returns a file, a CSV or XML, set the response format accordingly - otherwise you get one item containing a string blob and every downstream expression resolves to undefined.",
        ],
      },
      {
        h: "Making failures visible instead of silent",
        p: [
          "By default a 4xx or 5xx stops the execution. That is usually right for a workflow you watch, and wrong for one that runs hourly - a single blip leaves you with nothing in Slack and no indication anything happened.",
          "Turn on 'Always Output Data' plus the option to never error on HTTP status codes, then branch on the status code with an IF node: success posts the result, failure posts the error to a Slack channel. An alert that says the API returned 503 is far more useful than silence.",
          "Set 'Retry On Fail' with two or three attempts for transient errors, and a request timeout - the default wait on a hanging endpoint is long enough to stack executions on top of each other.",
        ],
      },
      {
        h: "Posting the result to Slack",
        p: [
          "The bot token needs chat:write, plus channels:read to pick channels from a dropdown, and groups:write plus an /invite for private channels.",
          "For a single-channel notification you do not strictly need the Slack node at all - an Incoming Webhook URL called from a second HTTP Request node with a JSON body works, cannot read anything, and is a small blast radius if the URL leaks.",
          "Keep API payloads out of the message. Posting a raw JSON response into Slack is unreadable and can leak fields you did not intend to share; use a Set node to pull out the three values that matter and format those.",
        ],
      },
    ],
  },
  {
    slug: "google-sheets-and-http-rest-api",
    nodes: ["Schedule Trigger", "HTTP Request", "Set", "Google Sheets"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "This is the 'pull data from an API into a spreadsheet' pattern: a Schedule Trigger, an HTTP Request node fetching the data, a Set or Code node flattening it, and a Google Sheets node appending or updating rows. The reverse - reading a sheet and calling an API per row - is the same nodes in the opposite order.",
          "Use the HTTP Request node when the source has no dedicated n8n node, or when the dedicated node is missing the endpoint you need. If a first-party node exists and covers it, prefer it: it handles token refresh and pagination for you.",
        ],
      },
      {
        h: "Flattening the response before it reaches the sheet",
        p: [
          "A spreadsheet is flat and JSON is not, and this is where most of these workflows break. The Google Sheets node maps top-level fields to columns; a nested object arrives as [object Object] and an array arrives as a comma-smashed string.",
          "Put a Set node between the API call and the sheet and map each column explicitly - customer_name from {{ $json.customer.name }}, and so on. It is more typing than passing everything through, and it means a change in the API's response shape shows up as one empty column rather than a corrupted sheet.",
          "If the response nests the actual list inside a wrapper - data, results, items - use a Split Out node on that field first, so you get one n8n item per record and therefore one row per record. Without it the whole array lands in a single row.",
        ],
      },
      {
        h: "Pagination, and not writing 10,000 rows one at a time",
        p: [
          "Configure the HTTP Request node's built-in pagination rather than looping by hand, and always set a maximum page count - a rule whose stop condition never fires will run until the execution times out.",
          "Then write in batches. Appending row by row inside a loop is the single most common cause of hitting Google's quota, which is roughly 300 requests per minute per project. Passing all items to one Google Sheets 'Append' node sends them as one call.",
          "For genuinely large pulls, add a Loop Over Items node with a batch size in the hundreds and a short Wait between batches. Slower by design, and it finishes - unlike the version that gets a 429 at row 4,000 and loses everything after it.",
        ],
      },
      {
        h: "Keeping the sheet in sync instead of just growing it",
        p: [
          "'Append' adds rows forever, so a workflow that re-fetches the same 500 records every morning produces a sheet with 15,000 rows by the end of the month. 'Append or Update' with a matching column is what you usually want - it updates the record if the key already exists and adds it if not.",
          "The matching column has to be a real unique key from the source: an ID from the API, not a name or an email that can repeat. If the API has no stable ID, build one in the Set node by concatenating two fields that together are unique.",
          "Add a 'synced_at' column filled with {{ $now }} on every write. When someone asks whether the numbers are current, that column answers it without anyone having to open the execution log.",
        ],
      },
      {
        h: "Going the other way: sheet rows into an API",
        p: [
          "Reading a sheet and calling an endpoint per row is a Google Sheets read, an IF node filtering to unprocessed rows, an HTTP Request node, then a write-back marking the row done. Write the status back after the call succeeds, so a failure mid-run leaves the remaining rows to be picked up next time rather than skipped.",
          "Rate-limit yourself on the API side too. A sheet with 2,000 rows becomes 2,000 requests as fast as n8n can issue them, which many APIs treat as an attack; a Loop Over Items node with a modest batch size and a Wait node between batches keeps you inside the limit.",
        ],
      },
    ],
  },
  {
    slug: "notion-and-slack",
    nodes: ["Notion Trigger / Schedule Trigger", "Notion", "IF", "Slack"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "Both are first-party nodes. The usual shape is a Notion Trigger (or a Schedule Trigger plus a Notion 'Get Many Database Pages' node), an IF node filtering to the pages worth announcing, and a Slack node posting them.",
          "The Notion Trigger polls - Notion's API has no outbound webhooks for this - so it checks on an interval for pages added or updated in one database. Expect a delay of up to your polling interval rather than an instant post.",
        ],
      },
      {
        h: "The Notion credential, and the mistake everyone makes first",
        p: [
          "Create an internal integration in Notion's developer settings and paste its Internal Integration Token into n8n. That part is easy. The part that catches everyone: creating the integration does not give it access to anything.",
          "You have to share each database or page with the integration explicitly - open it in Notion, use the connections menu, and add your integration by name. Until you do, the credential tests successfully and every query returns an empty list or object_not_found, which reads like a broken workflow rather than a permissions problem. Sharing a parent page shares everything nested under it, which is the least tedious way to do it.",
          "Capabilities matter too: an integration with read access only will fail on any node that writes, with an error that names the capability rather than the page.",
        ],
      },
      {
        h: "Getting properties out of a Notion page",
        p: [
          "Notion's property model is the other source of friction. Every property is an object with a type, not a bare value - a title is an array of rich-text objects, a select is an object with a name, a person is an array of user objects. Referencing {{ $json.Name }} and getting [object Object] is the normal first result.",
          "The n8n node simplifies much of this, but for anything unusual the reliable move is to run the node once, open the output panel, and copy the actual path to the value you want rather than guessing at it.",
          "Rich text also has a 2,000-character limit per block. Pasting a long summary into a single text property fails validation; split it across blocks, or truncate deliberately so the failure is yours rather than the API's.",
        ],
      },
      {
        h: "Filtering, and not re-announcing the same page",
        p: [
          "Filter in the Notion query rather than pulling the whole database and filtering in n8n - the node exposes Notion's filter options, and a database with a few thousand pages is slow and quota-hungry to fetch in full.",
          "For the duplicate problem, use the database itself as the memory. Add a checkbox property such as 'Announced', query for pages where it is false, post them, then update the property in a second Notion node placed after the Slack node. Because the state lives in Notion, re-importing the workflow does not replay a month of pages.",
          "Notion's API is rate-limited to roughly three requests per second on average. Updating pages one at a time in a loop over a large result set will hit it, so keep batches small and enable 'Retry On Fail'.",
        ],
      },
      {
        h: "Going the other way: Slack to Notion",
        p: [
          "Capturing Slack messages as Notion pages is a Slack Trigger - often on a reaction or a slash command rather than every message - followed by a Notion 'Create Database Page' node. Triggering on a specific emoji reaction is the version people actually keep: it makes saving deliberate instead of logging everything.",
          "Map the Slack permalink into a URL property. Without it the Notion page has no route back to the conversation it came from, which is the first thing anyone reading it later wants.",
        ],
      },
    ],
  },
  {
    slug: "hubspot-and-slack",
    nodes: ["HubSpot Trigger / Schedule Trigger", "HubSpot", "IF", "Slack"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "Both are first-party nodes. Most of these workflows are a HubSpot Trigger or a Schedule Trigger, a HubSpot node fetching the records, an IF node applying whatever rule makes something worth interrupting people for, and a Slack node posting it.",
          "The HubSpot Trigger uses HubSpot's webhooks, which are configured on a developer app rather than on your portal - so it needs a HubSpot developer account, not just a private app token. If that is more setup than the job deserves, a Schedule Trigger polling the search endpoint every fifteen minutes is a legitimate substitute.",
        ],
      },
      {
        h: "Setting up the HubSpot credential",
        p: [
          "Use a private app access token. HubSpot's old API keys were sunset years ago, so any tutorial telling you to paste an hapikey is out of date and will not work.",
          "Create the private app in your HubSpot account settings under Integrations, then grant it only the scopes the workflow needs - crm.objects.contacts.read for reading contacts, the matching .write scope only if it writes. A missing scope surfaces as a 403 naming the scope, which is one of the more helpful errors in this stack.",
          "OAuth2 is the other option and is worth it only if you are building something that other HubSpot accounts will install. For your own portal, the private app token is less setup and does not expire.",
        ],
      },
      {
        h: "Deal stages, owners and the IDs behind the labels",
        p: [
          "HubSpot shows labels in its UI and stores IDs in its API. A deal stage you see as 'Contract Sent' arrives as a numeric ID, and a filter written against the label silently matches nothing.",
          "Fetch the pipelines once, note the stage IDs, and write the filter against those. The same is true of owners - the record carries hubspot_owner_id, not a name - so posting a useful Slack message usually means a second HubSpot node resolving that ID to a person.",
          "Custom properties are only returned if you ask for them by their internal name, which is not always what the label suggests. Check the internal name in HubSpot's property settings rather than inferring it.",
        ],
      },
      {
        h: "Not announcing the same deal twice",
        p: [
          "A polling workflow re-runs the same search each time, so every matching record is reported again on every run.",
          "The cleanest fix uses HubSpot as the memory: add a custom property such as 'slack_notified', exclude records where it is set, and write it back with a HubSpot update node placed after the Slack node. Filtering on lastmodifieddate alone is not enough on its own - any unrelated edit makes a record look new again.",
          "HubSpot allows roughly 100 requests per 10 seconds on standard plans and its search endpoint is more tightly limited than the rest. Batch the Slack side into one message rather than looping, and enable 'Retry On Fail' on the HubSpot nodes.",
        ],
      },
      {
        h: "Going the other way: Slack to HubSpot",
        p: [
          "Creating or updating CRM records from Slack is a Slack Trigger - usually a slash command or a form-style modal - feeding a HubSpot 'Create or Update Contact' node. Use the create-or-update operation rather than create: HubSpot deduplicates contacts by email, and a plain create against an existing email returns a conflict error.",
          "Post a confirmation back into the same Slack thread with the record's URL. Without it nobody can tell whether the command worked, and the usual response is to run it again.",
        ],
      },
    ],
  },
  {
    slug: "http-rest-api-and-hubspot",
    nodes: ["Schedule Trigger", "HubSpot", "HTTP Request", "Set"],
    sections: [
      {
        h: "When to use the HTTP Request node with HubSpot",
        p: [
          "n8n's HubSpot node covers contacts, companies, deals, tickets and engagements. Use it wherever it fits. The HTTP Request node is for the rest of the API - custom objects, associations v4, the properties API, quotes, or anything HubSpot shipped after the node was last extended.",
          "You do not need a second credential for this. Set the HTTP Request node's authentication to 'Predefined Credential Type' and choose your existing HubSpot credential, and n8n signs the request for you. That is much better than pasting a token into a header by hand, which then has to be rotated in several places.",
        ],
      },
      {
        h: "Exporting HubSpot records as JSON",
        p: [
          "The endpoint that does the work is POST /crm/v3/objects/{object}/search - it takes a JSON body with filterGroups, the properties you want returned, and a limit of up to 100 per page. A plain GET on the objects endpoint works too but cannot filter.",
          "Ask for properties explicitly. HubSpot returns a thin default set, so a request that does not list the properties it wants comes back missing most of the fields you were trying to export, which looks like empty data rather than an incomplete request.",
          "The search endpoint caps out at 10,000 results for any single query, no matter how you paginate. For a full export, slice by a date range - createdate between two values - and run the query once per slice, rather than trying to page past the ceiling.",
          "To write the result out as a file, pass the items into a Convert to File node in JSON mode; that produces something you can attach to an email, drop into Drive, or hand to another system.",
        ],
      },
      {
        h: "Pagination the way HubSpot does it",
        p: [
          "HubSpot uses a cursor, not page numbers. The response carries paging.next.after, and the next request sends that value as the after parameter. When paging.next is absent you are done.",
          "The HTTP Request node's built-in pagination handles this - set it to use the response body's paging.next.after value and stop when that field is empty. Always set a maximum page count as a backstop, because a stop condition that never becomes true will loop until the execution times out.",
          "Keep the page size at 100 and expect roughly 100 requests per 10 seconds of headroom. A 50,000-record export is a few minutes of paging, so give the workflow a realistic timeout rather than assuming it finished when it was actually killed.",
        ],
      },
      {
        h: "Flattening before anything downstream sees it",
        p: [
          "Every record comes back wrapped: the fields you care about are under a properties object, alongside id, createdAt and archived. So {{ $json.email }} is undefined and {{ $json.properties.email }} is what you meant.",
          "Use a Split Out node on the results array to get one item per record, then a Set node to lift the properties you want to the top level. Do this once, immediately after the call, and every node after it can be written normally.",
          "Dates arrive as ISO strings or epoch milliseconds depending on the property, and numbers often arrive as strings. If the destination is a database or a spreadsheet with typed columns, cast in the Set node rather than letting the destination guess.",
        ],
      },
      {
        h: "Going the other way: an external API into HubSpot",
        p: [
          "Importing into HubSpot is the same nodes reversed, with one addition: use the batch endpoints. POST /crm/v3/objects/contacts/batch/upsert takes up to 100 records per call, which turns a 1,000-record import from 1,000 requests into 10.",
          "Upsert on a unique property - email for contacts - rather than creating. HubSpot deduplicates on email, so a plain create against an address that already exists returns a conflict, and a retry loop around that will not fix it.",
          "Batch endpoints report per-record failures inside a 207-style response body rather than failing the whole call. Check the response for errors instead of assuming a 2xx means all 100 landed.",
        ],
      },
    ],
  },
];

const bySlug = new Map(pairGuides.map((g) => [g.slug, g]));

/** The hand-written guide for an integration or pair page, if one exists. */
export function getPairGuide(slug: string): PairGuide | undefined {
  return bySlug.get(slug);
}
