# FlowDex - Marketplace Conversion (29 June 2026)

Your site is now a store selling **your own 10,501 original n8n templates** instead of a free
directory linking to n8n.io.

## What changed
- **Removed** the free scraped-workflow directory (all "open free on n8n.io" links + n8n-affiliation
  disclaimers are gone).
- **Replaced** the catalog with your owned library: 10,501 templates, 25 categories, 92
  subcategories, 4 difficulty levels. Data lives in `src/data/` (catalog, index, taxonomy, bundles).
- Every template page is now a **buyable product** with price, discount, and a Buy button.
- The workflow JSON files are in `product-files/` and delivered after purchase.

## Pricing (launch - all shown as original -> discounted, ~60% off)
- **Single templates**, by tier x complexity: Professional Rs 149-299, Premium Rs 299-599,
  Enterprise Rs 549-999. (497 "Free" templates stay Rs 0 as lead magnets.)
- **Subcategory bundles** (100): Rs 999-3,999 by size.
- **Category bundles** (25): Rs 2,499-6,999 by size.
- **Full Library** (all 10,501): Rs 9,999 (was Rs 24,999).
- **Lifetime All-Access** (everything + future templates): Rs 14,999 (was Rs 39,999).

Every template is buyable on its own AND inside its category + subcategory bundle. Bundles are
always cheaper than buying the members separately.

## How to preview it
On your computer, in the project folder: `npm run dev`, then open http://localhost:3000

## Before going fully live
1. **Payments**: add your Razorpay keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) and a
   `DOWNLOAD_SECRET` to the environment. Until then, paid buttons show a friendly "payments not on
   yet" note; free downloads already work.
2. **Deploy**: push to GitHub - Vercel auto-builds. (This sandbox can't run the final build because
   it can't download Next's compiler, but your machine and Vercel can; the code type-checks clean.)
3. **File delivery at scale (optional)**: individual and category/subcategory downloads are zipped
   on the fly and work well. The *full-library* zip (10,501 files) is heavy for Vercel's free tier -
   if you sell it often, move the files to storage (e.g., Supabase) later. I can wire that up.

## What was verified here
- TypeScript type-check: clean.
- Pricing math, discount %, and the bundle "ladder": all correct.
- Download tokens (sign/verify, tamper + expiry) and the ZIP builder: tested, archives valid.
- Every template has a price and a file, and belongs to a category + subcategory bundle.
