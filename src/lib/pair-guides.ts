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
  /**
   * The template the guide's worked example walks through, linked under the
   * sections. A worked example that names a real file and then does not let
   * you open it is asking to be taken on trust, which is the thing these pages
   * are trying to stop doing.
   */
  example?: { route: string; title: string };
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
    title: "Airtable and n8n: how the node is actually configured",
    description:
      "What the Airtable n8n node looks like in 1,105 working templates - create vs upsert vs search, the matchingColumns key, the LastModified column filterByFormula needs, and why the trigger is used exactly once.",
    nodes: ["Schedule Trigger", "Airtable (search)", "Set", "Airtable (upsert)"],
    example: {
      route: "push-airtable-product-edits-to-shopify",
      title: "Push Airtable product edits to Shopify",
    },
    sections: [
      {
        h: "The three operations that cover almost everything",
        p: [
          "`n8n-nodes-base.airtable` appears 2,521 times across the 1,105 templates here, and three operations account for effectively all of it: `operation: \"create\"` in 1,615 nodes, `operation: \"search\"` in 505, and `operation: \"upsert\"` in 407.",
          "That distribution is the shape of most Airtable automation. Write rows as things happen; read back the ones that changed; and where re-running has to be safe, upsert instead of create. Delete barely appears, and neither does anything schema-level - these workflows put data into tables somebody else designed.",
          "Both `base` and `table` are resource locators rather than plain string IDs. In all 2,521 nodes they are set to `mode: \"list\"`, the dropdown form, which is the friendly option in the editor and the one that has a consequence on import - see below.",
        ],
      },
      {
        h: "Field mapping: autoMapInputData or defineBelow",
        p: [
          "`columns.mappingMode` decides how incoming data becomes columns, and it is `autoMapInputData` in 2,066 nodes. That takes each field name on the incoming item and writes it to the column of the same name. It is concise, and it makes the Set node immediately upstream into your schema contract: whatever that node emits is what the write attempts.",
          "The alternative is `defineBelow`, which gives an explicit `columns.value` object mapping each column to an expression. Use it as soon as your column names differ from your data's field names, or when a column name contains a space - `Order ID`, `Item Count`, `Source Subject` all appear in these files and none of them survives auto-mapping from a field called `order_id`.",
          "`columns.matchingColumns` is what turns `upsert` into an actual upsert, and it is set on 428 nodes. The values are stable identifiers from the source system rather than anything derived from content: `messageId` on 104, `leadId` on 58, `jobId` on 49, `requestId` on 45, `documentId` on 34, `contactId` on 31, `orderId` on 18. An upsert with no matching column configured is a create, which means a re-run duplicates rather than corrects.",
        ],
      },
      {
        h: "The column filterByFormula assumes you have",
        p: [
          "503 nodes set `filterByFormula` to exactly `{LastModified} > DATEADD(NOW(), -1, 'days')`. It is the standard incremental-read filter in this catalog: ask Airtable for records touched in the last day, rather than paging the whole table.",
          "The formula is evaluated on Airtable's side and it references a column literally named `LastModified`. No base has that column by default - you add it as a Last Modified Time field, and the name has to match including the capitalisation. If it does not exist, the search does not raise a connection error. It returns zero records, the workflow completes green, and a sync that appears healthy moves nothing. This is the failure that takes longest to notice, because everything downstream is written to handle an empty result gracefully.",
          "The window is also fixed at one day. If your workflow runs hourly it re-reads twenty-four hours of records every hour, which costs API calls but is otherwise harmless; if it runs weekly it silently skips six days out of seven. Match the interval to the formula, or change the formula to match the interval.",
        ],
      },
      {
        h: "The trigger is used once in 1,105 templates",
        p: [
          "`n8n-nodes-base.airtableTrigger` exists and appears exactly once across the whole set, with `triggerField: \"Last Modified\"`. Everything else starts from a schedule, a webhook, a form or another workflow, and reaches Airtable with a `search`.",
          "That is not an oversight, it is what the tool supports. The Airtable trigger polls - it asks for records whose trigger field has moved since the last check - so it is a scheduled read wearing a different hat, and its interval is the floor on how fast anything reacts. Given that, the templates mostly do the polling explicitly with a Schedule Trigger and a `search`, which is more visible and lets the filter be anything rather than one field.",
          "The practical consequence: if you need to react to an Airtable edit within seconds, neither option delivers it. Airtable has no outgoing webhook in play here. Design for a polling interval you can live with, or push from whatever is editing the record instead of watching the record.",
        ],
      },
      {
        h: "Credential, and the thing that is not one",
        p: [
          "The node cards mark `🔑 Airtable PAT`. Airtable retired user-level API keys, so this is a Personal Access Token created in your Airtable account and scoped to the specific bases the workflow touches.",
          "Grant it record read, plus record write if the workflow creates or updates, plus schema read if you want n8n's base and table dropdowns to populate. That last scope is optional and you will want it: without schema read the pickers stay empty and you are typing the app- and tbl-prefixed IDs by hand into every node.",
          "The `credentials` block is stripped from every workflow file in this catalog, so on import each Airtable node shows an empty credential selector. That is packaging rather than damage - you create the credential once and pick it.",
          "What is not a credential, and is the most common first-run failure: all 2,521 nodes ship with `base.value` and `table.value` set to the empty string, carrying only a `cachedResultName` placeholder. The dropdown displays text - `Email Automation Base`, `Documents`, `Leads` - so the field looks populated. Nothing is bound. Every Airtable node in an imported template needs its base and table re-picked before it will run.",
        ],
      },
      {
        h: "The fields wrapper, and node names that lie",
        p: [
          "Airtable's API does not return a record as a flat object. Fields arrive nested under a `fields` key alongside the record id, so an expression reading the column name directly off a record straight out of Airtable is undefined, and the same name under `fields` is what you meant. The templates that read from Airtable guard for both shapes - `{{ $json.fields ? $json.fields['Title'] : $json['Title'] }}` - because whether the wrapper is present depends on which node produced the item.",
          "Note the bracket syntax in that expression. Column names with spaces cannot be reached with dot notation, and `Shopify Product ID` is a column name these files actually use. If you rename a column in Airtable's UI, every expression referencing it by name breaks silently and nothing warns you - renaming is a one-click action in Airtable and a breaking change in n8n.",
          "Separately, 156 nodes across these files are named some variant of upsert and thirty-seven of them run a different operation - thirty-six are `n8n-nodes-base.googleSheets` with `operation: \"appendOrUpdate\"`, which is a genuine upsert under another name, and one is `n8n-nodes-base.notion` with `operation: \"create\"`, which is not. When you are auditing a template for idempotency, read the `operation` parameter rather than the caption on the canvas.",
        ],
      },
      {
        h: "A worked example: Airtable as the source of truth",
        p: [
          "`Push Airtable product edits to Shopify` is seven nodes and is the one template in the set built on the Airtable trigger, which makes it the clearest illustration of both the trigger and the `fields` wrapper.",
          "`n8n-nodes-base.airtableTrigger` watches a table with `triggerField: \"Last Modified\"` - it re-reads on a schedule and emits records whose Last Modified value has advanced. Its `base` and `table` are the same unbound `mode: \"list\"` locators as everywhere else, showing `Your Shopify base` and `Products` as placeholder text.",
          "A Set node maps four columns into flat fields, each with the both-shapes guard: `{{ $json.fields ? $json.fields['Shopify Product ID'] : $json['Shopify Product ID'] }}` and the same for `Title`, `Tags` and `Status`.",
          "An IF node named Has Shopify ID? checks `shopify_product_id` is not empty, and this is the load-bearing node. A product row that has never been pushed to Shopify has no ID, and calling Shopify's update with an empty ID is an error rather than a create. The false branch goes to a `n8n-nodes-base.noOp` named Skip Unlinked Row, which is the correct behaviour: rows that are not yet linked are not failures.",
          "The true branch runs `n8n-nodes-base.shopify` with `resource: \"product\"`, `operation: \"update\"`, `productId` from the mapped field, and `updateFields` carrying `title`, `tags` and `status`. It sets `retryOnFail` with `maxTries: 3` and `waitBetweenTries: 2000`, and `onError: \"continueErrorOutput\"` so a rejected update takes the error branch instead of stopping the run.",
          "To reuse the pattern against something other than Shopify, the first four nodes are unchanged - trigger, map with the wrapper guard, check the external ID exists, branch. Only the final node changes.",
        ],
      },
      {
        h: "What the 1,105 templates actually cover",
        p: [
          "The base and table placeholder names are a fair index of the set, because they were written per workflow rather than generated: `Email Automation Base` on 458 nodes with an `Emails` table, `Document Processing Base` on 330 with `Documents` on 452, `AI Agents Base` on 315, `Content Generation Base` on 272 with `Drafts`, `Lead Generation Base` on 217 with `Leads`, `Workflow Automation Base` on 184 with `Jobs`, then RAG, social, CRM and e-commerce bases in the low hundreds.",
          "So the depth is in Airtable-as-a-log: something is processed and a row records it. If that is your use, this is a large set. If you are looking for Airtable-as-an-app - interfaces, complex linked-record graphs, formula-heavy bases driven from n8n - it is thinner, and the linked-record case in particular needs a lookup before every write, because a Linked Record field takes an array of record IDs rather than names.",
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
    title: "Trello and Discord: how the integration actually works",
    description:
      "What a Trello-Discord integration looks like in practice, and how the six n8n templates here build it - trelloTrigger on a board, the listAfter field that distinguishes a move from a rename, and the Discord webhook that only ever posts.",
    nodes: ["Trello Trigger", "Set", "Filter", "IF", "Discord"],
    example: {
      route: "post-new-and-moved-trello-cards-to-a-discord-channel",
      title: "Post new and moved Trello cards to a Discord channel",
    },
    sections: [
      {
        h: "There is no native Trello-Discord integration",
        p: [
          "Trello does not post to Discord, and Discord does not write to Trello. Neither vendor ships a connector for the other, so anything that looks like a Trello-Discord integration is a third piece of software sitting between them, reading events from one and calling the other's API.",
          "Two mechanisms exist to do that, and Trello's Power-Up directory offers neither for Discord. The first is Trello's outgoing webhook, which POSTs a JSON body to a URL you nominate every time something happens on a board. The second is Discord's incoming webhook, a per-channel URL that turns an HTTP POST into a message. An integration is whatever joins those two ends and decides which events are worth forwarding - and that decision is most of the work, because a Trello board emits an event for every field edit.",
          "n8n is one way to be that middle piece: you host it (or use their cloud), and the joining logic is a graph of nodes rather than code. The six templates on this page are that graph, pre-built. What follows is what they actually contain - read it as a description of the problem, whether or not you use these files.",
        ],
      },
      {
        h: "The node graph, as the six files build it",
        p: [
          "Both directions are represented. Trello-to-Discord starts at `n8n-nodes-base.trelloTrigger`, which registers the outgoing webhook against a board; Discord-to-Trello starts at the generic `n8n-nodes-base.webhook` node, and a scheduled digest starts at `n8n-nodes-base.scheduleTrigger`. Between the ends sit `n8n-nodes-base.set` to flatten the payload, `n8n-nodes-base.filter` or `n8n-nodes-base.if` to drop events nobody wants, and sometimes `n8n-nodes-base.code` to aggregate.",
          "Worth naming explicitly, because it is the thing people expect and do not get: there is no Discord trigger node in any of these six files. The template that turns a chat message into a card listens on a plain `n8n-nodes-base.webhook` at `path: \"discord-to-trello\"` and parses the message text itself with a `!card <title> | <description>` convention. Discord's own event stream is not being consumed. If you need a bot that reacts to messages in general, this is not that, and no parameter change will make it that.",
          "The Trello side uses `n8n-nodes-base.trello` with `resource: \"card\"` for `operation: \"create\"` and `operation: \"update\"`, and `resource: \"list\"` for `operation: \"getCards\"`. Moving a card between lists is an `update` that sets `updateFields.idList` - the same call as any other edit, with a different field in the body.",
        ],
      },
      {
        h: "The Discord side is a webhook, in all fourteen nodes",
        p: [
          "Every one of the fourteen `n8n-nodes-base.discord` nodes across these six templates carries `authentication: \"webhook\"`, and every one sets `content` - a plain string. None uses a bot token, none builds an embed, none reads anything.",
          "That is a design constraint, not an oversight, and it decides what these files can do. A Discord incoming webhook URL is bound to exactly one channel forever, carries no scopes, and cannot fetch history, add reactions, or manage threads. It also cannot fail an authorisation check, which is why setup is a copy-paste of one URL rather than an OAuth app, a bot user and an invite.",
          "One template sets `options.threadName`, which posts into a thread on the webhook's channel. That is the full extent of the Discord surface used here. If your requirement involves reading messages or reacting to them, you need a bot token and the channel-select form of the node, which no file in this pair uses - none of these six is a starting point for it.",
        ],
      },
      {
        h: "What you have to create before any of it runs",
        p: [
          "On the Trello side, an API key and a token: the node cards mark this `🔑 Trello API`. On the Discord side, one incoming webhook URL per channel you post to, marked `🔑 Discord webhook URL`. Nothing else.",
          "The workflow JSONs ship with no credential objects at all - the `credentials` block is stripped from every file in the catalog - so on import each Trello and Discord node shows an empty credential selector. That is expected. You create the two credentials once in n8n and pick them; you are not repairing a broken file.",
          "Board and list IDs are the other prerequisite, and they are not credentials. Get a board ID by opening the board and appending `.json` to its URL; get a list ID from the same document. You need them before the trigger will register.",
        ],
      },
      {
        h: "Two things that will catch you, both visible in the files",
        p: [
          "First: the IDs are read from environment variables with a literal fallback. The trigger's `id` parameter is `{{ $env.TRELLO_BOARD_ID || 'YOUR_BOARD_ID' }}`, and the card-creating node's `listId` is `{{ $env.TRELLO_LIST_ID || 'YOUR_LIST_ID' }}`. If those variables are not set in your n8n environment, the expression does not error - it resolves to the string `YOUR_BOARD_ID`, and Trello is asked about a board with that ID. Either set the two variables before activating, or replace the expressions with the IDs directly. Note also that `$env` is unavailable in n8n Cloud, so on Cloud the substitution is the only option.",
          "Second: `updateCard` does not mean the card moved. Trello fires that action type for a rename, a description edit, a due-date change and a move, and the four are distinguished only by which sub-object the payload carries. The templates handle this by extracting `action.data.listAfter` in a Set node and filtering on it - a move populates `listAfter`, a rename leaves it absent. A workflow that filters on `action.type` alone posts every typo correction to your channel, which is how these integrations get muted in week one.",
          "A third, smaller one: the eighteen nodes that call an external API in these files all set `retryOnFail` with `maxTries: 3` and `waitBetweenTries: 2000`, and `onError: \"continueErrorOutput\"`. That second setting sends failures out of the node's second output into an error branch rather than stopping the run. If you extend one of these graphs and wire only the first output, a failed Discord post will vanish silently - the error branch is there precisely so it does not.",
        ],
      },
      {
        h: "A worked example: new and moved cards, in nine nodes",
        p: [
          "`Post new and moved Trello cards to a Discord channel` is the file to read first, because it contains the whole pattern and nothing else.",
          "`n8n-nodes-base.trelloTrigger` registers against the board ID and receives every board action. A Set node immediately flattens what matters out of the nested payload into seven named fields: `action.type` becomes `actionType`, `action.data.card.name` becomes `cardName`, `action.memberCreator.fullName` becomes `member`, and the three list fields - `action.data.listBefore`, `action.data.listAfter`, `action.data.list` - become `listBefore`, `listAfter` and `listName`, each guarded so an absent object yields an empty string rather than an error.",
          "The card link is assembled rather than read: `{{ 'https://trello.com/c/' + $json.action.data.card.shortLink }}`. The card's `id` is also in the payload and is not a URL anyone can open - `shortLink` is the one that resolves in a browser.",
          "A Filter node then keeps only two cases: a `createCard`, or an `updateCard` that carries a non-empty `listAfter`. That is the noise gate described above, and it is the reason this workflow reports moves rather than edits. An IF node splits the survivors so a new card and a moved card get different wording, two Set nodes build the two message strings, and both feed the same Discord node.",
          "The failure path is wired: the Discord node's error output goes to a Set node that captures the reason, which posts to a second Discord webhook. So a Discord outage produces a notice on a different channel instead of silence.",
          "To adapt it you change four things and nothing else: the board ID on the trigger, the list names you care about in the Filter, the message text in the two Set nodes, and the webhook URL on the Discord node.",
        ],
      },
      {
        h: "Six templates, and why that is the honest number",
        p: [
          "This pair has six templates here. That is not a placeholder for a library still being filled - it is what the problem is worth. Trello-to-Discord is a four-to-nine node graph, and the six files cover the distinct shapes: board events to a channel, a scheduled board digest, an overdue-card alert, a card created from a chat command, a card moved by a chat command, and the checklist variant.",
          "Past that, the differences between one workflow and the next are parameters - which board, which list, which channel, what the message says - not different graphs. So the useful thing to know is that adapting is a five-minute edit, and a page listing sixty near-identical variants would be padding a number rather than adding anything.",
          "If you want the Discord side connected to something with more inventory behind it, the pairs listed below share one of these two tools and have considerably more.",
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
    title: "Notion and Discord: pages in one, alerts in the other",
    description:
      "How a Notion-Discord integration is built in practice - databasePage as the only resource used, thirteen nodes named upsert that run create, and the database sharing step that no credential covers. From 195 n8n templates.",
    nodes: ["Trigger", "Set", "IF", "Notion", "Discord"],
    example: {
      route: "digest-long-emails-with-notion-and-discord-at-scale",
      title: "Digest long emails: Notion & Discord",
    },
    sections: [
      {
        h: "What the connection is for",
        p: [
          "Notion is where a team writes things down; Discord is where it notices them. Neither has a connector for the other, so joining them means a third program reading one and calling the other's API.",
          "Across the 195 templates here the direction is overwhelmingly one way: something produces structured data, a Notion page records it, and Discord announces that it happened. 349 of the 462 Notion nodes are creates. Discord is the notification surface, not a source - and that asymmetry is the single most useful thing to know before you start, because people arrive expecting a two-way sync and the shape on offer is a write-and-announce pipeline.",
          "If you want the reverse - a Discord message becoming a Notion page - it exists in this set but you build it from a plain webhook, not from a Discord trigger. There is no Discord trigger node in any of these files.",
        ],
      },
      {
        h: "The Notion node only ever touches one resource",
        p: [
          "`n8n-nodes-base.notion` appears 462 times, and 435 of those set `resource: \"databasePage\"`. Not `page`, not `block`, not `user` - a row in a Notion database. That is worth internalising, because Notion's API distinguishes a database page from a regular page sharply, and the properties you can set on one are the columns of its parent database rather than free-form content.",
          "The operations are `create` in 349 nodes, `getAll` in eighty-six - all of which set `returnAll: true` - `appendOrUpdate` in fourteen and `append` in thirteen. The `databaseId` parameter is a resource locator in `mode: \"list\"` on all 435.",
          "`title` is the property most nodes set, typically from an upstream field: `{{ $json.query || $json.requestId }}` in the worked example. Notion requires every database page to have a title property, and it is the one property that cannot be omitted.",
          "The `databaseId.cachedResultName` values show what these databases are meant to hold, and they are a decent map of the set: `Email Database` on eighty-eight nodes, `Document Database` on eighty-six, `Request Database` on forty-eight, `Draft Database` on thirty-one, `Lead Database` on thirty, then ticket, job, contact, event, order and conversation databases in smaller numbers.",
        ],
      },
      {
        h: "The Discord side, in two forms",
        p: [
          "Of 326 `n8n-nodes-base.discord` nodes, 304 use `authentication: \"webhook\"` with a plain `content` string. Twenty-two use `select: \"channel\"` with a `channelId` locator in `mode: \"name\"` - values like `#ai-ops` and `#inbox-ops`.",
          "The two need different credentials and are not interchangeable. A webhook is one URL bound to one channel, write-only, set up in about thirty seconds from that channel's integration settings. The `select: \"channel\"` form needs a Discord application with a bot user, a bot token, and the bot invited to the server with permission to post in that channel. Importing a template and building the wrong one is a common way to lose twenty minutes, so check the node's `authentication` parameter first.",
          "Nothing here reads from Discord, reacts, or manages threads, in either form.",
        ],
      },
      {
        h: "Credentials, and the step that is not a credential",
        p: [
          "`🔑 Notion integration token` and `🔑 Discord webhook URL`, per the node cards. The `credentials` block is stripped from every file in this catalog, so both nodes show empty selectors on import.",
          "Notion's token comes from an internal integration you create in its developer settings. Creating it is not enough, and this is the failure that catches almost everyone: a fresh integration can see nothing in your workspace. You have to open each database the workflow touches and share it with the integration by name. Until you do, the API returns an object-not-found error for a database that plainly exists and that you are looking at, and no amount of checking the token helps.",
          "The same applies to a database you add later. A workflow that has been running for months will fail on a new database for exactly this reason, which makes it worth knowing rather than worth rediscovering.",
          "One more Notion constraint that shapes what you can write: the API caps a single rich-text value at 2,000 characters. A summarisation pipeline handing a model's full output straight into a Notion property will eventually exceed it and fail the whole page write. Truncate before the node, or split the content across blocks.",
        ],
      },
      {
        h: "Thirteen nodes named upsert that create",
        p: [
          "Twenty-three nodes across these files are named some variant of Upsert into Notion. Twenty-two of them are not upserts. Thirteen are `n8n-nodes-base.notion` with `operation: \"create\"`, eight are `n8n-nodes-base.googleSheets` with `operation: \"appendOrUpdate\"` - which is a real upsert, so the caption is fair - and one is `n8n-nodes-base.postgres` with `operation: \"executeQuery\"`.",
          "The thirteen Notion ones matter. `create` makes a new page every time it runs. If the workflow is triggered by a webhook that redelivers, or re-run manually after a partial failure, you get duplicate pages, and Notion has no unique constraint to stop you. The node name says the intent; `operation` says what happens.",
          "Notion's own API has no upsert. To make one, query first with `operation: \"getAll\"` and a filter on your key property, then branch on whether anything came back - `operation: \"appendOrUpdate\"` if yes, `create` if no. That is two extra nodes and it is the difference between a re-run being safe and a re-run doubling your database. The fourteen `appendOrUpdate` nodes in this set are where you can see that pattern already built.",
          "Five nodes here set `columns.matchingColumns` to `messageId` and four to `contactId` - those are the deduplication keys the more careful templates use, and they are a reasonable starting choice: a stable ID from the source system rather than anything derived from content.",
        ],
      },
      {
        h: "A worked example: a webhook, a page, a message",
        p: [
          "`Digest long emails: Notion & Discord` is nine working nodes and shows the standard shape with its branches.",
          "An `n8n-nodes-base.webhook` receives the payload and a Set node collapses the possible input shapes into one `content` field. An `@n8n/n8n-nodes-langchain.informationExtractor` backed by a Groq chat model pulls structured fields out of the text.",
          "An IF node named All Required Fields Found? then does the thing that makes this graph worth reading: it checks the extraction actually produced what the downstream nodes need. The true branch goes to the Notion node - `resource: \"databasePage\"`, `operation: \"create\"`, `databaseId` pointing at `Request Database`, `title` set to `{{ $json.query || $json.requestId }}`. The false branch goes to a Discord node posting a review request instead. A model that returns nothing useful produces a message asking a human to look, rather than an empty Notion page.",
          "Both branches meet at a Merge node in `mode: \"append\"`, so one path continues regardless of which was taken, and a final Discord node posts the completion line with `{{ $now.toFormat('HH:mm') }}`.",
          "Every external call sets `retryOnFail` with `maxTries: 3` and `waitBetweenTries: 2000`. Note that the Notion node here is one of the thirteen named as an upsert while running `create` - if you put this into production against a webhook that can redeliver, add the getAll-and-branch described above.",
          "To adapt: share your database with the integration, pick it on the Notion node, map `title` and any other properties to your columns, and paste your webhook URL into the Discord nodes.",
        ],
      },
      {
        h: "195 templates, and what the number includes",
        p: [
          "All 195 files contain both `n8n-nodes-base.notion` and `n8n-nodes-base.discord` as real nodes on the canvas - the page is filtered on the node graph rather than on the title, so none of them is a Notion template that merely mentions Discord. It is a deep set, and deep in a particular direction: document, email and request processing that lands in Notion and reports to Discord.",
          "Size is the caveat rather than authenticity. The median file here has thirty working nodes and the same 195 also carry 383 `n8n-nodes-base.googleSheets` nodes, 359 `n8n-nodes-base.code` nodes and 290 `n8n-nodes-base.slack` nodes between them - these are multi-tool pipelines that include the pair, not two-tool workflows. The smallest is nine nodes, which is the worked example above, and it is the one to start from if the pair is your whole problem.",
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
    title: "Shopify and Airtable: what the integration has to get right",
    description:
      "How a Shopify-Airtable sync is actually built - the orders/create webhook topic, upsert on an Order ID matching column, and the two type casts that stop Airtable rejecting the row. Read from 19 working n8n templates.",
    nodes: ["Shopify Trigger", "Set", "Code", "Airtable"],
    example: {
      route: "sync-new-shopify-orders-into-airtable",
      title: "Sync new Shopify orders into Airtable",
    },
    sections: [
      {
        h: "What the integration has to do",
        p: [
          "Shopify holds orders in a schema you do not control; Airtable holds a table whose columns you chose. Connecting them means something has to receive an order, reshape it into your columns, and write it without creating a second copy when the same order arrives twice. Neither vendor does this for the other, so the connection is a third system - here, n8n - holding the mapping and the deduplication rule.",
          "The reshaping is not incidental. A Shopify order is a deeply nested object with line items, addresses and money represented as strings; an Airtable table is flat and typed. Most of the work in all nineteen templates on this page is that translation, and most of the ways this integration breaks are translation failures rather than connection failures.",
          "The duplicate problem is the other half. Shopify's webhooks are at-least-once: a delivery it believes failed is retried, and a retry is indistinguishable from a new order unless the write side is keyed. Every template here that ingests orders handles it the same way, described below.",
        ],
      },
      {
        h: "The nodes, and which way data flows",
        p: [
          "Ingest starts at `n8n-nodes-base.shopifyTrigger`. Its only parameter is `topic`, and across these templates that is `orders/create` in fifteen nodes and `products/update` in one. The topic is the subscription - the trigger registers a webhook with Shopify for exactly that event and receives nothing else.",
          "The write side is `n8n-nodes-base.airtable`, which appears fifty-five times across the nineteen files: `operation: \"create\"` in thirty-three, `operation: \"upsert\"` in fourteen, and `operation: \"search\"` in eight. Between them sit `n8n-nodes-base.set` to map fields and `n8n-nodes-base.code` to flatten line items.",
          "Going the other way - Airtable as the source of truth, Shopify as the thing updated - uses `n8n-nodes-base.shopify` with `resource: \"order\"` or `resource: \"product\"` and `operation: \"update\"`, addressed by `orderId` or `productId`. The product-update path sets `updateFields.title`, `updateFields.tags` and `updateFields.status`. There is also one `n8n-nodes-base.airtableTrigger`, which polls a table using a `triggerField` rather than receiving a push - Airtable has no outgoing webhook here, so the polling interval is the floor on how fast that direction can react.",
        ],
      },
      {
        h: "The fields that decide whether the row lands",
        p: [
          "Airtable's `base` and `table` parameters are resource locators, not plain IDs. Both carry `__rl: true` and, in all fifty-five nodes here, `mode: \"list\"` - the dropdown form. Under `columns` sits `mappingMode`, which is `autoMapInputData` in forty-one nodes and `defineBelow` in six. Auto-map takes each incoming field name as a column name; define-below gives an explicit `columns.value` object mapping column to expression, which is what you want the moment your column names differ from Shopify's field names.",
          "`columns.matchingColumns` is the deduplication key and only applies to `upsert`. In these files it is `orderId` in twelve nodes and `Order ID` in one - the Airtable column whose value identifies the order. Upsert without a matching column configured is a create.",
          "For reading changed records back out, `filterByFormula` carries `{LastModified} > DATEADD(NOW(), -1, 'days')` in eight nodes - an Airtable formula evaluated server-side, referencing a column named `LastModified` that has to exist in your base. It does not exist by default. Add it as a Last Modified Time field or the formula returns nothing and the workflow looks like it is working while syncing zero rows.",
        ],
      },
      {
        h: "Credentials, and what is not in the file",
        p: [
          "Two, marked on the node cards: `🔑 Shopify access token` and `🔑 Airtable PAT`. The Shopify side is a custom app's Admin API access token, created in your own store's admin rather than through OAuth - OAuth exists for apps distributed to other merchants, which this is not. The Airtable side is a Personal Access Token; Airtable's older user-level API keys no longer work.",
          "No workflow file in the catalog contains a `credentials` block - they are stripped before packaging. So on import every Shopify and Airtable node has an empty credential selector, and that is normal rather than damage.",
          "The other thing not in the file is your base. Every one of the fifty-five Airtable nodes ships with `base.value` and `table.value` set to the empty string and only a `cachedResultName` placeholder - `Your Shopify base`, `Orders`, `Sync Errors`. The dropdown displays that placeholder text, which reads as though something is selected. Nothing is bound, and the node fails until you re-pick both. This is the single most common reason an imported template errors on its first run.",
        ],
      },
      {
        h: "Two type casts that are not decoration",
        p: [
          "Shopify sends money as a string. In the order-sync template the total is mapped as `Number($json.total_price)`, an explicit cast, and the Set node's assignment is typed `number`. Skip that and Airtable receives the string \"42.50\" for a Currency or Number field; depending on the field's configuration it is either rejected or silently stored as text, and text does not sum. A revenue rollup built on those rows is wrong in a way nothing surfaces.",
          "Shopify order IDs go the other way: the same node maps `String($json.id)`. Shopify IDs are large integers, and the cast keeps them exact and keeps the value type-stable for use as a matching column. A numeric ID that round-trips through a float is a duplicate waiting to happen.",
          "Both casts are the kind of thing that works in a test store and fails on real data, because a test order for 10.00 survives sloppy typing and an order for 1,299.95 in a second currency does not.",
        ],
      },
      {
        h: "A worked example: orders into a table, once each",
        p: [
          "`Sync new Shopify orders into Airtable` is six nodes and contains the whole pattern.",
          "`n8n-nodes-base.shopifyTrigger` with `topic: \"orders/create\"` receives the order. A Set node named Map Order to Columns pulls six fields out of the payload and types each one: `order_id` as `String($json.id)`, `email`, `total` as `Number($json.total_price)`, `currency`, `status` from `$json.financial_status`, and `created_at`.",
          "A Code node running in `mode: \"runOnceForEachItem\"` reaches back to the trigger's output for `line_items`, builds a one-line summary of quantity and title per line, and adds `item_count`. Line items are one-to-many with the order, so they cannot go in a flat row - summarising them is the compromise that keeps one order to one Airtable record.",
          "The write is `operation: \"upsert\"` with `columns.mappingMode: \"defineBelow\"` and `columns.matchingColumns: [\"Order ID\"]`, mapping the eight columns explicitly. That matching column is what makes a redelivered `orders/create` webhook update the existing row instead of adding a second one.",
          "The node sets `retryOnFail` with `maxTries: 3` and `waitBetweenTries: 2000`, and `onError: \"continueErrorOutput\"`. Its second output goes to a Set node capturing `order_id` and the error message, then to a second Airtable node writing `operation: \"create\"` into a `Sync Errors` table. So a rejected row is recorded with its reason rather than lost - which matters because the rejections you get in production are type errors on individual orders, not outages.",
          "To point it at your own base: pick the base and table on both Airtable nodes, rename the eight columns in the `columns.value` map to match yours, and set `matchingColumns` to whichever column holds your order ID.",
        ],
      },
      {
        h: "Nineteen templates, and where they thin out",
        p: [
          "Nineteen files use both tools. Four are purpose-built for the pair alone - orders in, products and inventory in, Airtable edits pushed back to Shopify, and a scheduled catalog sync - and those are the ones to read if the pair is your whole problem.",
          "The other fifteen are larger workflows where Shopify and Airtable are two participants among several: forty `n8n-nodes-base.googleSheets` nodes, twenty-one `n8n-nodes-base.slack` nodes and ten `n8n-nodes-base.httpRequest` nodes appear across the same nineteen files. They are worth having if your pipeline looks like that, and misleading if you expected nineteen variations on a two-tool sync. It is four, plus fifteen that include it.",
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
  {
    slug: "mysql-and-twilio",
    title: "MySQL and Twilio: sending SMS from database rows",
    description:
      "How a MySQL-Twilio integration is wired in practice - insert vs select, autoMapInputData, and the placeholder sender number in 164 of 170 Twilio nodes that has to be replaced before anything sends.",
    nodes: ["Webhook / Schedule Trigger", "MySQL", "Set", "Twilio"],
    example: {
      route: "summarize-meeting-notes-with-mysql-and-twilio",
      title: "Summarize meeting notes: MySQL & Twilio",
    },
    sections: [
      {
        h: "What connects a database to a phone number",
        p: [
          "MySQL stores rows; Twilio sends SMS and voice against a REST API. There is no integration between them in either product - a database has no notion of an outbound message, and Twilio has no database driver. Anything described as a MySQL-Twilio integration is a program that queries one and calls the other, plus a rule for when.",
          "That rule is the actual design decision, and there are only two shapes. Either something happens and you react to it - a row arrives via an HTTP endpoint, you write it and send a message - or nothing pushes and you poll, running a query on a schedule and messaging about whatever it returns. The ninety-six templates here split along exactly that line: forty-seven start at `n8n-nodes-base.webhook`, thirty-six at `n8n-nodes-base.scheduleTrigger`.",
          "The polling shape carries a problem the event shape does not: a query that returns the same rows every run sends the same SMS every run. Text messages cost money and cannot be recalled, which makes this the one integration where getting deduplication wrong is immediately expensive.",
        ],
      },
      {
        h: "How the two nodes are configured",
        p: [
          "`n8n-nodes-base.mySql` appears 255 times across the ninety-six files. Two operations dominate: `operation: \"insert\"` in 205 nodes and `operation: \"select\"` in 45, of which all 45 set `returnAll: true`.",
          "The `table` parameter is a resource locator with `mode: \"name\"` - a literal table name rather than a picker - and unlike most locators in this catalog it ships with a real value. The names recur because the templates share a schema vocabulary: `documents` in 65 nodes, `emails` in 33, `requests` in 29, `leads` in 24, `payloads` in 21, `orders` and `drafts` in 18 each, `jobs` in 14, `tickets` in 12. Those tables have to exist in your database, with columns matching the fields flowing in; nothing in the file creates them.",
          "`dataMode: \"autoMapInputData\"` is set on all 205 insert nodes. That means the node maps incoming JSON keys straight onto column names, so the shape of whatever reaches it is the shape it tries to write. A field the table does not have is an error at insert time, which is why every one of these graphs has a Set node immediately before the MySQL node - that node is the schema contract.",
          "`n8n-nodes-base.twilio` appears 170 times and takes three parameters: `from`, `to`, and `message`. There is no batching. One node call is one message to one number.",
        ],
      },
      {
        h: "Credentials, and the two things they do not cover",
        p: [
          "The node cards mark `🔑 MySQL connection` and `🔑 Twilio SID + token`. Twilio's is an Account SID and Auth Token from the console; MySQL's is host, port, database, user and password, entered as separate fields rather than a connection URL.",
          "As with every file in this catalog, the `credentials` block is stripped, so both nodes show an empty selector on import. That is packaging, not breakage.",
          "Two prerequisites are not credentials and are easy to miss. First, your n8n instance has to be able to reach the database - a managed MySQL will refuse the connection outright unless n8n's egress address is allowlisted, and that failure looks like a timeout rather than an auth error. Second, a Twilio trial account can only send to numbers you have verified in the console; the API accepts the request and the message never arrives.",
        ],
      },
      {
        h: "The placeholder that sends nothing",
        p: [
          "164 of the 170 Twilio nodes here have `from` set to the literal string `+15550100000`. That is not a number anyone owns - 555-01xx is the reserved fictional range - and Twilio rejects it, because `from` has to be a number on your own account.",
          "This is deliberate on the packaging side and it is the first edit to make on any of these files. Replace it with a Twilio phone number, a Messaging Service SID, or an alphanumeric sender ID where your destination country permits one. There is no default that could have worked, since the value is account-specific.",
          "The `to` side has the same shape of problem with a different failure. In the worked example it is `{{ $json.phone || 'ONCALL_NUMBER' }}` - if the upstream row has no `phone` field, the expression resolves to the string `ONCALL_NUMBER` and Twilio returns an invalid-number error rather than the workflow noticing that the data was incomplete. If you keep the fallback pattern, make the fallback a real number.",
          "Both values need E.164 format - a leading `+` and country code. A ten-digit national number that works when you dial it will be rejected by the API.",
        ],
      },
      {
        h: "A node named upsert that inserts",
        p: [
          "Six `n8n-nodes-base.mySql` nodes in these files are named some variant of Upsert into MySQL, and all six are configured `operation: \"insert\"`. Insert is not idempotent. If one of those graphs is re-run - a webhook redelivery, a manual retry, a scheduled sweep over a window that overlaps the previous one - the row is written again, and if a Twilio node sits downstream, the SMS goes out again too.",
          "The node name is the label someone typed on the canvas; `operation` is what executes. Read the parameter, not the caption. This is worth a habit rather than a one-off check: node names across this catalog describe intent and the parameters describe behaviour, and where they disagree the parameter wins.",
          "The fix in MySQL is a unique key on whatever identifies the row - a message ID, an external reference - and either an INSERT ... ON DUPLICATE KEY UPDATE statement through the node's execute-query operation - which no file in this pair uses - or a preceding `operation: \"select\"` and an IF node. Doing it in the database rather than in n8n means a re-import of the workflow does not lose the protection.",
        ],
      },
      {
        h: "A worked example: extraction to a database, then a text",
        p: [
          "`Summarize meeting notes: MySQL & Twilio` shows the event-driven shape with its failure paths wired.",
          "An `n8n-nodes-base.webhook` at `httpMethod: \"POST\"` receives the payload. A Set node collapses several possible input shapes into one field - `$json.body?.text || $json.content || JSON.stringify($json)` - so the rest of the graph has one thing to read. An `@n8n/n8n-nodes-langchain.informationExtractor` backed by a Gemini chat model pulls structured fields out of that text, and carries `onError: \"continueErrorOutput\"` so a model failure takes the second output rather than stopping the run.",
          "An IF node checks the required fields came back. The pass branch writes to MySQL - `operation: \"insert\"`, `table` `emails`, `dataMode: \"autoMapInputData\"`. The fail branch posts to a Slack channel for manual review instead of dropping the item. Both branches meet at a Merge node in `mode: \"append\"`, so one path continues regardless.",
          "After the merge the graph stamps a processing time, caps volume with a Limit node, tags metadata and summarises the run, then writes an audit row with a second MySQL insert. Only then does `n8n-nodes-base.twilio` send, with `from: \"+15550100000\"` - the placeholder - and `message` naming the workflow and completion time.",
          "The error rail is the part worth copying. Every node that touches an external service sets `retryOnFail` with `maxTries: 3` and `waitBetweenTries: 2000`, and routes `onError: \"continueErrorOutput\"` into a shared Set node that captures `$json.error?.node?.name`, `$json.error?.message` and `$workflow.name`. That feeds a separate Twilio node that escalates. So a failure produces a text saying which node broke, instead of an execution nobody looks at.",
          "Three edits make it yours: the Twilio `from`, the MySQL `table` and its columns, and the destination number.",
        ],
      },
      {
        h: "Ninety-six templates, but read the mix",
        p: [
          "All ninety-six files contain both `n8n-nodes-base.mySql` and `n8n-nodes-base.twilio` as real nodes - the page filters on the node graph rather than the title - and none of them is a two-node rows-to-SMS toy. The smallest has eight working nodes and the median twenty-one. The same ninety-six also contain 121 `n8n-nodes-base.slack` nodes, 119 `n8n-nodes-base.googleSheets` nodes and 61 `n8n-nodes-base.httpRequest` nodes between them, which tells you what these workflows actually are.",
          "In practice these are document, email and request pipelines that happen to persist to MySQL and notify over SMS, rather than SMS tools. If what you want is strictly rows-to-texts, the useful move is to take one of these and delete the middle - the trigger, the MySQL node and the Twilio node are the three that matter, and they are wired the same way in all ninety-six.",
        ],
      },
    ],
  },
  {
    slug: "discord-and-google-drive",
    title: "Google Drive and Discord: files in one, notifications in the other",
    description:
      "How a Drive-Discord integration is built - upload and download operations, the folderId that ships unbound in all 67 upload nodes, and the 25-result cap on file search. Read from 75 working n8n templates.",
    nodes: ["Trigger", "Google Drive", "Extract From File", "Set", "Discord"],
    example: {
      route: "capture-form-submissions-with-google-drive-and-discord-on-autopilot",
      title: "Capture form submissions with Google Drive and Discord",
    },
    sections: [
      {
        h: "What people mean by connecting Drive to Discord",
        p: [
          "Google Drive holds files. Discord is where a team notices things. Neither vendor connects to the other, so a Drive-Discord integration is a third program that watches or writes one and posts to the other.",
          "In practice the request comes in two forms and they are not the same job. One is notification: something landed in a folder, say so in a channel. The other is pipeline: take a file out of Drive, do something with its contents, and report the result - which is what the seventy-five templates on this page overwhelmingly are. The Discord message at the end is a status line on a data pipeline, not the point of the workflow.",
          "Worth knowing before you start: Drive does not push. There is no outgoing webhook in these files for a new file appearing. Every one of them either runs on a schedule, is called by another workflow, or is triggered by something else entirely - a form, an email, an HTTP call. If your requirement is genuinely reacting within seconds of an upload, that is a polling problem, and the interval is your latency floor.",
        ],
      },
      {
        h: "How the Drive node is used",
        p: [
          "`n8n-nodes-base.googleDrive` appears ninety-seven times across the seventy-five files, in three distinct configurations.",
          "`operation: \"upload\"` in sixty-seven nodes writes a file, addressed by `driveId` and `folderId`. `operation: \"download\"` in thirteen pulls one back, addressed by `fileId`. Seventeen nodes set `resource: \"fileFolder\"` with `searchMethod: \"query\"` to find files rather than name them.",
          "The addressing is worth understanding because it differs per parameter. `driveId` and `folderId` are resource locators in `mode: \"list\"` - dropdown pickers. `fileId` on the download nodes uses `mode: \"id\"`, holding an expression like `{{ $json.id || $json.fileId }}` that takes whatever the upstream node produced. That is the right choice: a file being downloaded was discovered at runtime and cannot be picked at design time.",
          "Downloaded files travel as binary. The thirteen `n8n-nodes-base.extractFromFile` nodes in these files are what turn that binary back into JSON the rest of the graph can read - twelve set `operation: \"csv\"` and one sets `operation: \"xlsx\"`. A Drive download feeding a Set node directly does not work; the content is not in `$json` yet, and picking the wrong extractor for the file type gives you an empty item rather than an error.",
        ],
      },
      {
        h: "The Discord side has two modes, and they need different setups",
        p: [
          "Of the 138 `n8n-nodes-base.discord` nodes here, 128 use `authentication: \"webhook\"` and set a plain `content` string. Ten use `select: \"channel\"` with a `channelId` resource locator in `mode: \"name\"` - values like `#docs`, `#ops`, `#data-ops`, `#sales`, `#content` and `#support`.",
          "Those are not interchangeable. The webhook form needs one URL, copied from a channel's integration settings, and can only post to that channel - it cannot read, react or list anything. The `select: \"channel\"` form needs a Discord application with a bot user, a bot token credential, and the bot invited to your server with permission to post in the named channel. If you import one of the ten and only set up a webhook credential, it fails; if you import one of the 128 and build a bot, you did more work than the file needed.",
          "Check which one you have before setting up credentials rather than after. The node cards mark both as `🔑 Discord webhook URL`, which is accurate for the 128 and understates the ten.",
        ],
      },
      {
        h: "Credentials and Google's two ways in",
        p: [
          "The Drive side is marked `🔑 Google OAuth2` on the node cards. n8n also supports a service account for Drive, and which one you want depends on whose files these are.",
          "OAuth2 acts as you: it sees your My Drive, and the workflow keeps working as long as the grant is valid. A service account is a separate identity with its own empty Drive, and it sees nothing in your account until you explicitly share a folder with the service account's email address. The common first failure with a service account is a workflow that authenticates correctly and then reports that the folder does not exist, because from that identity's point of view it does not.",
          "For anything running unattended and owned by a team rather than a person, the service account is the better answer - it does not break when someone leaves. For getting one of these templates running today, OAuth2 is fewer steps.",
          "As with every file in this catalog the `credentials` block is stripped, so both nodes show an empty selector on import.",
        ],
      },
      {
        h: "Two things in the files that will stop a first run",
        p: [
          "The upload nodes are half-configured, and asymmetrically. In all sixty-seven, `driveId` is bound - `mode: \"list\"`, `value: \"My Drive\"` - while `folderId` has `value` set to the empty string and only a `cachedResultName` placeholder: `Archives` in fifty-four nodes, `Processed` in eleven, `Backups` in two. The dropdown shows the word Archives, which reads as a selected folder. Nothing is selected. The drive resolves and the folder does not, so the upload fails on a node that looks configured. Re-pick the folder on every upload node before activating.",
          "The file searches are capped. All seventeen `resource: \"fileFolder\"` nodes set `returnAll: false` and `limit: 25`. Twenty-five is not a page size the node loops over - it is the total. A folder with two hundred files returns twenty-five of them and reports success, and a workflow that processes a folder nightly will quietly never touch the other 175. If you are searching a folder that grows, set `returnAll: true` or raise the limit deliberately.",
          "There is also a naming trap in the surrounding graph: twelve nodes in these files are named some variant of upsert, and eleven of them are not upserts by operation - ten are `n8n-nodes-base.googleSheets` with `operation: \"appendOrUpdate\"`, which is close enough, and one is `n8n-nodes-base.notion` with `operation: \"create\"`, which is not. Read the `operation` parameter rather than the node's caption.",
        ],
      },
      {
        h: "A worked example: a CSV out of Drive, a summary into Discord",
        p: [
          "`Capture form submissions with Google Drive and Discord` is twelve working nodes and shows the pipeline shape end to end.",
          "The trigger hands over a file reference. `n8n-nodes-base.googleDrive` with `operation: \"download\"` fetches it, using `fileId` in `mode: \"id\"` with the expression `{{ $json.id || $json.fileId }}` - two possible field names, because the upstream node's output shape varies by trigger.",
          "`n8n-nodes-base.extractFromFile` with `operation: \"csv\"` parses the binary into items. A Code node cleans and reshapes the rows, then an IF node named Rows Pass Validation? splits them: the good ones go on to a Google Sheets load, the rest to a quarantine branch rather than being dropped.",
          "Discord appears twice, both `authentication: \"webhook\"`. One posts the success line with a completion timestamp. The other is on the error rail: the Drive download and the Sheets load both set `onError: \"continueErrorOutput\"` and route their second output into a shared Set node that captures `$json.error?.node?.name`, `$json.error?.message` and `$workflow.name`, which feeds a Discord node posting which node failed and why.",
          "That error rail is the part worth reusing whatever you are building. The Drive download is the node most likely to fail in normal operation - a file moved, a permission changed, a token expired - and the difference between this graph and a naive one is that the failure produces a message in a channel instead of a red execution nobody opens.",
          "To adapt it: re-pick the Drive folder if you add an upload, change the webhook URL, and replace the validation rule in the IF node with whatever your rows have to satisfy.",
        ],
      },
      {
        h: "Seventy-five templates, and what they mostly are",
        p: [
          "All seventy-five files contain both `n8n-nodes-base.googleDrive` and `n8n-nodes-base.discord` as real nodes - the page filters on the node graph, not the title - and the median has twenty-two working nodes.",
          "They are, in the main, document pipelines. The same seventy-five files contain 248 `n8n-nodes-base.googleSheets` nodes, 145 `n8n-nodes-base.code` nodes and 91 `n8n-nodes-base.slack` nodes - Drive is where the file lives, Sheets is usually where the extracted data goes, and Discord is the notification at the end. Twelve `@n8n/n8n-nodes-langchain.lmChatAnthropic` nodes and ten `@n8n/n8n-nodes-langchain.chainSummarization` nodes show up in the summarisation variants.",
          "If what you want is a bare folder-watcher that announces new files, none of these is that file, but the first four nodes of any of them is. If you want a document pipeline that ends in a Discord message, this is a deep set.",
        ],
      },
    ],
  },
  {
    slug: "airtable-and-google-drive",
    title: "Airtable and Google Drive: the file goes in one, the record in the other",
    description:
      "How an Airtable-Drive integration is actually wired - upload then upsert, webViewLink as the join between them, and the LastModified column filterByFormula depends on. Read from 72 working n8n templates.",
    nodes: ["Trigger", "Google Drive", "Extract From File", "Code", "Airtable"],
    example: {
      route: "extract-invoice-attachments-from-email-into-google-drive-and-airtable",
      title: "Extract invoice attachments from email into Google Drive and Airtable",
    },
    sections: [
      {
        h: "Why these two get paired at all",
        p: [
          "Airtable can store attachments, so the obvious question is why anyone would put files in Drive and records in Airtable rather than keeping both in one place. The answer these seventy-two templates give is consistent: the file is the artefact and the record is the index, and they have different lifetimes and different access rules.",
          "Airtable attachment fields also have a specific behaviour that shapes the design. You do not upload bytes to Airtable - you hand it a URL and Airtable fetches it. That means the file has to be reachable from Airtable's servers at the moment of the write, which is why the templates here upload to Drive first and put a link in the record second. The order is not stylistic.",
          "So the shape is: get the file, put it somewhere durable, extract what you need from its contents, and write a row that points back at it. Drive is the somewhere; Airtable is the row.",
        ],
      },
      {
        h: "The two nodes, and the field that joins them",
        p: [
          "`n8n-nodes-base.googleDrive` appears 130 times across the seventy-two files - `operation: \"upload\"` in seventy-three, `operation: \"download\"` in thirty-seven, and twenty with `resource: \"fileFolder\"` and `searchMethod: \"query\"` for finding files. `n8n-nodes-base.airtable` appears 141 times: `operation: \"create\"` in seventy-two, `operation: \"search\"` in forty-four, `operation: \"upsert\"` in twenty-one.",
          "How they join is worth being exact about, because the honest answer is that mostly they do not join directly. Across all seventy-two files there are only eight connections that run straight from a Drive node into an Airtable node or back - five one way, three the other. In the rest, both tools are present but separated by extraction, parsing and validation steps, and the record is built from the parsed contents rather than from the Drive node's response.",
          "Where they are wired directly, the field that carries the link is `webViewLink`, which a Drive upload returns in its output and an Airtable node reads as `{{ $json.webViewLink }}` into a link column. That happens in exactly one file here - the worked example below - so treat it as the pattern to copy rather than a pattern already applied throughout.",
          "Note which link it is. `webViewLink` opens the file in Drive's viewer in a browser and respects Drive permissions, so a row whose link nobody outside your domain can open is a sharing setting rather than a broken workflow. It is not a direct file URL, which matters if you were hoping to hand it to an Airtable attachment field - Airtable fetches attachment URLs itself and will not get bytes from a viewer page.",
          "Between the two sits `n8n-nodes-base.extractFromFile` in thirty-eight nodes, turning downloaded binary into readable JSON, and 125 `n8n-nodes-base.code` nodes doing the parsing that the extraction leaves to you.",
        ],
      },
      {
        h: "Airtable's parameters, and the column that has to exist",
        p: [
          "`base` and `table` are resource locators, both `mode: \"list\"` in all 135 of the nodes that set them. `columns.mappingMode` is `autoMapInputData` in ninety-three nodes - incoming field names become column names - and `defineBelow` elsewhere, which gives you an explicit `columns.value` map and is what you want as soon as your column names differ from your data's field names.",
          "`columns.matchingColumns` is the upsert key: `documentId` in eleven nodes here. Without it, `operation: \"upsert\"` behaves as a create.",
          "The one to plan for is `filterByFormula`, set on forty-four nodes to `{LastModified} > DATEADD(NOW(), -1, 'days')`. That is an Airtable formula evaluated on Airtable's side, and it references a column literally named `LastModified`. No base has that column by default. If it is missing the formula does not error loudly - the search returns nothing, and a workflow that syncs changed records syncs zero of them while reporting success. Add a Last Modified Time field named exactly that, or change the formula, before you trust the sync.",
          "The window is also a day. If your workflow runs hourly, it re-reads twenty-four hours of records every hour, which is wasteful but harmless; if it runs weekly, it silently misses six days. Match the interval to the formula or change the formula.",
        ],
      },
      {
        h: "Credentials on both sides",
        p: [
          "`🔑 Airtable PAT` and `🔑 Google OAuth2`, per the node cards.",
          "Airtable's is a Personal Access Token - the older user-level API keys are gone. Scope it to the specific bases the workflow touches. If you want n8n's base and table dropdowns to populate rather than making you type IDs, the token needs schema read access as well as record access; without it the pickers stay empty and the resource locators are much harder to fill in.",
          "Google's is OAuth2 here, though a service account also works and is the better answer for anything unattended. The tradeoff is the same as anywhere in Drive: OAuth2 sees your My Drive immediately, a service account sees nothing until you share a folder with its address. A service-account setup that authenticates and then cannot find the folder is almost always this.",
          "The `credentials` block is stripped from every file in the catalog, so both nodes show empty selectors on import.",
        ],
      },
      {
        h: "Two failures that look like something else",
        p: [
          "The Drive uploads ship with the folder unbound. In all seventy-three, `driveId` is set - `mode: \"list\"`, `value: \"My Drive\"` - and `folderId` has `value` set to the empty string with only a `cachedResultName` placeholder: `Archives` in thirty-five, `Backups` in twenty-six, `Processed` in eleven. The picker shows a folder name and holds no folder. Every Airtable node has the same problem: all 135 have `base.value` and `table.value` empty behind placeholders like `Document Processing Base` and `Documents`. This is the normal first-run failure on these imports, and it is four clicks per node rather than a bug.",
          "The other is that file searches are capped: all twenty `resource: \"fileFolder\"` nodes set `returnAll: false` with `limit: 25`. That is a total, not a page size. A folder with more than twenty-five files is processed twenty-five files at a time and the remainder is not queued for later - it is simply not seen. For a growing folder, set `returnAll: true`.",
          "One more worth checking as you extend: six nodes in these files are named as upserts, and five are `n8n-nodes-base.googleSheets` running `operation: \"appendOrUpdate\"`. Read the operation, not the caption.",
        ],
      },
      {
        h: "A worked example: invoices out of email, into Drive and Airtable",
        p: [
          "`Extract invoice attachments from email into Google Drive and Airtable` is ten nodes and is the clearest version of the pattern in the set.",
          "`n8n-nodes-base.emailReadImap` watches a mailbox with `downloadAttachments: true` and `customEmailConfig: [\"UNSEEN\"]`, so it processes each message once. A Filter node keeps only messages that have at least one binary attachment and whose subject matches the regex `invoice|bill|receipt|statement` - two conditions, because either alone lets through most of an inbox.",
          "`n8n-nodes-base.extractFromFile` with `operation: \"pdf\"` reads the attachment, addressed by `binaryPropertyName: \"attachment_0\"`. That name matters: n8n numbers attachments from zero, and a workflow written against `attachment_0` silently reads the wrong file on a message where the invoice is the second attachment.",
          "A Code node in `mode: \"runOnceForEachItem\"` runs three regexes over the extracted text for an invoice number, a total and a date, and - the useful part - sets `textFound` from whether the text is longer than forty characters. An IF node reads that flag. A scanned invoice is a PDF with no text layer, so extraction returns almost nothing and the regexes match nothing; without the flag the workflow would write a row full of empty strings and look like it worked. Instead the false branch writes to a review table.",
          "The Drive upload names the file `{{ $json.invoiceNumber || 'unparsed' }}-{{ $now.toFormat('yyyyLLdd') }}.pdf` and passes the binary through with `inputDataFieldName: \"attachment_0\"`. Then the Airtable node runs `operation: \"upsert\"` with `columns.matchingColumns: [\"Invoice Number\"]`, writing the parsed fields plus `Drive Link` from `{{ $json.webViewLink }}` and `Source Subject` read back from the IMAP node.",
          "Two details to copy. The Airtable expressions reference earlier nodes by name - `$('Parse Number, Date & Total').item.json.invoiceNumber` - rather than `$json`, because by that point in the graph `$json` is the Drive upload's response and no longer holds the parsed fields. And upserting on the invoice number means the same invoice arriving twice, forwarded or resent, updates one row.",
        ],
      },
      {
        h: "Seventy-two templates, weighted towards documents",
        p: [
          "Seventy-two files use both. The centre of gravity is document processing: `Document Processing Base` is the base placeholder on ninety-nine of the Airtable nodes and `Documents` the table on the same ninety-nine, with invoices, contracts and receipts as the recurring subjects.",
          "There is a second, smaller cluster doing retrieval-augmented search - seventeen `@n8n/n8n-nodes-langchain.documentDefaultDataLoader` nodes, seventeen text splitters, nine `@n8n/n8n-nodes-langchain.vectorStoreQdrant` and eight `@n8n/n8n-nodes-langchain.vectorStoreSupabase`. In those, Drive is the corpus and Airtable is the metadata index.",
          "What is genuinely thin here is the simple case: Airtable as an index over a Drive folder, with no extraction in between. Only eight direct Drive-to-Airtable connections exist across the seventy-two files, and only one of them carries a `webViewLink` into a link column. If that plain shape is what you want, the worked example below is the file to start from - it is the one that does it - and the rest of the set is deeper than you need.",
        ],
      },
    ],
  },
  {
    slug: "hubspot",
    title: "HubSpot and n8n: how the node is configured in practice",
    description:
      "What the HubSpot n8n node looks like across 1,370 working templates - appToken auth on every node, the lastmodifieddate GTE search filter, and the 2,757 nodes that set no operation at all.",
    nodes: ["Schedule Trigger", "HubSpot (search)", "Code", "HubSpot (contact)"],
    example: {
      route: "augment-company-profiles-with-hubspot-and-http-rest-api-hands-free-for-research-1455",
      title: "Augment company profiles on a schedule",
    },
    sections: [
      {
        h: "One resource, one authentication method",
        p: [
          "`n8n-nodes-base.hubspot` appears 3,480 times across the 1,370 templates here, and 3,474 of those set `resource: \"contact\"`. Companies, deals, tickets and engagements barely feature. If your work is contact-shaped this is a deep set; if you need deal-pipeline automation it is not what is here.",
          "The same 3,474 nodes set `authentication: \"appToken\"`. That is HubSpot's private app token - not OAuth2, and not the legacy API key HubSpot retired. You create a private app inside your own portal, grant it scopes, and copy the token; it does not expire on a user session and it is the right choice for anything running unattended.",
          "The node cards mark it `🔑 HubSpot private-app token`. As with every file in this catalog the `credentials` block is stripped, so the node shows an empty selector on import.",
        ],
      },
      {
        h: "2,757 nodes leave the operation unset",
        p: [
          "This is the detail most worth knowing before you import one. Of the 3,480 HubSpot nodes, 2,757 set no `operation` parameter at all - they carry `resource: \"contact\"`, an `email` expression and `additionalFields.companyName`, and nothing else. 717 set `operation: \"search\"`. A handful set `appendOrUpdate`, `append`, `create` or `insert`.",
          "A node with no `operation` runs whatever the node's default is for that resource. That is not wrong, and it is how the editor writes a node you never touched the operation dropdown on. But it means the file does not record the behaviour: the same JSON can do different things on two n8n versions if the default ever changes, and reading the workflow tells you less than it appears to.",
          "It also means you cannot tell by inspection whether one of these writes is idempotent. Many of the 2,757 are named some variant of Upsert into HubSpot - 605 nodes across the set carry an upsert-ish name, and 185 of those demonstrably run something else, including 107 `n8n-nodes-base.googleSheets` nodes on `operation: \"appendOrUpdate\"`, thirty-one `n8n-nodes-base.notion` nodes on `create` and twenty-eight `n8n-nodes-base.postgres` nodes on `executeQuery`. Set the operation explicitly on any node whose behaviour you are relying on.",
          "The saving grace is that HubSpot itself deduplicates contacts by email address, so a create against an existing email is a conflict rather than a duplicate record. That is a property of HubSpot, not of these workflows, and it does not extend to the other objects.",
        ],
      },
      {
        h: "The search filter, and the shape of its parameters",
        p: [
          "The 717 `operation: \"search\"` nodes all build their filter through the same nested structure - `filterGroupsUi.filterGroupsValues[].filtersUi.filterValues[].propertyName`, and its `operator` and `value` siblings.",
          "716 of the 717 use `propertyName: \"lastmodifieddate\"` with `operator: \"GTE\"`. That is the incremental read - give me contacts touched since a timestamp - and it is the standard sweep in this catalog. Note that `GTE` is the API's value, not a display label; HubSpot's search operators are uppercase enums, and `EQ` appears once for an email lookup.",
          "`lastmodifieddate` is HubSpot's internal property name. HubSpot distinguishes the internal name from the label you see in the UI, and expressions have to use the internal one - a property labelled Last Modified Date is `lastmodifieddate` with no separators. Custom properties get internal names generated at creation time that often differ from what you named them, so check in the portal's property settings rather than guessing from the label.",
          "One ceiling worth designing around: a HubSpot search returns at most 10,000 results for any one query however you paginate. For a full export, slice by date range and run the query per slice; paging past the limit returns nothing rather than an error.",
        ],
      },
      {
        h: "What a first-time user has to create",
        p: [
          "A private app in your HubSpot portal, under Settings, Integrations, Private Apps. Grant it the CRM scopes the workflow needs - contact read for the search nodes, contact write for the create and update nodes - and copy the access token into an n8n HubSpot App Token credential.",
          "Scope errors are the common first failure and they are legible: HubSpot returns a message naming the scope that was missing, so read the response body rather than assuming the token is wrong.",
          "The other prerequisite is not HubSpot's. Most of these templates read or write a second system, and the resource locators for those ship unbound - the 60 `n8n-nodes-base.googleSheets` nodes in this set that pair with HubSpot all have `documentId.value` empty behind a `Request Tracker` placeholder, with `sheetName` set to `Main`. The sheet name resolves and the document does not, so the node fails on a field that looks filled in.",
        ],
      },
      {
        h: "A worked example: an incremental sync with a watermark",
        p: [
          "`Augment company profiles on a schedule` is seven nodes and shows the incremental pattern that most of this set is a variation on.",
          "An `n8n-nodes-base.scheduleTrigger` fires hourly. A Google Sheets node reads the previous run's state, and it sets `alwaysOutputData` - which matters, because on the very first run that sheet is empty and without the flag the branch would produce nothing and the whole workflow would stop before it started.",
          "An `n8n-nodes-base.httpRequest` fetches changed records with `sendQuery: true` and two query parameters: `updated_since` as `{{ $now.minus({hours: 6}).toISO() }}`, and `limit` as `100`. It sets `options.timeout` to 20000. The six-hour lookback against an hourly schedule is deliberate overlap - re-reading records you already have is cheap, missing one because a run was late is not.",
          "A Code node in `mode: \"runOnceForAllItems\"` normalises the response to a stable schema, coercing IDs with a String() cast and trimming strings, so that everything downstream reads the same field names regardless of what the API returned.",
          "The HubSpot node then writes: `resource: \"contact\"`, `email` from the normalised field, `additionalFields.companyName`, `authentication: \"appToken\"`, and `retryOnFail` with `maxTries: 3`. It sets no `operation` - one of the 2,757 - so if you put this into production, set it explicitly to whatever you actually intend.",
          "The last two nodes are the part worth copying. A Code node computes the newest timestamp seen across the batch, and a Google Sheets node writes that watermark back with `operation: \"appendOrUpdate\"` and `columns.matchingColumns: [\"requestId\"]`. Persisting the watermark outside n8n is what makes the workflow resumable: delete and re-import it and it picks up where it left off instead of replaying history.",
        ],
      },
      {
        h: "1,370 templates, weighted towards enrichment",
        p: [
          "The recurring subjects are augment, clean and enrich company profiles, and the recurring partner is `n8n-nodes-base.httpRequest` - an external data source enriching a contact record. That is the centre of this set.",
          "What is thin: deal and pipeline automation, ticket workflows, and anything using HubSpot's marketing-email or workflow APIs. The contact object is 3,474 of 3,480 nodes, and a page implying broader CRM coverage would be overstating it.",
        ],
      },
    ],
  },
  {
    slug: "wordpress",
    title: "n8n and WordPress: what the node can do, and what it does here",
    description:
      "The WordPress n8n node across 246 templates - three parameters, every post created as a draft, and a two-model writer-editor chain in front of it. What it does not do is publish.",
    nodes: ["Schedule Trigger", "Set", "Basic LLM Chain", "WordPress"],
    example: {
      route: "produce-blog-drafts-with-notion-and-wordpress",
      title: "Produce blog drafts: WordPress",
    },
    sections: [
      {
        h: "The node is narrow, and these templates use one corner of it",
        p: [
          "`n8n-nodes-base.wordpress` appears exactly 246 times across 246 templates - one node per workflow, no exceptions. Every one of them sets the same three parameters and nothing else: `title`, `additionalFields.content`, and `additionalFields.status`.",
          "No node here sets `resource` or `operation`, which means all 246 run the node's defaults - a post, created. Categories, tags, featured images, custom fields, excerpts, slugs and authors are all left alone. Whatever your editorial workflow needs beyond a title and a body, these files do not set it, and you will be adding it yourself.",
          "That is a real limit rather than a gap in the catalog: the WordPress node covers posts, pages and users, and the interesting parts of a WordPress site - ACF fields, custom post types, Yoast metadata - live behind plugin REST routes the node does not know about. For those you use `n8n-nodes-base.httpRequest` against the REST API directly, authenticated the same way.",
        ],
      },
      {
        h: "Every post is a draft",
        p: [
          "All 246 nodes set `additionalFields.status` to `draft`. Not one publishes.",
          "That is the correct default for what these templates are - all 246 have an AI model writing the body - and it is also the first thing to check before you assume a workflow is broken. A scheduled run that reports success and produces nothing on your site did exactly what it was told: the post is in the WordPress admin under Drafts.",
          "If you want a published post, change `status` to `publish`. The other values the WordPress REST API accepts are pending, for editorial review, and private. Think about which one you want rather than reaching for `publish` reflexively: the reason all 246 ship as drafts is that a model-written post going straight to a live URL is a bad idea the first time a prompt behaves unexpectedly, and a pending status routes it to whoever reviews.",
          "There is no scheduling parameter set here either. WordPress supports a future publish date, but these nodes do not use it - the schedule lives in `n8n-nodes-base.scheduleTrigger`, which appears 246 times, once per workflow.",
        ],
      },
      {
        h: "Credentials, and which of the three you want",
        p: [
          "The node cards mark `🔑 WordPress credentials`. n8n's WordPress credential is a username and an application password - not your login password.",
          "Application passwords are generated per user in the WordPress admin under Users, Profile, and they can be revoked individually without changing the account password. WordPress has shipped them in core since 5.6, so you do not need a plugin.",
          "Two things break this on a first attempt, and neither is the credential. The REST API has to be reachable - some security plugins and managed hosts disable or restrict the /wp-json/ route, and the failure is a 401 or 404 that looks like an auth problem. And application passwords require HTTPS; over plain HTTP, WordPress refuses to issue or accept them.",
          "Give the account the least role that can do the job. Author is enough to create drafts. Administrator is not required and is a poor trade for a credential sitting in an automation tool.",
          "As with every file in this catalog, the `credentials` block is stripped, so the node shows an empty selector on import.",
        ],
      },
      {
        h: "What sits in front of the node",
        p: [
          "The 246 files contain 492 `@n8n/n8n-nodes-langchain.chainLlm` nodes - exactly two per workflow. That is a writer-then-editor pattern: the first chain drafts from a brief, the second is prompted to improve the draft without changing facts, and only then does the WordPress node run.",
          "The model behind them varies across the set: 118 `@n8n/n8n-nodes-langchain.lmChatOpenAi`, 110 `@n8n/n8n-nodes-langchain.lmChatGroq`, 90 `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`, plus OpenRouter and Anthropic variants. Each is a separate credential, so check which one the template you imported is wired to before setting up an API key - the node cards mark them individually, `🔑 OpenAI API key`, `🔑 Groq API key`, `🔑 Google AI API key`.",
          "The model node uses a `model` resource locator in `mode: \"list\"` with a real value - `gpt-4o-mini` on the OpenAI ones - so unlike most locators in this catalog it is bound on import. It is also a model name that ages, and pointing it at a current model is a one-field edit.",
          "One thing to add that none of these do: the chains produce markdown, and the WordPress node writes `additionalFields.content` as-is. WordPress will render markdown as literal text, not as formatting. If your posts come out with visible asterisks and hash marks, that is this - convert to HTML in a Code node before the WordPress node.",
        ],
      },
      {
        h: "A worked example: brief to draft, in seven nodes",
        p: [
          "`Produce blog drafts: WordPress` is the shortest version of the pattern.",
          "`n8n-nodes-base.scheduleTrigger` fires on `field: \"hours\"` with `hoursInterval: 2`. A Set node builds two fields - `brief` from `{{ $json.topic || $json.chatInput || JSON.stringify($json) }}` and `tone` from `{{ $json.tone || 'professional' }}`. Both are fallback chains, which is what lets the same workflow be driven by a schedule, a chat input or a manual execution without changing anything.",
          "The first `@n8n/n8n-nodes-langchain.chainLlm` runs with `promptType: \"define\"` and a system message instructing it to return clean markdown with a title line and no preamble. An `@n8n/n8n-nodes-langchain.lmChatOpenAi` node on `gpt-4o-mini` supplies the model over the `ai_languageModel` connection - note that is a separate connection type from `main`, which is why the model node sits below the chain rather than in the flow.",
          "The second chain takes the output and is prompted to improve it without changing facts, returning only the improved draft. Then the WordPress node writes `title`, `additionalFields.content` and `additionalFields.status: \"draft\"`.",
          "Three edits make it useful. Point `brief` at a real source of topics rather than the fallback chain - a Sheets row, a Notion database, a queue. Add the markdown-to-HTML step before the WordPress node. And decide the status deliberately.",
        ],
      },
      {
        h: "246 templates that are all the same shape",
        p: [
          "This is worth stating plainly: the 246 WordPress templates here are variations on one workflow. One schedule trigger, a brief, two LLM chains, one WordPress node creating a draft. What varies is the subject - blog posts, newsletters, social copy, captions, content calendars - the prompts, and which model and which upstream data source is wired in.",
          "The same 246 files carry 475 `n8n-nodes-base.slack` nodes and 361 `n8n-nodes-base.googleSheets` nodes, which is where the notification and the content-source variation live.",
          "So if you want AI-assisted draft generation into WordPress, pick whichever subject is closest and edit the prompts - the differences between the 246 are genuinely small. If you want WordPress automation that is not content generation - syncing posts to another system, reacting to a publish event, managing media or taxonomy - none of these is a starting point, and the WordPress node's own surface is narrow enough that `n8n-nodes-base.httpRequest` against the /wp-json/ REST routes is likely the better route.",
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
