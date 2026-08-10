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
    ],
  },
  {
    slug: "asana-and-discord",
    nodes: ["Asana Trigger", "Asana", "Set", "Discord"],
    sections: [
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
];

const bySlug = new Map(pairGuides.map((g) => [g.slug, g]));

/** The hand-written guide for an integration or pair page, if one exists. */
export function getPairGuide(slug: string): PairGuide | undefined {
  return bySlug.get(slug);
}
