import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PageShell title="About FlowDex">
      <p>
        FlowDex is an independent directory that helps people discover the right n8n automation
        workflow fast. We index thousands of publicly shared workflows and organise them by
        industry, tool, and use case, so you can find what you need in seconds instead of hours.
      </p>
      <h2>What we do</h2>
      <p>
        Searching through thousands of automations is slow. FlowDex makes it quick: browse by
        industry, filter by the tools you already use, and read a clear summary of what each
        workflow does before you open it on n8n.io — where it is free to import.
      </p>
      <h2>Our own workflows</h2>
      <p>
        Alongside the directory, we build and sell our own original, ready-to-use workflows in the{" "}
        <a href="/shop">Shop</a>. These are created by us and come with everything you need to get
        started right away.
      </p>
      <h2>Independent &amp; not affiliated</h2>
      <p>
        FlowDex is an independent project. The workflows in our directory are created by their
        respective authors and hosted for free on n8n.io. FlowDex is not affiliated with, endorsed
        by, or sponsored by n8n.
      </p>
      <h2>Get in touch</h2>
      <p>
        Questions or feedback? Head to our <a href="/contact">Contact</a> page — we read everything.
      </p>
    </PageShell>
  );
}
