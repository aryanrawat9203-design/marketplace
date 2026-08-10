import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import PageShell from "@/components/PageShell";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description:
    "Questions about a template, an order, or a custom n8n workflow build? Email us or use the contact form - we reply within 1-2 business days.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <PageShell title="Contact us">
      <p>
        We would love to hear from you &mdash; questions, feedback, or workflow requests are all
        welcome. Email{" "}
        <a href={`mailto:${process.env.SUPPORT_EMAIL}`}>{process.env.SUPPORT_EMAIL}</a> directly, or
        use the form below. We aim to reply within 1&ndash;2 business days.
      </p>
      <ContactForm />
      <div className="mt-10 border-t border-hairline pt-6 text-sm text-muted">
        <p>
          <strong className="text-ink">Seller:</strong> Aryan Rawat, trading as WorkflowCrate.
        </p>
        <p className="mt-1">
          <strong className="text-ink">Registered address:</strong> 13, Near Chark Hospital, Joy
          Builders Colony, Vallabh Nagar, Ahilya Mata Colony, Indore, Madhya Pradesh 452003, India
        </p>
        <p className="mt-1">
          <strong className="text-ink">Customer care &amp; grievance officer:</strong> Aryan Rawat
        </p>
        <p className="mt-1">
          <strong className="text-ink">Email:</strong>{" "}
          <a href={`mailto:${process.env.SUPPORT_EMAIL}`}>{process.env.SUPPORT_EMAIL}</a>
        </p>
      </div>
    </PageShell>
  );
}
