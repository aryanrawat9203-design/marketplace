import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PageShell title="About WorkflowCrate">
      <p>
        WorkflowCrate is a marketplace for original, ready-to-import n8n automation workflows. Every
        template in our catalog is built in-house and organised by category, subcategory, and
        difficulty so you can find exactly the automation you need and put it to work in minutes.
      </p>
      <h2>What we do</h2>
      <p>
        Building automations from scratch is slow. We have done the hard part: thousands of
        production-style workflows across AI agents, email, lead generation, content, CRM,
        e-commerce, and many more areas. Browse the catalog for free, read a clear summary of what
        each workflow does, then buy and download the JSON instantly.
      </p>
      <h2>Single templates or bundles</h2>
      <p>
        Buy one template at a time, grab a whole <Link href="/bundles">category bundle</Link>, or get the
        full library in a single purchase. Bundles are always the best value per template.
      </p>
      <h2>Original &amp; owned</h2>
      <p>
        All templates are original works created and owned by WorkflowCrate. When you buy, you receive a
        license to use and adapt them in your own personal or business projects. Built for the n8n
        automation platform.
      </p>
      <h2>Get in touch</h2>
      <p>
        Questions or workflow requests? Head to our <a href="/contact">Contact</a> page - we read
        everything.
      </p>
    </PageShell>
  );
}
