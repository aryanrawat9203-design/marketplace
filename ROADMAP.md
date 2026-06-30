# FlowDex - Completion Roadmap (what's still missing)

Status (30 June 2026): LIVE at https://marketplace-orcin-seven.vercel.app.
Razorpay LIVE payments work end-to-end (KYC done). Selling 10,501 own templates with
single + bundle pricing. Instant download works. Below is everything left to make it fully
professional, trustworthy, and complete - in the order we'll build it.

## Priority 1 - Order reliability & trust (do first)
1. Order-confirmation EMAIL (via Resend) - a receipt + download link sent after every purchase.
   Right now the buyer only gets the instant browser download; if they close the tab, it's gone.
   This is the #1 gap (and the reason you got no confirmation message).
2. Razorpay WEBHOOK (payment.captured) - record each paid order on the server and send the email
   even if the buyer closes the tab. More reliable than the current browser-only verification.
3. Re-download / order lookup - a simple page where a buyer re-gets their files via the emailed
   link or by entering their email + order id (needed because there are no accounts yet).
4. Real contact details - replace the placeholder hello@flowdex.example with a real business
   email, and make the Contact form actually send (Resend). Buyers and Razorpay expect this.
5. Custom domain (e.g. flowdex.in, ~Rs 800/yr) - a real domain looks far more legitimate than a
   *.vercel.app address. Point it at Vercel.

## Priority 2 - Accounts / login (optional but professional)
6. Customer accounts (Supabase Auth) - register/login so buyers can see order history and
   re-download anytime. Keep guest checkout - do NOT force login to buy.
7. Orders database (Supabase) - store each successful order; powers order history, re-downloads,
   and your own sales view.

## Priority 3 - Look professional & avoid looking fraudulent
8. Proper logo + final brand name (FlowDex is currently a placeholder; the logo is a plain "F").
9. Trust strip near Buy buttons: "Secure checkout - Payments by Razorpay - Instant download -
   Refund policy".
10. Social proof - HONESTLY ONLY. Do NOT invent fake reviews, testimonials, or sales counters -
    that is itself deceptive and can get your payment account banned. Collect real reviews after
    real sales; show genuine catalog stats.
11. Product preview - show what a template actually contains (a screenshot of the n8n node graph,
    or a preview of the node list/JSON) so buyers see it's real before paying. A couple of genuine
    free samples build a lot of trust.
12. Real About / Contact - who is behind it, support email, response time, optional WhatsApp.
13. Open Graph share image - a branded preview image so links shared on WhatsApp/social look
    professional (there's none right now). Plus a proper favicon.

## Priority 4 - Growth & discoverability
14. Google Search Console - verify the site and submit the sitemap (already generated) so Google
    indexes your 10k+ pages.
15. Analytics - turn on Vercel Analytics and/or Google Analytics to see traffic and what sells.
16. Email capture for the free lead-magnet templates - build a mailing list to market bundles.
17. Product structured data (schema.org) for richer Google results.

## Priority 5 - Business / legal
18. GST - consult a CA about when to register for selling digital goods in India. Sell now; sort
    GST before scaling.
19. Keep proof that you own/authored the templates safe.

## Known technical follow-ups
- The full-library bundle ZIP (10,501 files) is heavy for Vercel's free tier - move product files
  to Supabase Storage and serve via signed URLs once that bundle starts selling.
- Download links currently expire after 30 minutes (fine once email + accounts allow re-download).

Next chat: we implement these in order, starting at Priority 1, step by step, until done.
