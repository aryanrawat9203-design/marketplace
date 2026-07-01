import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <PageShell title="Contact us">
      <p>
        We would love to hear from you &mdash; questions, feedback, or workflow requests are all
        welcome. Fill in the form below and we aim to reply within 1&ndash;2 business days.
      </p>
      <ContactForm />
    </PageShell>
  );
}
