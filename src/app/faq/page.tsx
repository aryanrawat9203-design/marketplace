import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "FAQ" };

const faqs: [string, string][] = [
  [
    "Is FlowDex free to use?",
    "Yes. Browsing and searching the entire directory is completely free. Each workflow links to its free page on n8n.io.",
  ],
  [
    "How do I use a workflow I find here?",
    "Open the workflow's page, click 'Open this workflow free on n8n.io', then import it into your own n8n account.",
  ],
  [
    "Do you host or sell the directory workflows?",
    "No. The directory workflows are created by other authors and hosted free on n8n.io — we simply help you find them. The paid items in our Shop are our own original workflows.",
  ],
  [
    "What do I get when I buy from the Shop?",
    "An instant download of the workflow's JSON file, which you import directly into n8n. No account or external link needed.",
  ],
  [
    "Are you affiliated with n8n?",
    "No. FlowDex is an independent directory and is not affiliated with or endorsed by n8n.",
  ],
];

export default function FaqPage() {
  return (
    <PageShell title="Frequently asked questions">
      {faqs.map(([q, a], i) => (
        <div key={i}>
          <h2>{q}</h2>
          <p>{a}</p>
        </div>
      ))}
    </PageShell>
  );
}
