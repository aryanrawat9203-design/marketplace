import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = { title: "FAQ" };

const faqs: [string, string][] = [
  [
    "What exactly am I buying?",
    "Original, ready-to-import n8n workflow templates that we build in-house. Each purchase delivers the workflow's JSON file (a bundle delivers a ZIP of all its templates), which you import directly into your own n8n account.",
  ],
  [
    "Is browsing free?",
    "Yes - searching and browsing the whole catalog is always free, and we keep a small set of templates genuinely free to download so you can judge the quality first. Every other template is priced, starting from just ₹49 for entry-level \"Starter\" workflows.",
  ],
  [
    "How do I use a template after buying?",
    "In n8n, open Workflows, then the menu, then Import from File, and choose the downloaded JSON. Add your own credentials on the app nodes and you are ready to run.",
  ],
  [
    "Single template or bundle - which should I pick?",
    "Buy a single template if you need one specific automation. If you need several in the same area, a category or subcategory bundle costs far less per template, and the Full Library is the best value of all.",
  ],
  [
    "How is pricing decided?",
    "Each template is priced by its tier and complexity. All prices are discounted launch pricing and will rise over time, so buying now locks in the lowest price.",
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
