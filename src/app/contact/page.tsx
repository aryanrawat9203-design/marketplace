import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <PageShell title="Contact us">
      <p>
        We would love to hear from you — questions, feedback, or workflow requests are all welcome.
      </p>
      <h2>Email</h2>
      <p>
        Reach us at <a href="mailto:hello@flowdex.example">hello@flowdex.example</a>. We aim to reply
        within 1–2 business days.
      </p>
      <p className="text-sm text-zinc-500">
        (Replace this with your real email address once you have one set up for the business.)
      </p>
    </PageShell>
  );
}
