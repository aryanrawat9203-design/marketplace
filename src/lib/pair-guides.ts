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
  /**
   * Page title, written against the phrasing the demand actually arrives in
   * rather than assembled from a format string. The generated version was
   * "<A> to <B>: N n8n integration templates" on every pair page, which is the
   * same title 126 times with the nouns swapped - it describes the shelf, not
   * the page. Where Search Console shows the query ("connect x to y", "x y
   * integration"), the title matches it.
   *
   * Optional so a pair without a guide still gets the generated fallback, but
   * every slug in INDEXABLE_PAIR_SLUGS sets it.
   */
  title?: string;
  /** Meta description, same reasoning. Written per pair, not templated. */
  description?: string;
  /** Nodes the reader will actually place on the canvas, in order. */
  nodes: string[];
  sections: PairGuideSection[];
};

export const pairGuides: PairGuide[] = [
  {
    slug: "postgresql-and-slack",
    title: "Connect PostgreSQL to Slack with n8n: SQL alerts that hold up",
    description:
      "Post PostgreSQL query results into Slack with n8n. Postgres Trigger vs polling, the SSL settings managed databases insist on, the Slack scopes that matter, and the high-water mark that stops the same row alerting twice.",
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
      {
        h: "A worked example: failed payments, once each",
        p: [
          "The concrete job: a payments table, and a Slack channel that should learn about failures within a few minutes without repeating itself.",
          "Add a notified_at timestamp column to the table, nullable, defaulting to null. That column is the whole design - it is the memory, it lives next to the data it describes, and it survives the workflow being deleted and re-imported.",
          "A Schedule Trigger every five minutes runs a Postgres node with a SELECT for rows where status is failed and notified_at is null, with an explicit LIMIT of 100. The limit matters: the first run after a bad deploy can match thousands of rows, and without it the workflow tries to describe all of them in one Slack message and fails on Slack's length cap instead of alerting anyone.",
          "An IF node checks the result is non-empty, so quiet periods produce nothing rather than a message saying nothing happened. Then a Code node aggregates - a count, a total amount, and the five largest failures - because a channel gets one useful message rather than a hundred rows.",
          "The Slack node posts it. Immediately after, and only after, a second Postgres node runs an UPDATE setting notified_at to now() for exactly the IDs that were in the batch. Pass the IDs through as a query parameter rather than re-running the WHERE clause: re-running it would also stamp rows that failed in the seconds between the SELECT and the UPDATE, and those would never be reported.",
          "That ordering is the part worth getting right. Stamp first and a Slack outage silently swallows the batch permanently; stamp after and a Slack outage means the same rows are retried on the next run, which is the failure you want.",
          "Give the workflow a dedicated database role with SELECT on the payments table and UPDATE on that one column. A reporting workflow holding broader privileges is the difference between a bad WHERE clause producing wrong numbers and it producing a data-loss incident.",
        ],
      },
      {
        h: "When this pairing is the wrong answer",
        p: [
          "Polling has a floor, and it is the poll interval. If the requirement is sub-second - fraud detection, trading, anything where the alert has to beat a human - this shape cannot deliver it, and adding a Postgres Trigger on LISTEN/NOTIFY only helps when you control the database and are not behind a pooler. PgBouncer in transaction mode drops LISTEN registrations, which is why a trigger that works locally goes silent in production.",
          "It is also not a monitoring system. There is no deduplication window, no escalation, no on-call routing and no acknowledgement. A channel that receives a message every five minutes because a threshold is still breached gets muted within a day, and a muted channel is worse than no alerting because everyone believes it is working. If you find yourself building suppression rules, you are rebuilding a monitoring tool badly - use one and let n8n feed it.",
          "And it is a poor fit for anything per-user. Slack rate-limits to roughly one message per second per channel, and a workflow that DMs a different person per row is both slow and a good way to get an app rate-limited. Batch into one channel message that mentions people, rather than one message per person.",
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
    title: "Shopify to PostgreSQL with n8n: sync orders to your database",
    description:
      "Load Shopify orders into PostgreSQL with n8n. Custom-app credentials, read_all_orders for the 60-day wall, upserting against duplicate webhook deliveries, and the five-second timeout that silently disables a webhook.",
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
          "Note that setting inventory_quantity on a variant does nothing - Shopify treats it as read-only on update and returns 200 anyway. Stock moves through the inventory levels endpoint, keyed on the variant's inventory_item_id plus a location ID, and prefer setting an absolute quantity over a delta so a retry does not apply the adjustment twice.",
        ],
      },
      {
        h: "A worked example: orders landing in a reporting schema",
        p: [
          "The concrete job: every Shopify order should end up in PostgreSQL within seconds, in a shape the finance team can query, and it should survive Shopify sending the same order twice.",
          "Two workflows again, for the reason in the section above: the webhook has five seconds and the real work does not fit in it.",
          "The receiver is three nodes. A Shopify Trigger on orders/create. A Set node that keeps exactly four things - the Shopify order ID, the shop domain, the received timestamp, and the entire raw body. Then a Postgres node doing an upsert into a raw_orders table with a unique constraint on the order ID and a jsonb payload column. That constraint is what turns Shopify's at-least-once delivery from a duplicate-row problem into a no-op.",
          "The processor is a Schedule Trigger every minute, a SELECT for raw_orders rows where processed_at is null, and the flattening logic - then two writes: one row into orders, several into order_lines keyed on the order ID, and finally the processed_at stamp.",
          "Money is where this either works or is quietly wrong forever. Shopify returns amounts as strings, and the temptation is to let the driver coerce them. Cast to numeric explicitly, keep the currency code in its own column, and never let a float near a total - summing a few thousand doubles produces revenue figures that are off by small amounts in a way nobody can reconcile later.",
          "Keep the raw payload even after processing. Six months in, someone will ask for a field the flattening step never extracted, and having the jsonb column means writing a query instead of asking Shopify to replay a quarter of orders - which, past the 60-day window, it may not do at all without read_all_orders on the credential.",
          "For the backfill, do not use the trigger. A separate one-off workflow with a Schedule Trigger and the Shopify node paging through historical orders writes into the same raw_orders table, and the same processor picks them up. Because the upsert is idempotent, a backfill overlapping with live traffic is safe rather than something to time carefully.",
        ],
      },
      {
        h: "Honest limits",
        p: [
          "The five-second webhook timeout is not advisory. Shopify retries with backoff for up to 48 hours and then disables the webhook outright, and it does not make that obvious - the first sign is usually that orders stopped arriving some days ago. If you take one thing from this page, make the triggered workflow do nothing but write.",
          "Shopify's Admin API is versioned quarterly with roughly a year of support per version. A workflow pinned to a version that gets retired starts failing with no change on your side, so note which version your n8n release targets and re-test after upgrades rather than discovering it during a sale.",
          "This is a one-way pipeline and should stay one. PostgreSQL is a good reporting and archival destination for Shopify data, and a bad source of truth for it - Shopify owns orders, inventory and customers, and a workflow that writes order state back into Shopify from a database is fighting the platform. Push prices and stock levels back if you must; do not try to make the database authoritative over anything Shopify's checkout writes.",
          "If the destination is meant to be readable by non-technical colleagues rather than queried, PostgreSQL is the wrong end of this and Airtable is the better pairing - with the ceiling that its record limits impose.",
        ],
      },
    ],
  },
  {
    slug: "discord-and-trello",
    title: "Trello and Discord with n8n: card alerts, and cards from chat",
    description:
      "Connect Trello to Discord with n8n - post card moves into a channel, and turn Discord messages into cards. Trello token expiry, webhook vs bot token, the 2,000-character cap, and keeping the channel readable.",
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
        h: "A worked example: a Done list that announces itself",
        p: [
          "The concrete job: when a card reaches the Done list, post it to a Discord channel with who moved it, and do not post anything else.",
          "Register the Trello webhook against the board, not the card - card-level webhooks disappear when the card is archived. Then filter twice in n8n, because the board sends everything.",
          "The first filter is an IF node on action.type equal to updateCard. That alone removes comments, label changes and new cards. The second reads action.data.listAfter.id and continues only when it matches your Done list ID. Both values are in the webhook body; find them by running the trigger once with a real card move and reading the output panel rather than working from documentation.",
          "The listAfter field is the important one. Trello fires updateCard for every field edit, and a rename produces an update with no listAfter at all - so a workflow filtering only on the type posts every typo correction to the channel. Checking listAfter specifically is what makes this mean 'moved into Done' rather than 'was touched'.",
          "Then a Set node builds the message from action.data.card.name, the member creator's fullName, and a link assembled as https://trello.com/c/ plus the card's shortLink. Use shortLink, not the card ID - the ID resolves through the API but is not a URL a person can open.",
          "Post it as an embed rather than plain text. Embeds allow 4,096 characters against a message's 2,000, and a card description pasted into a plain message will eventually exceed the limit and fail the whole node. Better still, do not include the description at all - a title, a mover and a link is what anyone reading the channel actually wants.",
          "If the board is busy enough that even Done moves are noisy, replace the Discord node with a Postgres or Airtable write and add a second Schedule-triggered workflow posting a daily digest. Five moves in one message gets read; five separate messages get muted.",
        ],
      },
      {
        h: "When Trello and Discord is the wrong pairing",
        p: [
          "Trello's token is the thing that will break this, and it breaks silently. A token issued with a 30-day expiry is the most common reason a Trello workflow runs for a month and then stops with nobody having changed anything. Issue it as never-expiring and treat it as a password, and if the workflow returns 401 out of nowhere, check whether the account that created the token still has access to the board.",
          "The pairing is a poor fit when Discord is meant to become the tracker. Slash commands creating cards work well as an intake path; conversations in a channel deciding status while the board says something else is how you end up with a board nobody trusts. Trello holds state, Discord reports it.",
          "It is also the wrong choice for anything needing reliable delivery. Trello does not guarantee webhook delivery, there is no replay, and an n8n outage means those events are gone with nothing to reconcile against. If a missed Done card would matter, add a Schedule-triggered sweep that lists the Done list and compares against what you have posted, and treat the webhook as the fast path rather than the record.",
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
    title: "Asana to Discord with n8n: task alerts your team actually sees",
    description:
      "Send Asana task updates into Discord with n8n. The X-Hook-Secret handshake, why every event costs a second API call, stripping HTML out of task notes, and filing Discord requests back as real Asana tasks.",
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
        h: "A worked example: completed tasks, without the noise",
        p: [
          "The concrete job: when a task in one Asana project is completed, post it to Discord with its assignee and a working link.",
          "The Asana Trigger fires on the project, and the payload is thin by design - a resource GID, an action, and little else. So the first node after the trigger is an IF checking that the action is 'changed' and the resource type is 'task', discarding subtask events and comment additions before they cost you anything.",
          "Then an Asana node fetches the task by GID. This step is not optional and it is why this workflow is longer than it looks: the event tells you a task changed, not what it now says. Every event that survives your filter costs an API call, which is why filtering before the fetch rather than after actually matters on Asana's free plan and its 150 requests per minute.",
          "A second IF node checks the fetched task's completed field is true. Filtering here rather than on the event is deliberate - Asana's change events do not reliably tell you which field changed, so the fetched task is the only trustworthy source of the current state.",
          "A Set node builds the message: task name, the assignee's name from the fetched object, and a permalink assembled as https://app.asana.com/0/ plus the project GID plus the task GID. Both GIDs are on the task you just fetched.",
          "Do not include the task notes. Asana stores them as HTML, so passing them through produces visible tags in Discord, and stripping them properly is a Code node you did not set out to write. Name, assignee, link - the person who wants the detail clicks through.",
          "Finally the Discord node posts it. If the project is busy, batch instead: write completions to a store and post a daily summary, because a channel receiving a message per completed task stops being read within a week.",
        ],
      },
      {
        h: "Where this pairing struggles",
        p: [
          "Asana's webhooks are the fragile part. The registration handshake requires the workflow to be active and the production URL publicly reachable, so registering while testing against a local n8n leaves a webhook that never delivers. Asana also disables webhooks that fail repeatedly and does not announce it - if events stop after an n8n restart or a domain change, re-save and re-activate the trigger to force re-registration rather than hunting for a bug.",
          "Because the events carry no field-level detail, anything wanting a proper audit trail - who changed what, when, from what value - cannot be built this way. That belongs on a Schedule Trigger reading the task list and diffing against stored state, which is a different and considerably larger workflow.",
          "And the pairing is a poor fit where Asana's own notifications would do. Asana has native integrations and email notifications that require no maintenance; the case for n8n is enrichment, routing by field value, or writing back - not simply relaying. If the requirement is 'tell the channel when a task completes' and nothing more, check what Asana offers natively before taking on a webhook you have to keep alive.",
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
    title: "Notion and Discord with n8n: alerts, and capture by reaction",
    description:
      "Connect Notion to Discord with n8n. Why the Notion trigger polls instead of pushing, the sharing step that makes every query return empty, the property types that reject writes, and capturing messages with an emoji.",
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
      {
        h: "A worked example: a bug channel that fills a Notion tracker",
        p: [
          "The concrete job: someone reports a bug in a Discord channel, a maintainer reacts with a specific emoji, and the message becomes a row in a Notion bug database with a link back to the conversation.",
          "Reaction-as-trigger is the whole idea here, and it is better than capturing every message for a reason that is not obvious: it moves the filtering decision to a human who has context, so the database stays clean without you writing a single classification rule.",
          "A Discord Trigger on the message-reaction-add event starts it. An IF node continues only when the emoji name matches your chosen one - otherwise every thumbs-up in the channel becomes a bug report. Note that the reaction event carries IDs rather than content, so a Discord node fetching the message by its ID comes next; and reading message text at all requires the Message Content intent enabled on the bot in Discord's developer portal, without which bodies arrive empty and everything else looks fine.",
          "Before creating anything, query the Notion database filtered on a Discord Message ID text property equal to this message's ID. An IF node on whether that returns results splits create from update, which is what makes re-reacting - or two maintainers reacting - update one row instead of making two.",
          "The Set node then builds the property payload, and this is where Notion's model bites. Title is an array of rich-text objects, not a string. The Status select needs a value that already exists as an option, so normalise it rather than passing user input through. Store the Discord permalink in a URL property and the message ID in a plain text one - they serve different purposes and conflating them makes the lookup above impossible.",
          "Truncate the message text. Notion caps rich text at 2,000 characters per block, and a bug report with a stack trace pasted in will exceed it. Take the first 1,900 characters and let the permalink carry the rest.",
          "Finally, post a short confirmation back into the thread with the Notion page URL. Without it the maintainer cannot tell whether the capture worked, and the usual response is to react again.",
        ],
      },
      {
        h: "The limits worth knowing before you build",
        p: [
          "Notion polls. There is no general-purpose outbound webhook for database changes, so the Notion-to-Discord direction has a delay of up to your poll interval and cannot be made instant. If something needs to reach Discord immediately, have the action write to Notion through n8n and post to Discord in the same run, rather than waiting for a poll to notice.",
          "Notion allows roughly three requests per second per integration. Since the pattern above costs at least two calls per capture, a burst of reactions during a bug bash will hit it - enable Retry On Fail, which honours the Retry-After header Notion sends.",
          "The pairing is a poor fit for high-volume capture. A channel where hundreds of messages a day should become rows is asking Notion to be a database it is not, and the polling direction makes it worse. Write to Postgres or Airtable and let Notion hold a curated view if humans need one there.",
          "And the credential trap that catches everyone once: creating a Notion integration grants it access to nothing. Until you open the database, use the connections menu and add the integration by name, the credential tests green and every query returns empty. If your Notion node finds no rows in a database you can plainly see in the browser, that is why.",
        ],
      },
    ],
  },
  {
    slug: "airtable-and-discord",
    title: "Airtable to Discord with n8n: record alerts without the loop",
    description:
      "Post Airtable records into Discord with n8n. Trigger on a view rather than a table, break the notification loop a write-back creates, stay under 5 requests per second, and capture Discord messages into a base.",
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
      {
        h: "A worked example: a content calendar that announces itself",
        p: [
          "The concrete job: a content base where each row is a post, and when a row reaches Ready to publish the writer's Discord channel should hear about it once.",
          "Start in Airtable, not in n8n. Create a view filtered to Status is Ready to publish and Announced is empty. Both halves matter: the first is the condition, the second is the memory, and putting them in a view means the content lead can change the condition without asking you.",
          "The Airtable Trigger watches that view. Because the view is already narrow, most runs return nothing - which is the point. A trigger on the whole table would fire on every keystroke-level edit anyone makes to any row.",
          "A Set node builds the message from the title, the author's name and the publish date. Where the row has a long-text field with rich formatting enabled, remember that Airtable stores Markdown and Discord does not render Markdown links the same way - send a truncated plain summary and a link to the record rather than the field's contents.",
          "The Discord node posts it. A channel webhook is enough here: this workflow only ever posts, to one channel, and a webhook URL cannot read anything, which is a small blast radius if it leaks. Keep the message under 2,000 characters or use an embed, which allows 4,096.",
          "Then, after the Discord node, an Airtable update writes the current timestamp into Announced. That removes the row from the view, which is what stops the next poll re-announcing it - and it is also what stops the workflow triggering itself, because the write happens to a row that has just left the watched view.",
          "Write after the post, never before. Marking a row announced and then failing to post loses it silently, and nothing in the base indicates that happened.",
        ],
      },
      {
        h: "Limits, and when to use something else",
        p: [
          "The self-triggering loop is the failure this pairing is known for, and the view filter above is the only fix that survives contact with humans. Trying to detect your own edits does not work - Airtable's change payload does not clearly attribute who made a change - and an IF node checking a checkbox breaks the moment someone edits a record by hand.",
          "Airtable allows 5 requests per second per base, shared across every workflow and automation touching it, and exceeding it locks the base out for 30 seconds rather than merely slowing you. Batch writes at 10 records per call and stagger schedules if several workflows share a base.",
          "The trigger polls, so this is not an instant-notification tool, and the interval is a floor on how fast anything reacts.",
          "Worth checking first: Airtable's own automations can post to Discord via a webhook with no n8n involved. If the requirement is genuinely 'record enters view, message appears', the native automation is fewer moving parts and nothing to maintain. n8n earns its place when the workflow enriches the record, chooses a channel by field value, or writes back to a third system - and if none of those apply, the honest answer is to build it in Airtable.",
        ],
      },
    ],
  },
  {
    slug: "mysql-and-slack",
    title: "MySQL to Slack with n8n: query results posted to a channel",
    description:
      "Send MySQL query results into Slack with n8n. TLS for managed MySQL, the caching_sha2_password error on MySQL 8, aggregating in SQL rather than a Code node, and threshold alerts that fire on change not on every poll.",
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
      {
        h: "A worked example: a queue-depth alert that fires on change",
        p: [
          "The concrete job: a jobs table, and a Slack channel that should say something when the backlog crosses a threshold - and then say nothing until it changes.",
          "This is a different problem from row-by-row alerting, and treating it the same way is why alerting channels get muted. The thing you are reporting is a state, not a record, so the memory has to be a state too.",
          "Create a one-row table - call it alert_state - with a column holding the last known state as text. A Schedule Trigger every five minutes runs a MySQL node with two queries or one query returning both: the current pending count, and the stored state.",
          "Do the counting in SQL. SELECT COUNT(*) with the WHERE clause that defines your backlog returns one row and one number, and the Slack step becomes trivial. Pulling 40,000 pending rows into n8n to count them in a Code node is slower, uses far more memory, and fails in a way that looks like an n8n bug rather than a query that outgrew its assumptions. Always put a LIMIT on any query feeding a notification, for the same reason.",
          "An IF node compares the current state against the stored one and continues only when they differ. That single comparison is the entire design: it turns 'the backlog is over 500' - true every five minutes for the next three hours - into one message when it crosses and one when it recovers.",
          "A Switch node then picks the message: breached posts a warning with the count, recovered posts an all-clear with how long it lasted. The recovery message is the half people skip, and it is the half that makes anyone trust the channel.",
          "After the Slack node, a MySQL UPDATE writes the new state. After, not before - a Slack failure should leave the state unchanged so the next run tries again, rather than recording that it announced something it did not.",
          "Use query parameters rather than concatenating values into the SQL, here and everywhere. It is not only injection: a value containing an apostrophe breaks a concatenated query on an ordinary afternoon.",
        ],
      },
      {
        h: "Honest limits",
        p: [
          "There is no MySQL trigger node, so this is always polling and the interval is the floor on reaction time. Nothing here can be made instant. If your application can call n8n when the thing happens, a Webhook node is both faster and cheaper than any polling interval you would be comfortable setting.",
          "MySQL 8 defaults to the caching_sha2_password auth plugin, and older client stacks fail against it with an authentication-plugin error. Either keep the n8n image current or create the user with mysql_native_password - the error names the plugin, which makes it one of the easier problems to identify once you have seen it.",
          "Managed MySQL requires TLS, and self-hosted n8n usually needs allowlisting at the database firewall. A connection that times out rather than being refused is almost always the firewall, not a wrong password.",
          "The bigger limit is conceptual: this is not a monitoring system. No escalation, no on-call routing, no acknowledgement, no maintenance windows. The state-change pattern above gets you a long way, but the moment you are building suppression rules and severity levels you are writing a monitoring tool inside a workflow engine. Use a real one and let n8n feed it - the query is still the useful part.",
        ],
      },
    ],
  },
  {
    slug: "discord-and-hubspot",
    title: "HubSpot to Discord with n8n: deal and contact alerts",
    description:
      "Connect HubSpot to Discord with n8n. Private App tokens, webhook subscriptions configured in HubSpot rather than n8n, custom properties that arrive missing unless you ask, and stage IDs that need mapping to names.",
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
      {
        h: "A worked example: deals closing, announced properly",
        p: [
          "The concrete job: when a deal moves to Closed Won and is worth more than a threshold, post it to a Discord channel with the amount, the owner and a link.",
          "Set up the webhook in HubSpot, not in n8n. Private App webhooks are configured in the HubSpot app's own Webhooks tab: paste n8n's production webhook URL there and subscribe to deal property changes. The trigger will sit silent forever if that subscription is missing, and nothing in n8n indicates why.",
          "Subscribe to the specific property - dealstage - rather than to all property changes. A blanket subscription fires on every field edit including HubSpot's own enrichment, and the volume makes the channel useless within a day.",
          "The event identifies the deal rather than describing it, so a HubSpot node fetches the full record by ID. Ask for the properties you need by internal name - dealname, amount, dealstage, hubspot_owner_id, closedate - because HubSpot returns a thin default set and a missing field in your message is nearly always an unrequested property rather than an empty value.",
          "Now the mapping work, which is most of this workflow. Deal stage arrives as an ID, not a label: the thing you see as Closed Won is a numeric or generated ID in the API. Fetch your pipelines once, note the stage IDs, and write the IF node against the ID. A filter written against the label matches nothing, silently.",
          "The owner is the same problem - the record carries hubspot_owner_id, so a second HubSpot node resolving that to a name is what turns 'moved to 1234567 by 8901234' into a sentence.",
          "An IF node on the amount then splits big deals from small ones: big deals post immediately, small ones write to a store for a weekly summary. One node is the entire difference between a channel people watch and one they mute.",
          "The Discord node posts an embed with the deal name as a linked title, the amount and the owner as fields. Build the link as your HubSpot portal URL plus the record path and the deal ID - the ID is in the payload, and a message without a link means someone has to search the CRM to act on it.",
        ],
      },
      {
        h: "Where this pairing is a poor fit",
        p: [
          "The propertyChange firehose is the main risk, and it is worth restating: subscribe to named properties, never to all changes. HubSpot's own automations, enrichment and integrations all write to records, and every one of those is an event.",
          "HubSpot allows roughly 100 requests per 10 seconds on standard plans, and the pattern above costs two or three calls per event. A bulk import into HubSpot - a list upload, a migration - will fire thousands of property-change events in a burst, and the workflow will rate-limit itself while filling the channel with noise about records nobody changed by hand. If a bulk import is planned, deactivate the workflow first; there is no way to distinguish an import's writes from a salesperson's.",
          "It is also the wrong tool for pipeline reporting. A channel receiving every stage change is not a report, and people will not reconstruct one from scrollback. HubSpot's own dashboards do that job; use Discord for the handful of events that genuinely warrant interrupting someone.",
          "On the reverse path, remember Discord slash commands expect a response within three seconds and HubSpot writes are not reliably that fast - acknowledge immediately, do the work after, and post the result as a follow-up.",
        ],
      },
    ],
  },
  {
    slug: "google-drive-and-notion",
    title: "Google Drive to Notion with n8n: file intake, page out",
    description:
      "Turn Google Drive files into Notion pages with n8n. The seven-day token expiry that kills Drive workflows, exporting native Google formats before extraction, scanned PDFs that return nothing, and Notion's block limits.",
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
      {
        h: "A worked example: a contracts inbox that summarises itself",
        p: [
          "The concrete job: PDFs dropped into a Drive folder become Notion pages with the text extracted and a short summary, one page per document, no duplicates.",
          "A Google Drive Trigger watches the folder on file creation - creation, not update, because Google's native formats autosave continuously and an update watch on a folder containing a live document fires while someone types.",
          "An IF node checks the MIME type is application/pdf immediately, before the download. This is a size guard as much as a correctness one: files pass through n8n's memory, and a 200MB video dropped into the folder by mistake will fail the execution rather than being skipped.",
          "A Drive node downloads the file, and Extract from File turns it into text. Then the check that saves the whole workflow from being quietly useless: an IF node on whether the extracted text is empty. Scanned PDFs contain images and no text layer, and extraction returns empty output rather than an error - so without this guard the workflow creates a run of blank Notion pages and reports success. Route empties to a Slack message naming the file so a human deals with it.",
          "Before creating anything, query Notion for a page whose Drive File ID property equals this file's ID. Drive re-fires on any subsequent edit, so without this lookup the same contract accumulates pages. Empty result creates, non-empty updates.",
          "If a summary is wanted, an AI node sits between extraction and Notion. Feed it the extracted text, not the file - and truncate the input, because a fifty-page contract will exceed what you want to pay for as much as what the model accepts.",
          "Writing to Notion is where the block limits bite. Rich text caps at 2,000 characters per block and a single request at 100 blocks, and extracted document text routinely exceeds both. Split the text into chunks in a Code node, create the page with the first batch, then append the rest in further calls rather than sending one enormous create.",
          "And the step everyone forgets: the Notion database must be connected to your integration through its connections menu, or every write fails with an object-not-found error against a database you can see perfectly well in the browser.",
        ],
      },
      {
        h: "Limits worth knowing",
        p: [
          "The seven-day token expiry is the one that will bite you first. While the Google Cloud consent screen is in Testing mode, refresh tokens expire after a week, which is why a Drive workflow reliably stops about seven days after it was set up with nothing having changed. Publish the app, or accept re-authorising weekly.",
          "A service account avoids that and brings its own constraint: it has no Drive storage quota of its own, so uploading to My Drive as a service account fails with a quota error that never mentions service accounts. Work inside a shared drive, or write into a folder owned by a real account.",
          "The Drive trigger polls and has no reconciliation. During an n8n outage, files that arrive are simply not processed and nothing will ever notice. If missing one would matter, add a Schedule-triggered sweep that lists the folder and compares against what Notion holds, and treat the trigger as the fast path rather than the guarantee.",
          "Notion is a poor fit as the destination for volume. Three requests per second per integration, plus chunked writes, means a few hundred documents is a long slow job and a few thousand is an unreasonable one. If the goal is a searchable archive rather than pages humans read and annotate, the text belongs in a database with Notion holding a curated slice.",
        ],
      },
    ],
  },
  {
    slug: "google-sheets-and-slack",
    title: "Google Sheets to Slack with n8n: row alerts and digests",
    description:
      "Post Google Sheets rows into Slack with n8n. The service-account sharing step behind most 403s, empty trailing rows, a status column that stops repeat alerts, and batching so Slack's rate limit doesn't eat a run.",
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
      {
        h: "A worked example: a stock sheet that raises the alarm once",
        p: [
          "The concrete job: a sheet where each row is a product with a quantity, and a Slack channel that should hear when something drops below its reorder level - once per product, not every fifteen minutes.",
          "Add two columns by hand first: Alerted At and an ID column if the sheet has no natural key. The ID column matters more than it looks. A spreadsheet row has a position, not an identity, so anyone sorting the sheet or inserting a row shifts everything below it - and a workflow keying on row number then updates the wrong product with no error at all.",
          "A Schedule Trigger every thirty minutes runs a Google Sheets node reading the stock range. Give it the explicit range rather than A1:Z10000; pulling ten thousand rows to use forty costs quota on every run and makes the execution log unreadable.",
          "The first IF node is a data guard, not business logic: continue only when the ID column is non-empty. Google returns trailing rows that look blank but exist, and without this check the workflow produces a burst of alerts about products with no name.",
          "The second IF node is the actual condition - quantity below reorder level, and Alerted At empty. That second clause is the memory, and it is why the channel gets one message per product rather than one every half hour until someone restocks.",
          "A Code node then aggregates the matches into a single message with one line per product. Twelve low-stock items should be one message with twelve lines, not twelve messages: Slack allows roughly one message per second per channel, and a loop over a hundred rows gets rate-limited halfway through with no indication which half arrived.",
          "The Slack node posts it. Then a Google Sheets node using Append or Update, matched on the ID column, writes a timestamp into Alerted At for the alerted rows - after the Slack node, never before. Match on the ID column and be sure it is genuinely unique; matching on a product name that appears twice overwrites the wrong row.",
          "One thing to decide deliberately: nothing here clears Alerted At when stock recovers, so a product that is restocked and drops again will not alert twice. If that matters, add a branch that clears the column when quantity rises above the threshold - which is the same state-change pattern, just written into a spreadsheet.",
        ],
      },
      {
        h: "Honest limits",
        p: [
          "The Sheets trigger polls and watches one named sheet within one document, so several tabs means several triggers or a Schedule Trigger reading each range in turn. Nothing here is instant.",
          "Google's quota is roughly 300 requests per minute per project, and the way people hit it is writing back row by row inside a loop. Use a single update handling multiple rows and turn on Retry On Fail for the write.",
          "The service-account sharing step is the most common setup failure: a service account has its own identity, so the spreadsheet must be shared with the client_email from its JSON key as you would share with a colleague. Until then every call returns 403 while the credential itself tests fine. On OAuth2, self-hosted n8n also needs both the Sheets API and the Drive API enabled - Sheets alone fails at the document picker, because the node uses Drive to resolve documents by name.",
          "The real limit is the spreadsheet. Sheets caps at ten million cells and becomes slow long before that, and it has no types, no constraints and no transactions - two workflows writing to the same range will interleave and neither will know. When the sheet stops being read by humans and exists only so automations can query it, it has become a database with a bad query language, and moving it to Postgres or MySQL makes everything downstream simpler.",
        ],
      },
    ],
  },
  {
    slug: "http-rest-api-and-slack",
    title: "Any REST API to Slack with n8n's HTTP Request node",
    description:
      "Poll any REST API and post the result to Slack with n8n. Reusing existing credentials instead of pasting keys into URLs, built-in pagination, making 4xx and 5xx visible instead of silent, and readable messages.",
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
      {
        h: "A worked example: an uptime check that reports both ways",
        p: [
          "The concrete job: call a status endpoint every few minutes and tell a Slack channel when it goes down - and when it comes back.",
          "Configure the HTTP Request node for failure first, because the default behaviour is exactly wrong here. By default a 4xx or 5xx stops the execution, which for a monitoring workflow means the one case you built it for produces nothing in Slack and no indication anything happened.",
          "So turn on Always Output Data, and set the node never to error on HTTP status codes. Set a request timeout too - the default wait on a hanging endpoint is long enough that executions stack on top of each other, and a monitor that stacks is a monitor that eventually falls over on its own.",
          "Now the response is data rather than an exception, and an IF node can branch on the status code. But do not post from that branch directly, or the channel gets a message every five minutes for the entire duration of an outage, which is how a channel gets muted before the incident is over.",
          "Instead, use n8n's workflow static data to hold the last known state, and post only when the current state differs. Up to down posts the alert with the status code and the response time; down to up posts the recovery with how long it lasted. The recovery message is the half people skip and the half that makes the channel trustworthy.",
          "Retry On Fail with two or three attempts belongs on the request node, sitting underneath all of this: a single dropped packet should not read as an outage, and without retries the channel fills with false alarms that train everyone to ignore it.",
          "For the credential, use Predefined Credential Type where the API is one n8n already knows - it reuses the stored credential and handles token refresh. Otherwise Header Auth. What you should not do is put the key in the URL as a query parameter: it ends up in n8n's execution logs, and anyone with access to the execution history can read every past run's secret.",
        ],
      },
      {
        h: "Where this stops working",
        p: [
          "Polling has a floor and it is the schedule. If the source can call you instead, invert the workflow - a Webhook node in place of the Schedule Trigger and the HTTP Request - and you lose both the delay and the wasted calls. That is almost always the better design where it is available.",
          "Pagination is the other thing that quietly fails. Configure the node's built-in pagination rather than building a manual loop, and always set a maximum page count: a rule whose stop condition never becomes false loops until the execution times out, and against a rate-limited API that is also the fastest way to get a key suspended.",
          "Response parsing catches people once. The node parses JSON into items by default, so an endpoint returning CSV, XML or a file produces one item containing a string blob and every downstream expression resolves to undefined. Set the response format to match what the endpoint actually sends.",
          "And the honest boundary: this is not monitoring software. There is no escalation, no on-call rota, no acknowledgement, no maintenance window, and no history you can query. The state-change pattern above is genuinely useful for a handful of checks, and the moment you are writing suppression rules and severity levels you are building a monitoring tool inside a workflow engine. Use a real one - and let n8n feed it the checks that tool cannot make itself, which is where it is actually strong.",
        ],
      },
    ],
  },
  {
    slug: "google-sheets-and-http-rest-api",
    title: "REST API data into Google Sheets with n8n, one row per record",
    description:
      "Pull API data into Google Sheets with n8n. Flattening nested JSON so columns aren't [object Object], Split Out for one row per record, capping pagination, and batching writes under Google's per-minute quota.",
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
      {
        h: "A worked example: a nightly API pull into a reporting sheet",
        p: [
          "The concrete job: every night, pull yesterday's records from an API and land them in a sheet the team reads, without duplicating anything if the workflow runs twice.",
          "A Schedule Trigger at a fixed hour starts it - and set the workflow's timezone explicitly in its settings, because n8n defaults to the instance timezone and a nightly job authored in one region and running in another fires at the wrong hour. A daily job takes a day to prove that.",
          "The HTTP Request node fetches the data with pagination configured against whatever the API uses - a cursor, a Link header, an incrementing page - and a maximum page count set as a backstop. Pass the date range as parameters rather than pulling everything and filtering later.",
          "Then a Split Out node on whatever key the response nests the list under - data, results, items. Skipping this is why an import sometimes produces one row containing the entire payload: without Split Out, the whole array is a single n8n item and therefore a single spreadsheet row.",
          "A Set node maps each column explicitly - order_id from the id field, customer_name from the nested customer object's name, and so on. This is more typing than passing everything through, and it is the difference between a change in the API's response shape showing up as one empty column and it corrupting the sheet. A spreadsheet is flat and JSON is not: a nested object arrives as [object Object] and an array as a comma-smashed string, so every column you want has to be lifted deliberately.",
          "Cast types in the same node. A number arriving as a string sorts alphabetically in the sheet, which is the kind of bug that gets noticed in a meeting rather than in testing.",
          "Then a single Google Sheets node using Append or Update, matched on a stable ID column from the API. One node receiving all the items sends one call; appending row by row inside a loop is the most common way to hit Google's quota of roughly 300 requests per minute. Matching on the API's ID rather than plain Append is what makes a second run of the same night correct the rows instead of adding a duplicate set beneath them.",
          "For the first backfill, run it against a wider date range once with a Loop Over Items node and a short Wait between batches. Steady-state nightly runs of a few hundred rows will never trip a limit; the initial two-year pull is the one that does.",
        ],
      },
      {
        h: "Honest limits",
        p: [
          "Everything passes through n8n's memory, so this is bounded by instance size rather than by anything in the design. A pull returning hundreds of thousands of rows will fail the execution on a modest instance no matter how the workflow is written - slice by date and run several times, or accept that the destination should be a database.",
          "Sheets caps at ten million cells and gets slow well before that. A nightly append into one sheet reaches it on a schedule you can calculate in advance, and there is no graceful degradation at the end.",
          "Two workflows writing to the same range will interleave, and neither will know. Sheets has no locking and no transactions, so if more than one process writes to a sheet, give each its own tab.",
          "The signal to stop using a spreadsheet here is when nobody opens it. A sheet that exists so other automations can read it is a database with a per-minute quota and no query language - at that point the same workflow writing to PostgreSQL or MySQL is faster and easier to work with, and a Sheets view can be fed from the database if humans still want one.",
        ],
      },
    ],
  },
  {
    slug: "notion-and-slack",
    title: "Notion and Slack with n8n: page alerts and saved messages",
    description:
      "Connect Notion to Slack with n8n. The integration-sharing step everyone misses, reading Notion's property objects instead of [object Object], an Announced checkbox that stops re-posting, and saving Slack threads to Notion.",
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
      {
        h: "A worked example: a publishing queue that announces once",
        p: [
          "The concrete job: a Notion database where each page is a piece of work, and a Slack channel that should hear when something moves to Ready for review - exactly once.",
          "Add a checkbox property to the database called Announced. That property is the memory, and putting it in Notion rather than in n8n's static data is deliberate: it survives the workflow being deleted and re-imported, and anyone can look at the database and see what has been announced.",
          "A Schedule Trigger every ten minutes runs a Notion node querying the database, and the filter goes in the query rather than in an IF node afterwards. The node exposes Notion's filter options, so ask for pages where Status equals Ready for review and Announced is false. A database with a few thousand pages is slow and quota-hungry to fetch in full, and filtering server-side means most runs return nothing at all.",
          "Then a Set node builds the message, and this is where Notion's property model shows up. Every property is an object with a type, not a bare value: a title is an array of rich-text objects, a select is an object with a name, a person is an array of user objects. Referencing the property directly and getting [object Object] is the normal first result. The reliable move is to run the node once, open the output panel, and copy the actual path to the value rather than guessing at it.",
          "Slack's text format is the next trap. It looks like Markdown and is not - links are <https://example.com|label>, not the bracket-and-parenthesis form, and bold is single asterisks. A Notion title pasted through is fine; a Notion page URL wrapped in Markdown link syntax prints the brackets to everyone in the channel.",
          "The Slack node posts one message listing all the ready items rather than one message per page. Then a second Notion node, after the Slack node, sets Announced to true on each page in the batch.",
          "Order matters as always: announce first, mark second. Marking first means a Slack outage loses those pages permanently and nothing in Notion indicates it happened.",
          "Notion allows roughly three requests per second, and updating pages one at a time over a large result set will hit it - keep batches small and enable Retry On Fail, which honours the Retry-After header Notion sends.",
        ],
      },
      {
        h: "The limits, and one thing to check first",
        p: [
          "Notion's API has no outbound webhooks for database changes, so this is polling and the interval is a floor on reaction time. Nothing here can be instant. Where something must reach Slack immediately, have the action write to Notion through n8n and post in the same run rather than waiting for a poll to notice.",
          "The credential trap is worth restating because it catches everyone exactly once: creating an integration grants it access to nothing. Until you open the database, use the connections menu and add the integration by name, the credential tests successfully and every query returns an empty list or object_not_found - which reads like a broken workflow rather than a permissions problem. Sharing a parent page shares everything nested under it, which is the least tedious way to do it.",
          "Rich text caps at 2,000 characters per block, so a long summary written into a text property fails validation. Truncate deliberately, so the failure is a decision you made rather than one the API made for you.",
          "And check the native integration first. Notion has a built-in Slack connection that posts database updates, and if the requirement is genuinely 'page changes status, message appears', it is fewer moving parts than anything here. n8n earns its place when the workflow enriches from a third system, routes to a channel by field value, or writes back - not when it is relaying.",
        ],
      },
    ],
  },
  {
    slug: "hubspot-and-slack",
    title: "HubSpot to Slack with n8n: deal, contact and ticket alerts",
    description:
      "Send HubSpot records into Slack with n8n. Private app tokens, the stage IDs sitting behind the labels you can see, a slack_notified property that stops repeat announcements, and creating contacts from a slash command.",
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
      {
        h: "A worked example: stale deals, on a schedule",
        p: [
          "The concrete job: every Monday, post the deals that have sat in the same stage for more than two weeks, so a sales lead can chase them.",
          "This one is deliberately a Schedule Trigger rather than a webhook, and it is worth saying why. The HubSpot Trigger uses webhooks configured on a developer app rather than on your portal, so it needs a HubSpot developer account, not just a private app token. For a weekly digest that is more setup than the job deserves - polling the search endpoint is a legitimate substitute and most of these workflows should use it.",
          "So: a Schedule Trigger at Monday 09:00, with the workflow timezone set explicitly in its settings, because n8n defaults to the instance timezone and a weekly job takes a week to reveal that it fired at the wrong hour.",
          "An HTTP Request node POSTs to the deals search endpoint with a filter on the stage-entered date being older than two weeks, using the predefined HubSpot credential rather than a pasted token. Ask for the properties you need by internal name - dealname, amount, dealstage, hubspot_owner_id - because HubSpot returns a thin default set and a missing field is nearly always an unrequested property rather than an empty value.",
          "Now the ID mapping, which is most of the work in any HubSpot workflow. Deal stages arrive as IDs, not the labels you see in the UI, so a filter written against 'Contract Sent' matches nothing, silently. Fetch the pipelines once, note the stage IDs, and write the filter and the display mapping against those. Owners are the same - the record carries hubspot_owner_id, so a second call resolving those IDs to names is what makes the message readable.",
          "A Split Out node on the results array then a Set node lifting fields out of the properties wrapper: every record comes back with the fields nested under properties alongside id and createdAt, so an expression referencing the deal name directly is undefined. Do that flattening once, immediately after the call, and every node after it can be written normally.",
          "A Code node groups by owner and builds one Block Kit message with a section per person. One message, not one per deal - Slack allows roughly one message per second per channel, and a loop over forty deals gets rate-limited partway through.",
          "An IF node on the count guards the post, so a clean week produces silence rather than a message with an empty list.",
        ],
      },
      {
        h: "Honest limits",
        p: [
          "The search endpoint returns at most 10,000 results for any single query regardless of paging, and paging past it returns nothing rather than an error. For anything approaching that, slice by a date range and run the query once per slice.",
          "HubSpot allows roughly 100 requests per 10 seconds on standard plans, and the search endpoint is more tightly limited than the rest. Batch the Slack side into one message and enable Retry On Fail on the HubSpot calls.",
          "For event-driven alerting rather than digests, the deduplication problem is real: a polling workflow re-runs the same search each time and reports every matching record again. Filtering on lastmodifieddate is not sufficient on its own, because any unrelated edit makes a record look new. The fix that works is a custom property such as slack_notified, excluded in the filter and written back after the Slack node.",
          "Where this pairing is a poor fit: pipeline reporting. HubSpot's own dashboards and lists do segmentation and reporting properly, and a Slack channel is not a report - nobody reconstructs a pipeline from scrollback. Use Slack for the handful of events that genuinely warrant interrupting someone, and send people to HubSpot for the numbers.",
        ],
      },
    ],
  },
  {
    slug: "http-rest-api-and-hubspot",
    title: "HubSpot's REST API in n8n with the HTTP Request node",
    description:
      "Call the HubSpot endpoints n8n's node doesn't cover. Reusing the HubSpot credential on HTTP Request, the search endpoint's 10,000-result ceiling, cursor pagination, and flattening the properties wrapper.",
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
      {
        h: "A worked example: exporting a filtered contact list",
        p: [
          "The concrete job: pull every contact created in a given quarter with a handful of properties, and write it out as a file - the thing the HubSpot UI's export makes awkward when you want it on a schedule.",
          "The endpoint is POST /crm/v3/objects/contacts/search, which takes a JSON body with filterGroups, an explicit properties array, and a limit of up to 100. A plain GET on the objects endpoint works and cannot filter, which is why the search endpoint is the one worth learning.",
          "Set authentication to Predefined Credential Type and pick your existing HubSpot credential. n8n signs the request and you have one token to rotate rather than several copies in header parameters.",
          "List the properties explicitly. HubSpot returns a thin default set, so a request that does not name what it wants comes back missing most of the fields you were exporting - which looks like empty data rather than an incomplete request, and sends people looking at permissions.",
          "Configure pagination against the cursor: the response carries paging.next.after, the next request sends it as after, and paging.next being absent means you are done. Set a maximum page count as a backstop, because a stop condition that never becomes true loops until the execution times out.",
          "Now the ceiling that shapes the whole workflow: any single search query returns at most 10,000 results, no matter how you paginate. Page 101 does not exist and returns nothing rather than erroring. So do not write one query for the year - slice by createdate into ranges that stay comfortably under 10,000 each, run the query per slice, and concatenate. A Code node generating the date ranges and a Loop Over Items node running the request per range is the shape.",
          "Then a Split Out node on the results array and a Set node lifting the properties wrapper to the top level, because every record arrives with its fields nested under properties alongside id and createdAt. Cast while you are there - dates come back as ISO strings or epoch milliseconds depending on the property, and numbers often arrive as strings, so a typed destination should be given typed values rather than left to guess.",
          "Finally a Convert to File node in JSON or CSV mode produces something you can attach to an email, drop into Drive, or hand to another system. Give the execution a realistic timeout: at 100 records per request and roughly 100 requests per 10 seconds of headroom, a 50,000-record export is a few minutes of steady paging, and a short timeout kills it partway through while looking like a hang.",
        ],
      },
      {
        h: "When to use the node instead, and where both fall short",
        p: [
          "Reach for the HTTP Request node only where the HubSpot node genuinely does not reach. The node handles contacts, companies, deals, tickets and engagements with less ceremony and fewer ways to get the payload shape wrong, and a workflow built half on each is harder to maintain than one built on either.",
          "The things that actually require HTTP Request are the batch endpoints, associations, custom objects, the properties API, and anything HubSpot shipped after the node was last extended. Bulk work is the common one: batch upsert takes 100 records per call and turns a 1,000-record import from 1,000 requests into 10.",
          "Associations are worth flagging because a flat export hides them. A contact's company is not a property, it is a separate association object, so an export that includes a company name column is reporting a text field rather than the relationship. Building associations on import is a third pass after both sides exist, because you need the IDs the first two passes returned.",
          "And the limit that no amount of API skill fixes: HubSpot rate-limits per portal, not per integration. Your export competes with every other integration, workflow and app installed on the portal, so a job that runs fine in isolation can rate-limit itself during a marketing team's bulk import. Enable Retry On Fail, run large exports outside working hours, and treat a 429 as expected traffic shaping rather than a bug to debug.",
        ],
      },
    ],
  },
  {
    slug: "airtable-and-shopify",
    title: "Airtable and Shopify with n8n: run the catalog from a base",
    description:
      "Sync Shopify products and orders with Airtable using n8n. Modelling rows as variants not products, the inventory endpoint that actually moves stock, both rate limits, and where Airtable stops being the right store.",
    nodes: ["Schedule Trigger / Shopify Trigger", "Airtable", "Set", "Shopify"],
    sections: [
      {
        h: "What people actually use this pairing for",
        p: [
          "Almost every Airtable-Shopify workflow is one of three jobs, and they pull in different directions, so it is worth naming which one you are building before you open n8n.",
          "The first is Airtable as a lightweight PIM: merchandisers write titles, descriptions, prices and launch dates in a base, and a workflow pushes the approved rows into Shopify. Airtable is the source of truth and Shopify is downstream. The second is the reverse - orders and customers flowing out of Shopify into a base so that ops, fulfilment or a marketing team can annotate them without being given Shopify admin access. The third is inventory, which looks like the other two and is not: stock is the one field where both systems have a claim to being right, and that is where these projects go wrong.",
          "The reason the pairing exists at all is access. Shopify's admin is a poor multiplayer editing surface and its permissions are coarse; Airtable is a good one. Handing a photographer or a copywriter an Airtable view is easy in a way that handing them Shopify staff accounts is not.",
        ],
      },
      {
        h: "Which nodes you need",
        p: [
          "Both sides have first-party nodes. Airtable to Shopify is a Schedule Trigger, an Airtable node searching a view, a Set node building the Shopify payload, and a Shopify node running create or update. Shopify to Airtable is a Shopify Trigger, a Set node flattening the order, and an Airtable upsert.",
          "The Shopify node covers products, variants, orders and customers. Metafields, publications and the inventory endpoints are not all exposed, so anything touching those goes through an HTTP Request node - point its authentication at your existing Shopify credential rather than pasting the token again.",
        ],
      },
      {
        h: "Model the base on variants, not products",
        p: [
          "This is the decision that determines whether the whole thing works, and it is easy to get wrong because Airtable's grid tempts you into one row per product.",
          "Shopify's sellable unit is the variant. Price, SKU, barcode, weight and stock all live on the variant; only title, description, vendor, product type and images live on the product. A base with one row per product has nowhere to put the price of the medium blue one, and the workaround people reach for - comma-separated fields - is unpickable the moment a size name contains a comma.",
          "The arrangement that holds up is two tables: Products, and Variants linked to it. Store the Shopify product ID on the product row and the variant ID on the variant row, both as plain text fields, and treat them as read-only after the first write. Those IDs are the join key for every subsequent sync, and an upsert matching on them is what makes re-running the workflow safe.",
        ],
      },
      {
        h: "Updating stock: the field that looks right and does nothing",
        p: [
          "Setting inventory_quantity on a variant is the obvious move and it is the wrong one. Shopify treats that field as read-only on update - the request succeeds, returns 200, and the stock level does not change. There is no error to debug, which is why this costs people an afternoon.",
          "Stock lives on an inventory level, which is the pairing of an inventory item with a location. The path is: read the variant to get its inventory_item_id, then call the inventory levels endpoint with that ID, the location ID, and either an absolute quantity or a delta. A single-warehouse store has one location ID that you can hard-code once; a multi-location store has to decide which location the Airtable number refers to, and if it does not, the number is meaningless.",
          "Prefer setting an absolute quantity over adjusting by a delta when Airtable is the source of truth. Deltas compound: a workflow that runs twice because of a retry applies the adjustment twice, and stock drifts in a way nobody notices until a count.",
        ],
      },
      {
        h: "A worked example: pushing approved copy into Shopify",
        p: [
          "Say the copy team writes product descriptions in Airtable and you want approved ones live in Shopify without anyone touching the admin.",
          "Build an Airtable view filtered to Status = Approved and Synced at is empty - the filter lives in Airtable so the copy lead can adjust it without you. A Schedule Trigger every fifteen minutes runs an Airtable Search node against that view. Because the view already narrows the set, the node usually returns nothing, which is what you want: cheap runs.",
          "Next a Set node builds the payload, and it should list fields explicitly - title, body_html, vendor, product_type, tags - rather than passing the Airtable record through. Airtable returns computed fields, and sending a formula or a rollup to Shopify fails the record. Take the Shopify product ID from its text field and put it on the payload.",
          "Then an IF node splits on whether that Shopify ID is empty: empty goes to the Shopify node's create operation, populated goes to update. The create branch has one extra step - a second Airtable node writing the new Shopify ID back onto the row - or the next run creates the product again.",
          "Finally, after the Shopify node and only after it, an Airtable update writes the current timestamp into Synced at. That removes the row from the view, which is what stops the next run reprocessing it. Put that write before the Shopify call and a Shopify outage marks rows as synced that never were.",
          "Wire the workflow's error output to a Slack or email node. The failure mode you will actually hit is one record in fifty being rejected for a bad field value, and a silent workflow means finding out when someone asks why the product is not live.",
        ],
      },
      {
        h: "Two rate limits, and they are not the same shape",
        p: [
          "Airtable allows 5 requests per second per base, and going over gets that base locked out for 30 seconds - a burst can fail an entire run rather than slowing it. Batch with a Loop Over Items node at 10 records, which is Airtable's own maximum per write call.",
          "Shopify's REST Admin API is a leaky bucket: 2 requests per second sustained on a standard plan with a burst allowance of about 40. A 429 from Shopify is expected traffic shaping rather than a bug, and the response carries a header telling you how full the bucket is. Turn on Retry On Fail on the Shopify node and it recovers by itself.",
          "The practical consequence is that Shopify is the slower side, so pace the workflow to it. A 400-variant catalogue sync is a few minutes of steady calls, not a burst - give the execution a realistic timeout instead of assuming it hung.",
        ],
      },
      {
        h: "Where Airtable stops being the right place for this",
        p: [
          "Be honest about the ceiling, because it arrives sooner than people expect. Airtable's per-base record limits sit in the tens of thousands on most plans, and a base holding one row per variant plus order history will reach that on a store that is doing perfectly ordinary volume. When it does, the failure is not graceful - writes start rejecting and there is no incremental fix, only a migration.",
          "Real-time stock is the other poor fit. Airtable is not transactional and the sync is a poll, so between two runs the base and the store disagree. For a store where overselling matters, stock should live in Shopify or in a proper database and Airtable should read it, not own it. If you want a database on the other end instead, the Shopify and PostgreSQL pairing is the same idea without this ceiling.",
          "Two-way sync on the same field is the trap worth naming outright. If both Airtable and Shopify can change a price, you need conflict resolution, and there is no honest way to do that with two polls and a timestamp. Pick a direction per field - Airtable owns copy and pricing, Shopify owns stock and orders - and enforce it by only writing the fields that side owns.",
        ],
      },
      {
        h: "Nineteen templates, and what varies between them",
        p: [
          "This pairing has a modest set here rather than hundreds, which is a fair reflection of the problem: there are only so many genuinely different shapes, and most of the work in any of them is the field mapping, which is specific to your base either way.",
          "What changes between one of these and the one you want is nearly always parameters: which Airtable view the search reads, which fields the Set node maps, whether the Shopify step is create, update or an inventory call, and the direction of the write-back. The parts that take real time when you start from an empty canvas - the create-versus-update branch, the ID write-back, the batching - are already in the file.",
        ],
      },
    ],
  },
  {
    slug: "google-sheets-and-microsoft-teams",
    title: "Google Sheets to Microsoft Teams with n8n: alerts and digests",
    description:
      "Post Google Sheets data into Microsoft Teams with n8n. The Graph permission that blocks unattended posting, Workflows replacing Office 365 connectors, Adaptive Cards, and why the Teams side is harder than Slack.",
    nodes: ["Schedule Trigger", "Google Sheets", "IF", "Microsoft Teams"],
    sections: [
      {
        h: "Which nodes you need, and why this is harder than it looks",
        p: [
          "The Google half is straightforward: a Schedule Trigger (or a Google Sheets Trigger), a Google Sheets node reading a range, and an IF node deciding whether anything is worth posting. The Teams half is where the time goes, and anyone arriving from a Slack workflow should expect that.",
          "Slack lets a bot token post to a channel in about five minutes. Microsoft Graph does not have an equivalent easy path for unattended posting, and the difference is not a setting you have missed - it is deliberate on Microsoft's side. Budget an hour for the first Teams credential and none for the ones after it.",
        ],
      },
      {
        h: "The Microsoft Graph permission that stops most workflows",
        p: [
          "n8n's Microsoft Teams node authenticates against Microsoft Graph through an Azure app registration. Graph splits permissions into delegated - the app acts as a signed-in user - and application, where it acts as itself with no user present.",
          "An unattended n8n workflow is the application case, and posting a channel message with application permissions is a protected API at Microsoft: the permission exists, admin consent is not sufficient on its own, and access is granted through a request process rather than a checkbox. This is the single most common reason a Teams workflow that tests fine in the editor fails on a schedule.",
          "Delegated permissions - ChannelMessage.Send with a signed-in account - work without that, and are what most people end up using. The trade-off is a refresh token tied to a user, so the workflow breaks when that account's password changes or they leave. Use a dedicated service account rather than a person's, and note in the workflow description whose account it runs as, because in eighteen months nobody will remember.",
        ],
      },
      {
        h: "Incoming webhooks, and why old tutorials no longer apply",
        p: [
          "The other route into a channel is an incoming webhook, and this is where documentation ages badly. The classic Office 365 connector webhook - the one every older tutorial tells you to create from a channel's Connectors menu - has been retired by Microsoft in favour of the Workflows app, which is Power Automate wearing a different name.",
          "The practical version today: create a Workflows flow on the channel with a 'when a webhook request is received' trigger, take the URL it gives you, and call it from an HTTP Request node with a JSON body. It is not the Teams node and it does not need an app registration at all, which for a one-channel notification is a considerable saving.",
          "The limits are real, though. A webhook posts as a workflow rather than as a bot, it can only reach the channel it was created on, it cannot read anything, and it cannot reliably notify people - so this is the right choice for a digest and the wrong one for anything that needs an @mention to land.",
        ],
      },
      {
        h: "Formatting: Adaptive Cards, not Markdown",
        p: [
          "Teams messages are not Slack messages with different syntax. A plain-text Graph message accepts a narrow subset of HTML, and the readable option is an Adaptive Card - a JSON document describing the layout, which you build in a Set or Code node and pass through.",
          "Build the card JSON in a Code node rather than assembling it as a string with expressions embedded in it. A spreadsheet cell containing a quote mark will break a hand-concatenated JSON string, and the resulting error names a parse failure rather than the cell.",
          "Cards have a size ceiling in the region of 28KB, which sounds generous until a workflow renders 400 spreadsheet rows into a table. Post a summary and a link to the sheet rather than the sheet's contents - it is both smaller and more useful.",
          "Mentions inside a card require an entities block naming the user's Azure AD object ID, not their display name and not their email. If a message needs to get someone's attention, that lookup is a step in the workflow, not a formatting detail.",
        ],
      },
      {
        h: "A worked example: a Monday morning pipeline digest",
        p: [
          "The concrete case: a sheet where the sales team logs deals, and a Teams channel that should get one message every Monday at 9am summarising the week rather than a notification per row.",
          "Start with a Schedule Trigger set to a cron expression for Monday 09:00, and set the workflow's timezone explicitly in its settings. n8n defaults to the instance timezone, so a schedule authored in one place and running in another fires at the wrong hour - and a weekly job takes a week to prove it.",
          "A Google Sheets node reads the deals range. Give it the explicit range rather than the whole sheet: pulling A1:Z10000 to use forty rows costs quota on every run and makes the execution log unreadable. Immediately after it, an IF node checking that the key column is non-empty discards the blank-looking trailing rows Google returns, which otherwise become rows of empty strings in the digest.",
          "Then a Code node does the aggregation - total value, count by stage, the three largest deals - and builds the Adaptive Card JSON in the same step. Doing both in one node is deliberate: the numbers and the layout change together, and splitting them across two nodes means editing both every time someone asks for another column.",
          "An IF node on the deal count guards the post, so a quiet week produces silence rather than a card full of zeros. Then the Teams node, or an HTTP Request node against the Workflows URL, posts the card.",
          "Set the Teams node to Retry On Fail with two attempts. Graph returns transient 503s often enough that a weekly job without retries will miss a Monday every few months, and a digest that skips a week without saying so is worse than no digest.",
        ],
      },
      {
        h: "Going the other way, and why it is mostly not worth it",
        p: [
          "Teams to Google Sheets - logging channel activity into a spreadsheet - is possible but consistently disappointing, and it is better to say so than to let you find out.",
          "There is no simple channel-message trigger equivalent to Slack's. Receiving messages needs either Graph change notifications, which require a publicly reachable HTTPS endpoint, an explicit subscription that expires and must be renewed on a schedule, and in many tenants the same protected-API approval as posting; or a real bot registered through the Bot Framework. Both are a project rather than a node.",
          "If the goal is capturing structured input from a team, a form writing to the sheet directly - and a Teams message linking to it - gets you there in ten minutes with nothing to renew. Reserve the Graph subscription route for cases where the message itself genuinely is the data.",
        ],
      },
    ],
  },
  {
    slug: "http-rest-api-and-mysql",
    title: "Webhooks and REST APIs into MySQL with n8n, safely",
    description:
      "Write webhook and REST API data into MySQL with n8n. Test vs production webhook URLs, verifying signatures before you touch the database, parameterised queries, ON DUPLICATE KEY UPDATE, and burst traffic.",
    nodes: ["Webhook / Schedule Trigger", "HTTP Request", "Set", "MySQL"],
    sections: [
      {
        h: "Two workflows that look the same and are not",
        p: [
          "This pairing covers two shapes, and picking the wrong one is the usual reason a workflow is fragile. In the pull shape, n8n asks: a Schedule Trigger, an HTTP Request node calling an API, and a MySQL node writing the result. In the push shape, something calls n8n: a Webhook node receives a payload and a MySQL node stores it.",
          "Prefer push when the source supports it. Polling an API every five minutes to notice a change that happened three seconds after the last run is both slower and more expensive than being told. Pull is for sources with no webhooks, for backfills, and for reconciliation - which is worth running even when you have webhooks, because webhooks get missed.",
          "There is no MySQL trigger node, so the database is always the destination in the first shape and never the initiator. Anything that needs to react to a database change is a Schedule Trigger polling a table.",
        ],
      },
      {
        h: "The Webhook node's two URLs",
        p: [
          "The n8n Webhook node has a test URL and a production URL, and confusing them accounts for a large share of 'my webhook does not fire'. The test URL only listens while you have clicked Listen for Test Event in the editor, and it stops the moment the editor closes. The production URL works only when the workflow is active.",
          "So the sequence that actually works is: build against the test URL, activate the workflow, then update the registration at the source to the production URL. A payload sent to a test URL of an inactive workflow returns 404 and n8n logs nothing, which reads like the sender's fault.",
          "By default the node responds as soon as it receives the request, which is what you want - the sender gets its 200 immediately and the database work happens after. If you switch to responding from a Respond to Webhook node, everything before that node runs inside the sender's timeout window, and most senders give you a handful of seconds.",
        ],
      },
      {
        h: "Verify the payload before it reaches the database",
        p: [
          "A production webhook URL is a public endpoint that writes to your database. Anyone who learns the URL can post to it, and URLs leak - into logs, into screenshots, into a support ticket.",
          "Most serious senders sign their requests: a header carrying an HMAC of the raw body computed with a shared secret. Verify it in a Code node before anything else, comparing against the raw body rather than the parsed JSON - re-serialising changes whitespace and key order, and the signature will not match. Where the sender offers no signature, n8n's Webhook node supports header auth and basic auth, and a long random token in a header is far better than nothing.",
          "Then treat the payload as untrusted input all the way to the query. Use the MySQL node's query parameters rather than building SQL by concatenating values from earlier nodes. This is not only about injection - a customer whose surname contains an apostrophe breaks a concatenated INSERT on an ordinary Tuesday.",
        ],
      },
      {
        h: "Writing rows that survive a retry",
        p: [
          "Webhook senders retry deliveries they believe failed, and they are frequently wrong about that - a slow response counts as a failure. So the same payload arriving twice is normal traffic, and a plain INSERT turns it into two rows.",
          "Add a unique key on whatever the source calls its event or object ID and use INSERT ... ON DUPLICATE KEY UPDATE through the MySQL node's execute-query operation. A duplicate delivery then overwrites the row it already wrote, which is a no-op, instead of duplicating it.",
          "Store the raw payload alongside the parsed columns, in a JSON or TEXT column. Six months later you will want a field nobody extracted, and having the original means writing a query instead of asking the source to replay a quarter of history. Watch max_allowed_packet if payloads are large - the default on some managed MySQL instances is smaller than a fat webhook body, and the error mentions packets rather than size.",
          "Batch inserts where the source sends arrays. Passing 500 items through a loop into single-row inserts is 500 round trips; a multi-row INSERT is one. If you must loop, put the MySQL node after a Loop Over Items node with a batch size in the hundreds rather than letting n8n execute per item.",
        ],
      },
      {
        h: "A worked example: signed webhooks into an events table",
        p: [
          "The pattern that holds up under load separates receiving from processing, and it is worth building that way from the start.",
          "The receiving workflow is four nodes. A Webhook node set to POST and to respond immediately. A Code node that reads the signature header, recomputes the HMAC over the raw body with the secret from an n8n credential or environment variable, and throws when they differ. A Set node that pulls out three things and no more: the source's event ID, the event type, and the whole body. Then a MySQL node running INSERT ... ON DUPLICATE KEY UPDATE into an events table with a unique index on the event ID, a processed_at column left null, and a jsonb-style payload column.",
          "That workflow does nothing else. No enrichment, no Slack message, no third-party call - because every one of those is a way for the endpoint to become slow enough that the sender starts retrying, and a retrying sender under load is how endpoints get disabled.",
          "The processing workflow is separate: a Schedule Trigger every minute, a MySQL SELECT for rows where processed_at is null with a LIMIT, whatever the actual business logic is, then an UPDATE stamping processed_at after the work succeeds. Stamping before means a crash loses the event silently.",
          "The reason to split it this way is not tidiness. When the processing logic has a bug - and it will - you fix the second workflow and re-run it against rows you already hold, instead of asking the source for six weeks of history it may not keep. Store timestamps as UTC, incidentally: MySQL's DATETIME carries no timezone, and a server that moves regions takes the ambiguity with it.",
        ],
      },
      {
        h: "Where n8n is the wrong thing in front of a database",
        p: [
          "n8n is an excellent ingestion endpoint at ordinary volumes and a poor one at high volume, and the boundary is worth knowing before you find it.",
          "There is no queue in front of the Webhook node. Each delivery starts an execution, and executions hold a database connection while they run. A burst - a bulk import at the source, a replay after an outage - can open more connections than MySQL's max_connections allows, at which point unrelated workflows start failing with connection errors that look like a database problem rather than a traffic problem. Set a modest connection pool, and cap concurrency in n8n's settings rather than assuming it will pace itself.",
          "The other limit is execution storage. Saving every successful execution of an endpoint receiving thousands of events a day will fill n8n's own database faster than the data you are collecting. Turn off saving successful executions for high-volume webhook workflows and keep error executions only - the events table is your log, and it is a better one.",
          "If the volume is genuinely high, the honest answer is that a small purpose-built endpoint writing to a queue belongs in front of n8n, with n8n consuming from that queue. Using n8n for the orchestration and something dumber for the receiving is not a failure of the tool; it is what the tool is good at.",
        ],
      },
    ],
  },
  {
    slug: "discord-and-jira",
    title: "Jira and Discord with n8n: issue alerts, and issues from chat",
    description:
      "Connect Jira to Discord with n8n. Cloud vs Data Center credentials, JQL filters that cut webhook noise, the Atlassian Document Format that breaks messages, and creating issues from a Discord command.",
    nodes: ["Jira Trigger", "Jira", "Set", "Discord"],
    sections: [
      {
        h: "What this pairing is for",
        p: [
          "Jira is where work is tracked and Discord is where a certain kind of team actually is - games studios, open-source projects, communities that adopted Discord long before they adopted a tracker. Jira's own notifications go to email, which those teams do not read.",
          "The useful jobs are narrower than the integration surface suggests: announce issues entering a status that means something, such as Blocked or Ready for QA; alert on a new issue in a specific project or above a priority threshold; warn when an issue sits unassigned past some age; and turn a bug reported in a channel into a real Jira issue so it stops living in scrollback.",
          "Jira stays the record. The temptation with a chat-first team is to let the channel become the status, and the result is a tracker nobody trusts. Discord should tell people the record changed, not be the record.",
        ],
      },
      {
        h: "Cloud or Data Center - decide before you touch credentials",
        p: [
          "n8n's Jira node handles both, and they are different products with different authentication. Getting this wrong is the first thing that happens to most people, and the error messages do not point at it.",
          "Jira Cloud - anything at atlassian.net - authenticates with your account email plus an API token created from your Atlassian account security settings, sent as basic auth. The token is not your password, and the email must be the account's, not an alias.",
          "Jira Server and Data Center use a Personal Access Token created inside the Jira instance itself, sent as a bearer token, and n8n has a separate credential type for it. A Data Center instance is also frequently not reachable from the internet, which matters for webhooks: a self-hosted n8n inside the same network is fine, n8n Cloud is not.",
          "Whichever you are on, the token carries the permissions of the account that made it. A workflow returning empty results from a project you can see in the browser is nearly always a token belonging to an account without Browse Projects on it.",
        ],
      },
      {
        h: "JQL is the noise filter, and it belongs in the webhook",
        p: [
          "A Jira webhook subscribed to all issue events on an active project is unusable within a day. Every field edit, every comment, every automation rule's own updates fire it.",
          "Jira webhooks take a JQL filter, and that is the right place to cut volume - it stops the event ever being sent rather than discarding it after n8n has been woken up. project = OPS AND priority in (High, Highest) is a one-line change that removes most of the traffic.",
          "JQL filters which issues, not which changes, so pair it with a check on the event body. The changelog in the payload lists the fields that actually changed; an IF node continuing only when the status field is among them is what turns 'this issue was touched' into 'this issue moved'.",
          "Registering the webhook needs Jira admin rights. In many organisations that is not you, which is worth discovering before you have built the workflow - the fallback is a Schedule Trigger running a JQL search every few minutes, which is unglamorous and works.",
        ],
      },
      {
        h: "Atlassian Document Format: why the message is full of JSON",
        p: [
          "Jira Cloud stores descriptions and comments in Atlassian Document Format - a nested JSON tree of content nodes, not text, not Markdown, not the old wiki markup. Passing an issue description straight into a Discord message produces a wall of braces, and this surprises everyone once.",
          "For most alerts, do not render it at all. An issue key, a summary, a status, an assignee and a link is a better message than a reproduced description, and it fits comfortably in Discord's limits. The person who needs the detail clicks through.",
          "Where you genuinely need the text, walk the ADF tree in a Code node and concatenate the text nodes, accepting that formatting is lost. Do not attempt a full ADF-to-Markdown conversion inside a notification workflow - it is a real piece of work and it is not what you set out to build.",
          "Going the other way, Jira Cloud's v3 API expects ADF when creating an issue with a description, so a plain string is rejected. The minimal wrapper - a doc with one paragraph containing one text node - is enough, and building that in a Set node is a two-minute job once you know that is what it wants.",
        ],
      },
      {
        h: "A worked example: a Blocked channel that stays useful",
        p: [
          "The case worth building first: when an issue moves to Blocked, post it to a Discord channel, and post again when it unblocks, so the channel shows what is currently stuck rather than a history of everything that ever was.",
          "Register a Jira webhook on issue_updated with the JQL project = ENG. Then in n8n, an IF node reads the changelog and continues only when an item in it has field equal to status. A Switch node on the new value splits Blocked from everything else, with the everything-else branch checking whether the old value was Blocked - that is the unblock case.",
          "The Blocked branch runs a Set node building the message from the issue key, summary, assignee display name and a permalink assembled as your Jira base URL plus /browse/ plus the issue key. Use the key, not the numeric ID: the ID is in the payload and is meaningless to a human, and a link built from it does not resolve the way people expect.",
          "Post it with a Discord node as an embed rather than plain text. Embeds allow 4,096 characters against a message's 2,000, they render a title as a link, and a coloured left border makes blocked and unblocked distinguishable at a glance in a busy channel.",
          "For the unblock case, post to the same channel with a different colour rather than deleting the original. Deleting works and it destroys the record of how long things stay stuck, which is the one genuinely useful number this workflow can produce.",
          "One deployment note: Jira retries a webhook it thinks failed and gives up quietly after repeated failures. If the channel goes silent after an n8n restart or a URL change, re-save the trigger to force re-registration rather than looking for a bug in the workflow.",
        ],
      },
      {
        h: "Going the other way: Discord to Jira",
        p: [
          "A Discord Trigger on a slash command feeding the Jira node's create-issue operation turns a support channel into an intake path. Set the project key and issue type explicitly - Jira requires both, and the error when one is missing names neither.",
          "The obstacle is required custom fields. A Jira project configured with mandatory fields on its create screen rejects any issue that omits them, and the API error is a field ID rather than a label. Create one issue by hand first, read it back through the API, and you will see exactly which IDs the project insists on.",
          "Discord expects a response to a slash command within three seconds. Jira issue creation is not reliably that fast, so acknowledge immediately and create the issue afterwards, then post the issue link as a follow-up. Put the Discord message link in the issue description so the issue carries its own context back to the conversation.",
        ],
      },
      {
        h: "Six templates, and being straight about it",
        p: [
          "This pairing has a short list here. That is not an accident of stocking - Jira-to-Discord is a narrow, well-defined problem, and the graph is five or six nodes. A page claiming a hundred meaningfully different workflows would be padding, and the hundred would be the same file with a different channel ID.",
          "The consequence is that adapting is cheap. The differences between one of these and the one you want are the JQL on the webhook, the field you watch in the changelog, the values you branch on, the fields lifted into the embed, and the destination channel. The parts that cost an afternoon from an empty canvas - the changelog check, the ADF handling, the permalink construction, the three-second acknowledgement on the reverse path - are already solved in the file.",
          "If Jira admin rights are the blocker, or the project needs a shape none of these has, a custom build is a fixed quote rather than a subscription. And the pairings below share one of these two tools with considerably more inventory behind them.",
        ],
      },
    ],
  },
  {
    slug: "airtable-and-slack",
    title: "Airtable and Slack with n8n: alerts, approvals and intake",
    description:
      "Connect Airtable to Slack with n8n. Slack mrkdwn is not Markdown, Block Kit approvals and the three-second rule, breaking the write-back trigger loop, and when Airtable's own automations are the better answer.",
    nodes: ["Airtable Trigger", "Airtable", "Set", "Slack"],
    sections: [
      {
        h: "Start by checking you need n8n for this",
        p: [
          "It is worth saying this first, because it saves some people an afternoon: Airtable has built-in automations, and one of them posts to Slack. If what you want is 'when a record enters this view, post a message to this channel', build it in Airtable. It is five clicks, there is no credential to maintain, and it will outlive any workflow you write.",
          "n8n earns its place when the automation is more than one hop. Enriching the record from a third system before posting; posting to a channel chosen by a field value; interactive approvals that write back; joining Airtable to a database or an API that Airtable's automations cannot reach; or anything where you want the logic under version control and visible to more than the base's owner.",
          "The templates here are mostly that second category. If yours is the first, the honest answer is that the native automation is better, and that is a reasonable thing to learn from this page.",
        ],
      },
      {
        h: "Which nodes you need",
        p: [
          "Both sides are first-party. The common shape is an Airtable Trigger polling a view, a Set node building the message, and a Slack node posting it. Approvals add a second workflow with a Webhook node receiving Slack's interaction callback and an Airtable node writing the outcome back.",
          "Point the Airtable Trigger at a view rather than a table. A view is a saved filter, so 'records where Status is Ready and Owner is set' becomes something the base's owner can adjust without touching n8n, and the trigger stops firing on records nobody cares about.",
        ],
      },
      {
        h: "Slack mrkdwn is not Markdown",
        p: [
          "Slack's text format looks like Markdown and differs in exactly the places that matter, so a message assembled from Airtable fields comes out subtly wrong.",
          "Links are the main one: Slack wants <https://example.com|the label>, not [the label](https://example.com). Markdown link syntax is not rendered, it is printed, so the message shows the brackets and the URL to everyone in the channel. Bold is single asterisks, not double. Italic is underscores. There are no headings and no tables.",
          "An Airtable long-text field with rich formatting enabled stores Markdown, which means the one place you will definitely hit this is passing a description field straight through. Convert it, or send a truncated plain-text version with a link to the record.",
          "For anything structured, use Block Kit rather than fighting the text format - a JSON layout of sections and fields, built in a Code node. It renders predictably, it is what buttons require, and the same blocks array works in a message and in a modal.",
        ],
      },
      {
        h: "The write-back loop, and how to break it",
        p: [
          "Airtable's trigger fires on record creation and on modification, and modification includes changes your own workflow made. A workflow that posts to Slack and then writes a Notified timestamp back to Airtable triggers itself, posts again, writes again, and does not stop.",
          "Break it in the view, not in n8n: filter the view to records where the notified field is empty. Writing the timestamp then removes the record from the view rather than re-triggering it. This is more reliable than trying to detect your own edits, because Airtable's change payload does not clearly say who made the change.",
          "Write back after the Slack node, never before. Marking a record notified and then failing to post loses it permanently, and there is nothing in the record to indicate that happened.",
          "Airtable allows 5 requests per second per base, shared across every workflow and automation touching it, and exceeding it locks the base out for 30 seconds. Batch writes at 10 records per call - Airtable's own maximum - and stagger schedules if several workflows hit the same base.",
        ],
      },
      {
        h: "A worked example: an approval that writes back",
        p: [
          "The case that justifies n8n over a native automation: a new request lands in Airtable, someone approves or rejects it from Slack without opening Airtable, and the record updates.",
          "This is two workflows, and expecting it to be one is the usual mistake.",
          "The first is the notifier. An Airtable Trigger on a Pending Approval view, a Code node building a Block Kit message with the request details and two buttons, and a Slack node posting it. Each button carries a value containing the Airtable record ID - that is how the second workflow knows which record the click refers to, and there is nowhere else to put it.",
          "The second is the receiver. A Webhook node whose production URL you paste into your Slack app's Interactivity settings. Slack posts the interaction payload there, and it requires a 200 within three seconds - so the very first node after the webhook responds, and the Airtable update happens after. A workflow that does the Airtable write before responding shows the approver an operation-timed-out error even when the write succeeded, and they click again.",
          "After responding, a Code node parses the payload - Slack sends it form-encoded with a JSON string in a payload field, which catches people expecting plain JSON - and pulls out the action value and the approving user. An Airtable update node then writes Status, the approver and a timestamp onto the record ID from the button.",
          "Finally, update the original Slack message rather than posting a new one, using the response_url from the payload with a Slack node or an HTTP Request. Replacing the buttons with a line reading approved by whoever, at whenever, means the channel cannot be double-approved by a second person clicking a stale message - which is the failure this design exists to prevent.",
          "Because the approved record now leaves the Pending view, the notifier will not fire on it again. The two halves rely on the same view filter, which is worth a comment in the workflow.",
        ],
      },
      {
        h: "Going the other way: Slack to Airtable",
        p: [
          "A Slack Trigger into the Airtable node's upsert operation, matching on the Slack message timestamp, turns channel activity into rows without duplicating when Slack retries a delivery. Trigger on a specific emoji reaction rather than every message - it makes capture deliberate, and it means a human has decided the message is worth keeping.",
          "Register the trigger's Request URL in your Slack app's Event Subscriptions and activate the workflow in n8n before pasting the URL. Slack calls it immediately to verify it, and an inactive workflow fails that check.",
          "Attachments need care. Slack file URLs in the url_private field require the bot token in an Authorization header to download; fetching one without it returns an HTML sign-in page. Since Airtable fetches attachment URLs itself and cannot send your token, you must download the file in n8n and re-host it somewhere publicly reachable before handing Airtable a URL - passing url_private straight through attaches a login page to the record.",
        ],
      },
    ],
  },
  {
    slug: "http-rest-api-and-notion",
    title: "Notion's REST API in n8n: the HTTP Request node, properly",
    description:
      "Call Notion's API from n8n's HTTP Request node. The Notion-Version header everyone forgets, paginating block children, building property payloads by hand, the 3-requests-per-second limit, and idempotent imports.",
    nodes: ["Schedule Trigger", "HTTP Request", "Split Out", "Notion"],
    sections: [
      {
        h: "When to leave the Notion node behind",
        p: [
          "n8n's Notion node covers pages, database queries, blocks and users, and for most workflows it is the right tool - it simplifies Notion's property objects into something you can reference without ceremony. Use it wherever it fits.",
          "The HTTP Request node is for the rest: endpoints the node does not expose, filter and sort combinations more complex than the node's UI offers, block types it does not construct, and anything Notion shipped after the node was last extended. It is also the escape hatch when the node's simplification is the problem - it flattens properties helpfully right up until you need the raw structure.",
          "You do not need a second credential. Set the HTTP Request node's authentication to Predefined Credential Type and pick your existing Notion credential, and n8n attaches the token. Pasting the secret into a header by hand means rotating it in several places later.",
        ],
      },
      {
        h: "The header that makes every call fail",
        p: [
          "Notion requires a Notion-Version header on every request. Omit it and the API returns 400 with a message about a missing version - not an auth error, not a 404, and not something the credential test will catch, because the credential is fine.",
          "This is the single most common failure when moving from the Notion node to HTTP Request, because the node sets the header for you and its absence is invisible until you are writing the call yourself. Add it to the node's header parameters explicitly.",
          "Pin a version and write it down. Notion ships breaking changes behind that header, and the whole point of it is that your integration keeps working until you choose to move. A workflow that silently follows the latest version is a workflow that breaks on Notion's schedule rather than yours - so treat a version bump as a change you make deliberately and test, not a default you inherit.",
        ],
      },
      {
        h: "Pagination, twice over",
        p: [
          "Notion paginates with a cursor: responses carry has_more and next_cursor, and the following request sends that value as start_cursor. Page size defaults to 100 and caps there. Configure the HTTP Request node's built-in pagination against those fields and set a maximum page count as a backstop - a stop condition that never becomes true loops until the execution times out.",
          "Database queries are the easy case. Page content is the one that catches people: retrieving a page gives you its properties, not its text. The text lives in child blocks, fetched from a separate endpoint, also paginated at 100.",
          "And blocks nest. A toggle, a column, a bulleted item with children - each has its own children, and each needs its own paginated request. Reading a page of any real length is a recursive walk, not a call, and doing it in a Code node with an explicit depth limit is far more predictable than trying to express recursion as a loop of n8n nodes. If you only need the first level, say so and move on; if you need the whole tree, budget for it being the bulk of the workflow.",
        ],
      },
      {
        h: "Building property payloads by hand",
        p: [
          "The Notion node hides this and the HTTP Request node does not: every property is an object keyed by its type, and the shapes are not guessable.",
          "A title is a title array containing rich-text objects, each with a text object with a content string. Rich text is the same shape under a rich_text key. A number is a bare number under number. A select is an object with a name. A multi-select is an array of those objects. A relation is an array of objects each carrying a page id. A date is an object with start, optionally end, in ISO 8601. A person is an array of objects with Notion user IDs, which are not email addresses.",
          "Formula, rollup, created_time, created_by, last_edited_time and last_edited_by are read-only, and including any of them in an update fails the entire request rather than ignoring the field. Build the payload in a Code node listing only writable properties, rather than passing an object through from upstream and hoping.",
          "The fastest way to get a shape right is to create one page by hand in Notion exactly as you want it, then GET it through the HTTP Request node and read the response. Copying the structure back is quicker and more reliable than working from the property reference.",
        ],
      },
      {
        h: "A worked example: an idempotent API import",
        p: [
          "The concrete job: pull a paginated list from some external API into a Notion database every night, without creating duplicates when a record appears in two runs.",
          "The key decision is where identity lives, and it is not Notion's page ID. Add a plain text property to the database - call it External ID - and treat it as the join key. Notion page IDs are generated on create and you cannot supply one, so without an external key there is no way to ask 'do I already have this'.",
          "The workflow is a Schedule Trigger, an HTTP Request node fetching the source with pagination configured and a page cap, and a Split Out node on whatever array the response nests the records in. Skipping Split Out is why imports sometimes produce one Notion page containing the whole payload.",
          "Then, per item, a POST to Notion's database query endpoint with a filter on External ID equals this record's ID. That is the lookup. An IF node on whether the results array is empty splits create from update: empty goes to a page-create with the database as parent, non-empty goes to a page-update against the first result's ID.",
          "This is deliberately one query per record, which is slow and correct. The alternative - fetching the whole database once and matching in memory - is faster and quietly wrong as soon as the database outgrows a couple of thousand rows and someone edits it mid-run.",
          "Pace it. Notion allows roughly three requests per second per integration and returns 429 with a Retry-After header. Since each record costs at least two calls, a 500-record import is several minutes of steady traffic. Enable Retry On Fail on the Notion calls - it honours Retry-After - put a Loop Over Items node around the per-record section with a small batch size and a short Wait between batches, and give the execution a timeout that reflects reality rather than one that kills it at minute two.",
        ],
      },
      {
        h: "Where Notion is the wrong destination",
        p: [
          "Notion is a document store with a database-shaped view over it, and treating it as a database has a ceiling that arrives sooner than the marketing suggests.",
          "Three requests per second is the binding constraint on anything bulk. Importing 50,000 rows is not a long job, it is an unreasonable one - hours of paced calls that any interruption restarts. Rich text caps at 2,000 characters per block and a create call at 100 blocks, so long documents are a chunking exercise. There is no transaction, so a half-failed import leaves the database half-updated with no rollback.",
          "The API also cannot do several things people assume it can: it cannot create or modify views, cannot set formula definitions, and cannot manage permissions. Anything requiring those is a manual step, and a workflow that pretends otherwise fails in a confusing way.",
          "If the data is genuinely tabular, changes often, and is measured in tens of thousands of rows, it belongs in a database with Notion holding a curated slice - and the pairings for PostgreSQL and MySQL are the better starting point. Notion is excellent as the place humans read and annotate the result, and poor as the system of record underneath it.",
        ],
      },
    ],
  },
  {
    slug: "google-sheets-and-notion",
    title: "Google Sheets and Notion with n8n: migrate or keep in sync",
    description:
      "Move data between Google Sheets and Notion with n8n. Mapping untyped cells onto Notion's typed properties, why row numbers are not identity, writing the page ID back, and why two-way sync usually is not worth it.",
    nodes: ["Schedule Trigger", "Google Sheets", "Set", "Notion"],
    sections: [
      {
        h: "Which direction, and be honest about it",
        p: [
          "Three jobs hide behind 'connect Sheets and Notion', and they need different builds. A one-off migration, where a spreadsheet becomes a Notion database and the sheet is then abandoned. A continuous one-way feed, where a sheet fed by a form or an export keeps a Notion database topped up. And two-way sync, where both sides can edit.",
          "The first two are straightforward. The third is not, and most people asking for it want the second - they want their team editing in Notion while some upstream process appends to a sheet, which is one-way with a different mental model.",
          "Decide which you are building before you start, because the identity design differs and retrofitting it means reprocessing everything.",
        ],
      },
      {
        h: "Untyped cells meeting typed properties",
        p: [
          "A spreadsheet cell is a string with formatting on top. A Notion property has a type that the API enforces. Most of the work in these workflows is that boundary, and most of the failures are there too.",
          "Numbers are the common one. A cell displaying 1,250 or £1,250 or 45% is a formatted string, and Notion's number property rejects all three. Strip separators and symbols in a Set or Code node and send a bare number. Percentages need dividing by 100 or not, depending on how the sheet stores them - check one row rather than assuming.",
          "Dates need ISO 8601. Google's display format follows the spreadsheet's locale, so a column reading 03/04/2026 is ambiguous and n8n will not warn you which way it resolved. Set the Google Sheets node to return unformatted values where you can, or parse explicitly with a known format string rather than letting a date library guess.",
          "Select properties reject values that are not already options unless the integration may create them. A sheet with inconsistent casing - Active, active, ACTIVE - produces three options or three failures. Normalise before writing.",
          "Empty cells are the quiet one. Google omits trailing empty cells entirely rather than returning empty strings, so a row's later fields can be missing rather than blank, and an expression referencing one resolves to undefined. Sending undefined to Notion is not the same as sending an empty value; guard the mapping with defaults.",
        ],
      },
      {
        h: "Row numbers are not identity",
        p: [
          "This is the design mistake that quietly ruins these workflows. A spreadsheet row has a position, not an identity. Insert a row at the top, sort the sheet, delete a row, and every row below moves. Any workflow keying on row number then updates the wrong Notion page, and there is no error - the data is simply wrong from that point on, in a way that is very hard to notice.",
          "So give every row a stable key. If the data has a natural one - an order number, an email, a URL - use it. If it does not, add an ID column and fill it once, then never reorder it.",
          "Then write the Notion page ID back into a column on the sheet. That single move turns the whole workflow idempotent: the sheet now knows which pages exist, so the workflow reads that column instead of searching Notion for every row, and re-running it after a half-failure resumes rather than duplicating. It also makes the state legible to a human, which matters when someone asks why one row did not sync.",
        ],
      },
      {
        h: "Credentials on both sides",
        p: [
          "For Google, OAuth2 is quickest on n8n Cloud; a service account is better for anything unattended because it does not break when a person's password changes. The service-account step people miss is sharing: open the JSON key, copy the client_email value ending in .iam.gserviceaccount.com, and share the spreadsheet with that address as you would a colleague. Until you do, every call returns 403 while the credential itself tests fine.",
          "For Notion, create an internal integration and paste its token. Then open the target database, use the connections menu, and add the integration to it. A Notion integration has access to nothing by default: the credential tests green, the API answers, and every query returns empty until the database is explicitly shared. If your Notion node finds no rows in a database you can plainly see, this is why - essentially every time. Sharing a parent page shares everything under it, which is less maintenance than doing each database.",
        ],
      },
      {
        h: "A worked example: a form sheet feeding a Notion tracker",
        p: [
          "The concrete case: a Google Form writes responses to a sheet, and each new response should become a page in a Notion database that the team works from.",
          "Add two columns to the sheet by hand first: Notion Page ID and Synced At. Form submissions append below, so these stay empty on new rows and the workflow fills them - which means the sheet itself shows you what has and has not been processed.",
          "A Schedule Trigger every ten minutes runs a Google Sheets node reading the response range. Do not use the Sheets trigger here: it fires per change, and a form submission plus your two write-backs is three changes for one logical event. Polling and filtering is calmer.",
          "An IF node keeps only rows where Notion Page ID is empty and the key column is not - that second check discards the blank-looking trailing rows Google returns, which otherwise become a run of empty Notion pages.",
          "A Set node maps each column to its Notion property with the conversions above: a bare number for the number field, an ISO date for the date, a normalised value for the select. List the properties explicitly rather than passing the row through, so a new column in the sheet does not silently break the write.",
          "The Notion node creates the page. Then a Google Sheets node using Append or Update, matching on your ID column, writes the returned page ID and a timestamp back. Match on the ID column, never on row number, and make sure that column is genuinely unique - matching on an email in a sheet where someone submitted twice overwrites the wrong row.",
          "Order matters: create in Notion first, write back second. Reversed, a Notion failure leaves rows marked as synced with no page behind them, and nothing in the sheet says so.",
          "Both sides are rate-limited - Notion at roughly three requests per second, Google at around 300 reads per minute per project - so put a Loop Over Items node around the per-row section for large backfills and enable Retry On Fail on both nodes. A first run against two years of existing responses is the one that trips this; steady-state runs of a handful of rows never will.",
        ],
      },
      {
        h: "Why two-way sync is usually the wrong ask",
        p: [
          "If both sides can edit the same field, you need conflict resolution, and neither system gives you what that requires.",
          "Notion exposes a last-edited timestamp per page. Google Sheets does not expose a per-cell or per-row edit time through the API at all. So the last-write-wins rule that people reach for cannot be evaluated - you cannot tell whether the sheet's value is newer than Notion's, only that they differ. Workflows that guess end up overwriting deliberate edits, and the person who made the edit does not find out.",
          "There is also no change feed on either side. Both are polls, so two edits within one interval collapse into one observation, and a workflow writing to both sides can trigger its own next poll and oscillate.",
          "The version that works: split ownership by field, not by row. Notion owns the fields humans edit - status, owner, notes. The sheet owns the fields the upstream process produces. Each field is written by exactly one side, and the workflow only ever writes fields the other side owns. That is not really two-way sync, it is two one-way syncs that do not overlap, and it is the only arrangement of this that stays correct.",
          "If you genuinely need concurrent editing with conflict handling, neither of these is the right store, and the honest recommendation is a database with an application in front of it rather than a workflow trying to referee.",
        ],
      },
    ],
  },
  {
    slug: "google-drive-and-slack",
    title: "Google Drive and Slack with n8n: file alerts and archiving",
    description:
      "Connect Google Drive to Slack with n8n. The autosave problem that spams a channel, downloading Slack files with url_private, Slack's replaced upload API, and sharing links that are not 403s for everyone else.",
    nodes: ["Google Drive Trigger", "Google Drive", "Set", "Slack"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "Drive to Slack is a Google Drive Trigger watching a folder, optionally a Drive node fetching metadata or the file itself, and a Slack node posting. Slack to Drive is a Slack Trigger on a file-shared event, an HTTP Request node downloading the file, and a Drive upload.",
          "Watch a specific folder rather than the whole drive. A folder makes the automation legible to the people using it - dropping a file in is a visible action with an obvious effect - and it stops the workflow firing on every unrelated document in the account.",
        ],
      },
      {
        h: "The autosave problem",
        p: [
          "This is the thing that makes a Drive-to-Slack workflow unbearable within a day, and it is not obvious from the trigger's configuration.",
          "Google Docs, Sheets and Slides save continuously. A Drive Trigger set to fire on file updates in a folder containing a document someone is actively editing will fire repeatedly while they type. Point it at Google's native formats and you have built a keystroke logger that posts to Slack.",
          "So default to watching for file creation rather than update. Creation is a discrete event with a clear meaning - something new arrived - and it is what most of these workflows actually want.",
          "Where you genuinely need updates, filter hard: check the MIME type early and skip Google-native formats, or compare the modified time against the last run and enforce a minimum gap. And if the goal is 'tell me when this document changes meaningfully', accept that Drive cannot tell you that - a daily digest of what changed is a more honest design than trying to detect meaningfulness from an API that only reports that bytes moved.",
          "The trigger polls rather than pushes, so there is a delay of up to the poll interval regardless. This is not an instant-notification tool, and building as though it is leads to disappointment on both ends.",
        ],
      },
      {
        h: "Posting a link people can actually open",
        p: [
          "The most common complaint about these workflows is that the Slack message arrives and everyone who clicks it gets a permission screen. The workflow is fine; the file is not shared.",
          "A Drive file's default permissions are its folder's, and a file created by an automation inherits whatever the creating account has. If the workflow runs as a service account, the file may be visible to precisely one identity that is not a person.",
          "Fix it before posting, not after: the Drive node's share operation sets a permission on the file. A domain-wide reader permission is usually the right level for an internal channel - it means anyone in your organisation who has the link can open it, without making the file public. Do that step in the workflow, so the link in the message is guaranteed to work rather than usually working.",
          "Post the webViewLink from the file metadata rather than assembling a URL from the file ID. Google has more than one URL shape depending on file type, and a hand-built link to a Google Doc opens the wrong viewer.",
        ],
      },
      {
        h: "A worked example: archiving Slack uploads to Drive",
        p: [
          "The concrete case, and the one with the most sharp edges: files shared in a Slack channel should be copied into a dated Drive folder so they survive Slack's retention.",
          "A Slack Trigger on the file_shared event starts it. The event gives you a file ID and not much else, so a Slack node fetching the file info comes next - that is where the name, MIME type, size and the download URL live.",
          "Now the part that catches everyone. Slack's download URL is in url_private, and it is not public. Fetching it without credentials returns Slack's sign-in page as HTML with a 200 status. The workflow does not error; it uploads a login page to Drive with the right filename, and the failure is only discovered when somebody opens the archive months later.",
          "So download with an HTTP Request node with authentication set to your Slack credential, or with an explicit Authorization header carrying the bot token, and set the response format to file rather than JSON. Then add a guard: an IF node checking the returned content type is not text/html before the upload. That one node is the difference between an archive and a folder of login pages.",
          "The Drive upload then needs a destination folder. Creating a folder per month keeps it navigable - a Code node producing the folder name from the current date, a Drive search for that name, and an IF node creating it when the search comes back empty. Do not create it unconditionally: Drive happily allows several folders with the same name, and you will end up with four folders called 2026-08.",
          "Finally post a confirmation back into the thread with the Drive link, so the person who uploaded it can see it was archived and where. Set the Slack and Drive nodes to Retry On Fail - both APIs return transient 5xx often enough to matter on a workflow that runs whenever anyone uploads anything.",
          "Going the other way, note that Slack's file upload API changed: the old single-call files.upload endpoint was retired in favour of a two-step flow that gets an upload URL and then completes the upload. If you are posting files into Slack and following an older tutorial, that is why it returns an error about a deprecated method. Keep the n8n version current and let the node handle it rather than hand-rolling the calls.",
        ],
      },
      {
        h: "Credentials, and the seven-day surprise",
        p: [
          "Drive uses OAuth2: enable the Drive API in a Google Cloud project, create an OAuth client with n8n's redirect URL, and connect it. While the consent screen is in Testing mode, refresh tokens expire after seven days - which is why a Drive workflow reliably stops working about a week after it was set up, with no change on your side. Publish the app, or accept re-authorising weekly.",
          "drive.readonly is enough to watch and download. The full drive scope is needed only if the workflow moves, renames or shares files - and sharing is exactly what the previous section requires, so most real workflows need it.",
          "A service account suits unattended operation and shared drives, with two caveats. It only sees files explicitly shared with its address, and it has no personal Drive storage quota of its own - uploading to My Drive as a service account fails with a quota error that says nothing about service accounts. Upload to a shared drive, or have the service account write into a folder owned by a real account that has granted it access.",
          "On the Slack side, reading files needs files:read, posting needs chat:write, and channels:read lets you pick channels from a dropdown. Private channels also need groups:write and an /invite for the bot, or Slack returns not_in_channel regardless of scopes.",
        ],
      },
      {
        h: "What this pairing is not",
        p: [
          "It is not a backup system. The Drive trigger polls, misses nothing in normal operation and everything during an n8n outage, and has no reconciliation - if the workflow is down for a day, those files are simply not archived and nothing will notice. If the requirement is durability, run a periodic reconciliation that lists both sides and copies the difference, and treat the event-driven workflow as the fast path rather than the guarantee.",
          "It is also memory-bound. Files pass through n8n, so a 500MB video dropped into a watched folder is 500MB in the execution, and large files will fail the run on a modestly sized instance. Filter on MIME type and size early so the workflow only downloads what it can carry, and route the rest to a message saying a human should handle it.",
        ],
      },
    ],
  },
  {
    slug: "google-drive-and-google-sheets",
    title: "Google Drive and Google Sheets in n8n: files into rows",
    description:
      "Automate Google Drive with Google Sheets in n8n. The self-triggering loop a sheet inside a watched folder creates, exporting native formats, service-account storage quota errors, and per-row document generation.",
    nodes: ["Google Drive Trigger", "Google Drive", "Extract from File", "Google Sheets"],
    sections: [
      {
        h: "One credential, two APIs",
        p: [
          "Both nodes authenticate against the same Google account, so this is the rare pairing with no second credential to set up. There is still a step people miss: the Google Cloud project needs both the Drive API and the Sheets API enabled, and the Sheets node needs Drive regardless of whether your workflow touches files, because it uses Drive to resolve spreadsheets by name.",
          "A project with only the Sheets API enabled fails at the document picker rather than at sign-in, which reads like a permissions problem with the spreadsheet rather than a missing API.",
          "The service-account trap here is specific and worth stating plainly: a service account has no Drive storage quota of its own. Creating or copying a file into My Drive as a service account fails with a storage quota error that never mentions service accounts, and no amount of sharing fixes it. Either work inside a shared drive, or have the service account write into a folder owned by a real account that has granted it write access.",
        ],
      },
      {
        h: "The loop that only this pairing has",
        p: [
          "Here is the thing that catches people who have built Drive workflows before: a Google Sheet is a Drive file. Not a separate kind of object - a file, in a folder, with a modified time.",
          "So a workflow with a Drive Trigger watching a folder, which then writes to a spreadsheet that lives in that same folder, modifies a file in the folder it is watching. The trigger fires again. It writes again. It does not stop, and because each iteration is a legitimate-looking execution, the first sign of trouble is usually the quota error rather than the loop itself.",
          "Keep the output spreadsheet outside the watched folder. That is the whole fix, it costs nothing, and it is invisible as a requirement until you have hit it once. If the sheet must live there for human reasons, filter the trigger by MIME type and exclude Google Sheets explicitly, but moving the file is more robust - the next person to build on this will not know about the filter.",
          "The same applies to the Processed folder pattern below: moving a file out of a watched folder into a sibling folder is safe, moving it into a subfolder of the watched one is not, because folder watches include descendants.",
        ],
      },
      {
        h: "Getting data out of the file",
        p: [
          "Extract from File handles CSV, XLSX, PDF, DOCX and plain text, and it is the node between a downloaded file and rows.",
          "Native Google formats are not files in the ordinary sense and cannot be downloaded directly - they have to be exported. The Drive node's download operation lets you pick a conversion target, so export a Google Doc as plain text or a Google Sheet as CSV before extraction. Attempting a straight download of a native format returns an error about the file not being downloadable, which is accurate and unhelpful.",
          "For a Google Sheet specifically, do not export it at all - read it with the Sheets node, which gives you typed rows and header-based field names instead of a CSV blob you then have to parse.",
          "Scanned PDFs contain images and no text layer. Extraction returns empty output rather than an error, so a workflow processing them appends blank rows quietly. Check for empty text after extraction and route those files somewhere a human will see them.",
        ],
      },
      {
        h: "A worked example: a CSV inbox that fills a master sheet",
        p: [
          "The concrete job: suppliers drop CSVs into a Drive folder, and each one should be parsed and appended to a master spreadsheet, with handled files moved out of the way.",
          "Four folders' worth of thinking, two folders in practice: Inbox, which the trigger watches, and Processed, a sibling - not a child. The master spreadsheet lives in neither, for the reason above.",
          "A Google Drive Trigger on file creation in Inbox starts it. An IF node immediately after checks the MIME type is text/csv and skips anything else, so someone dropping a PDF in produces a skipped execution rather than a failure. Then a Drive node downloads the file, and Extract from File parses it into items - one per CSV row, with the header row becoming field names.",
          "Validate before appending. A Code node checking that the expected columns are present, and that the row count is above zero, catches the two things that actually go wrong: a supplier changing their export format, and an empty file. Route failures to a Slack message or an email naming the file, because the alternative is a master sheet quietly accumulating malformed rows.",
          "Add provenance columns in a Set node - the source filename, the Drive file ID, and an ingestion timestamp. When a number in the master sheet is questioned in three months, those three columns are what let you answer, and adding them later means the historical rows never have them.",
          "Then a single Google Sheets Append node receives all the items at once. Appending row by row inside a loop is the most common way to hit Google's quota of roughly 300 requests per minute per project; passing the whole set to one node is one call.",
          "Finally a Drive node moves the file to Processed. Do that after the append, not before - a move that succeeds followed by an append that fails leaves the file archived and its data absent, with nothing to indicate it. Moving after means a failure leaves the file in Inbox, and re-running picks it up. That is also why the move is better than a delete: the file is the receipt.",
          "One caveat on re-running: since the trigger fires on creation, a file already in Inbox from before the workflow existed will not be picked up. Run a one-off Schedule-triggered version listing the folder for the backfill, rather than touching each file to make it look new.",
        ],
      },
      {
        h: "The other direction: a sheet that generates documents",
        p: [
          "The reverse pattern is per-row document generation - a spreadsheet of clients, and one document per row from a template.",
          "The shape is a Schedule Trigger or manual run, a Sheets node reading the rows, then per row: a Drive node copying a template file, and either a Docs node or an HTTP Request against the Docs API doing a find-and-replace for the placeholders. Copying a Google Doc and replacing text is far more reliable than generating a document from scratch, because the formatting already exists and you are only substituting values.",
          "Write the resulting file's ID and link back into the sheet against the row, using Append or Update matched on a stable ID column - never on row number, which changes when anyone sorts or inserts. That write-back is also what makes the workflow re-runnable: rows with a file ID are skipped.",
          "Copying files is quota-heavy relative to reading. A run generating several hundred documents should sit behind a Loop Over Items node with a batch size and a short Wait, with Retry On Fail on the Drive node, rather than firing them all at once and finding out where the ceiling is.",
        ],
      },
      {
        h: "Where this stops being the right tool",
        p: [
          "Sheets has a hard ceiling of ten million cells per spreadsheet, and long before that it becomes slow to open and slower to write. A master sheet accumulating a few thousand rows a week will get there, and the failure at the end is not graceful.",
          "The honest signal to move is when the sheet stops being read by humans. A spreadsheet nobody opens, that exists so that other automations can query it, is a database with a bad query language and a per-minute quota. At that point the same workflow writing to PostgreSQL or MySQL is faster, cheaper and easier to query - keep a Sheets view for the humans if they want one, fed from the database rather than being it.",
          "This is also not an ETL tool for large files. Everything passes through n8n's memory, so a 200MB CSV will fail the execution on a typical instance regardless of how the workflow is written. Split large files at the source, or process them somewhere built for it.",
        ],
      },
    ],
  },
  {
    slug: "google-sheets-and-hubspot",
    title: "Google Sheets and HubSpot with n8n: imports and exports",
    description:
      "Move contacts between Google Sheets and HubSpot with n8n. Batch upsert on email, internal property names, the midnight-UTC rule for date properties, lifecycle stages that will not move backwards, and associations.",
    nodes: ["Schedule Trigger", "Google Sheets", "Set", "HubSpot"],
    sections: [
      {
        h: "Which nodes you need",
        p: [
          "Sheet into CRM is a Schedule Trigger or manual run, a Google Sheets node reading rows, a Set node mapping columns to HubSpot properties, and a HubSpot node writing. CRM into sheet is the reverse, with the HubSpot node searching and the Sheets node appending.",
          "n8n's HubSpot node covers contacts, companies, deals, tickets and engagements. The batch endpoints and the associations API are not fully exposed, so bulk work and relationship-building go through an HTTP Request node - set its authentication to Predefined Credential Type and reuse the HubSpot credential rather than pasting the token again.",
          "For credentials, HubSpot removed API keys at the end of 2022. Create a Private App under Integrations in HubSpot settings and use its access token. Grant scopes narrowly: crm.objects.contacts.read for reading, the matching .write scope only if the workflow writes. A missing scope returns a 403 naming the scope required, which is one of the friendlier errors in this stack.",
        ],
      },
      {
        h: "Labels are not property names",
        p: [
          "HubSpot shows you labels and stores internal names, and a mapping written against the label silently writes nothing. This is the first thing that goes wrong in every import.",
          "A property labelled Lead Score might be lead_score, or score, or a generated name if it arrived through an import. Look it up in HubSpot's property settings rather than inferring it from the label - the internal name is shown there, and guessing costs more time than checking.",
          "Reads have the mirror problem: HubSpot returns a thin default set of properties and nothing else. A contact export missing half its fields is almost never a permissions issue, it is a request that did not list the properties it wanted. Ask for them explicitly, by internal name.",
          "Calculated and read-only properties - createdate, lastmodifieddate, hs_object_id, anything HubSpot computes - are rejected on write and fail the whole record. Build the payload in a Set node listing only the properties you intend to write, rather than passing a row straight through.",
        ],
      },
      {
        h: "Two field rules that are not guessable",
        p: [
          "Date properties are the sharpest edge. HubSpot has two temporal types, and for the date type it requires a timestamp at exactly midnight UTC. Send an epoch that lands at 09:14 and the API rejects the record with a message about the value not being valid for the property type, which does not tell you that the problem is the time of day. Normalise dates to midnight UTC in the Set node. The datetime type takes any timestamp, so knowing which type each property is matters before you map it.",
          "Lifecycle stage is the other one, and it is a behaviour rather than a validation. HubSpot will not move a lifecycle stage backwards - a contact at Customer cannot be set back to Lead by a normal update. The call returns success and the value does not change, which is the worst combination. Moving it backwards requires clearing the property first and then setting it, as two operations. A sheet-driven import that assumes it can overwrite lifecycle stage will appear to work and quietly do nothing for exactly the records that needed it.",
        ],
      },
      {
        h: "A worked example: a list import that does not duplicate",
        p: [
          "The concrete job: a spreadsheet of leads from an event, imported into HubSpot without creating duplicates, and re-runnable when someone adds more rows.",
          "Do not loop. The instinct is a HubSpot node per row, and for a thousand rows that is a thousand requests against a limit of roughly 100 per 10 seconds - several minutes of deliberate rate-limiting. HubSpot's batch upsert endpoint takes up to 100 records per call, turning that into ten.",
          "So: a Google Sheets node reads the range. An IF node drops rows where the email column is empty, because email is the key the whole design rests on and a row without one cannot be deduplicated. A Set node maps columns to internal property names, normalising any date properties to midnight UTC and casting numbers out of their formatted strings.",
          "Then a Code node chunks the items into groups of 100 and builds the batch payload - an inputs array where each entry has an id of the email address, an idProperty of email, and a properties object. An HTTP Request node POSTs each chunk to the contacts batch upsert endpoint using the predefined HubSpot credential.",
          "Upsert on email rather than create. HubSpot deduplicates contacts by email address, so a plain create against one that already exists returns a conflict, and retrying does not help. Upsert makes the whole import idempotent, which means re-running it after adding rows updates the existing contacts instead of failing on them.",
          "Now the part that gets skipped: batch endpoints report per-record failures inside the response body rather than failing the call. A 2xx does not mean all 100 landed. Parse the response, count the errors, and write them back to the sheet in a Status column - or at minimum post a summary to Slack. Without that, a batch where eighteen records were rejected for a bad property value looks exactly like one where all hundred succeeded.",
          "Writing the status back to the sheet also gives you the re-run story: filter to rows without a success status, and a second run picks up only what failed. Match the write-back on the email column, not on row number.",
        ],
      },
      {
        h: "Associations, which the sheet cannot express",
        p: [
          "A spreadsheet is flat and a CRM is a graph, and the gap shows up as soon as contacts need to belong to companies.",
          "Creating a contact with a company name in a property does not associate it with a company record - it sets a text field that looks right in the UI and participates in nothing. The association is a separate object, created through the associations API with the two record IDs and an association type.",
          "So the import becomes three passes: upsert companies keyed on domain, upsert contacts keyed on email, then create the associations using the IDs returned by the first two. Trying to do it in one pass means you do not have the IDs yet.",
          "HubSpot can also auto-associate a contact to a company by email domain, if that setting is enabled in the portal. It is a reasonable shortcut for straightforward B2B data and a bad one where several unrelated contacts share a generic domain - check the setting before relying on either behaviour, because which one is active changes what your workflow needs to do.",
        ],
      },
      {
        h: "Exporting the other way, and the 10,000 ceiling",
        p: [
          "Pulling HubSpot records into a sheet uses the search endpoint, which takes a filtered JSON body and returns up to 100 per page behind a cursor. Configure the HTTP Request node's pagination against paging.next.after and stop when the field is absent - with a maximum page count as a backstop, because a stop condition that never fires loops until the execution times out.",
          "The ceiling that catches people: any single search query returns at most 10,000 results, no matter how you paginate. Page 101 does not exist. For a full export, slice by a date range - createdate between two values - and run the query once per slice, then concatenate. Trying to page past the limit returns nothing rather than an error.",
          "Every record comes back wrapped, with the fields under a properties object alongside id and createdAt. So an expression referencing the email directly is undefined and the one referencing it under properties is what you meant. A Split Out node on the results array followed by a Set node lifting properties to the top level, done once immediately after the call, means every node after it can be written normally.",
          "Then write with a single Sheets Append rather than per row, and be clear about what the sheet is for. A sheet as a point-in-time export for analysis or for sharing outside the CRM is a good use. A sheet maintained as a continuously synced mirror of HubSpot is a poor one - it is always slightly stale, it has no conflict handling, and HubSpot's own lists and reports do the segmentation job better. If someone is asking for the mirror, it is worth finding out what they actually want to see.",
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
