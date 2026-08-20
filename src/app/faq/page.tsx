import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import PageShell from "@/components/PageShell";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = pageMeta({
  title: "FAQ",
  description:
    "Answers to the common questions about WorkflowCrate: what you are buying, how delivery works, whether templates run on self-hosted n8n, refunds, and licensing.",
  path: "/faq",
});

const faqs: [string, string][] = [
  [
    "What exactly am I buying?",
    "Original n8n workflow templates that we build in-house. Each purchase delivers a ZIP containing the workflow JSON and a generated SETUP.md listing what you have to connect before it will run (a bundle delivers all its templates the same way). The JSON imports directly into your own n8n account.",
  ],
  [
    "Is browsing free?",
    "Yes - searching and browsing the whole catalog is always free, and we keep a set of templates genuinely free to download so you can judge the quality first. Every other template is priced, starting from ₹499 for entry-level \"Starter\" workflows.",
  ],
  [
    "How do I use a template after buying?",
    "In n8n, open Workflows, then the menu, then Import from File, and choose the workflow JSON from the download. Then work through the SETUP.md that ships beside it: credentials first, then the values the file deliberately leaves for you to pick - your spreadsheet, your database, your channel. Most templates have a few of those, and n8n shows them as dropdowns with a placeholder name already in them, so they are easy to walk past. The same checklist is on every product page before you buy.",
  ],
  [
    "Single template or bundle - which should I pick?",
    "Buy a single template if you need one specific automation. If you need several in the same area, a category or subcategory bundle costs far less per template, and the Full Library is the best value of all.",
  ],
  [
    "How is pricing decided?",
    "Each template is priced by its tier and complexity - simpler workflows cost less, higher-complexity multi-system builds cost more. It's a one-time payment per template or bundle, no subscription.",
  ],
  [
    "What payment methods do you accept?",
    "Payments are handled securely by Razorpay - UPI (including PhonePe, Google Pay), cards, netbanking, and wallets.",
  ],
  [
    "Can I get a refund?",
    "Digital downloads are generally final, but if a file is faulty, will not import, or is not as described, contact us within 7 days and we will fix it or refund you. See our Refund Policy.",
  ],
  [
    "Can I resell the templates?",
    "You receive a license to use and adapt templates in your own projects. Reselling or redistributing the template files themselves is not permitted.",
  ],
];

export default function FaqPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <PageShell title="Frequently asked questions">
      <JsonLd data={faqJsonLd} />
      {faqs.map(([q, a], i) => (
        <div key={i}>
          <h2>{q}</h2>
          <p>{a}</p>
        </div>
      ))}
    </PageShell>
  );
}
