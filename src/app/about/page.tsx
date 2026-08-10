import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = pageMeta({
  title: "About",
  description:
    "WorkflowCrate is a solo-built library of original n8n workflow templates - who builds them, how they are made, and what happens when something breaks.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <PageShell title="About WorkflowCrate">
      <div className="not-prose mb-8 flex items-center gap-4">
        <div
          aria-hidden="true"
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 font-display text-2xl font-bold text-white"
        >
          A
        </div>
        <div>
          <div className="font-semibold text-ink">Aryan Rawat</div>
          <div className="text-sm text-muted">Founder, WorkflowCrate &mdash; solo-built</div>
        </div>
      </div>

      <p>
        I built WorkflowCrate because I was tired of rebuilding the same kinds of n8n automations from
        scratch every time a client or project needed one. So I started building a library of them
        properly &mdash; documented, tested, organised &mdash; and decided to open it up so other
        people building on n8n could skip the same repetitive work.
      </p>
      <p>
        Every template in the catalog is original: built in-house, not scraped from someone else&apos;s
        public workflow. You can see the full node graph and a plain-English breakdown before you pay
        anything.
      </p>
      <h2>What happens if something breaks</h2>
      <p>
        This is a solo operation, not a support team, so I read every message myself. If a template
        does not import cleanly, is missing something it claims to have, or anything else about your
        order goes wrong, email{" "}
        <a href={`mailto:${process.env.SUPPORT_EMAIL}`}>{process.env.SUPPORT_EMAIL}</a> and I will
        fix it or refund you &mdash; see the <Link href="/refund">refund policy</Link> for details. I
        aim to reply within 1&ndash;2 business days.
      </p>
      <h2>Single templates or bundles</h2>
      <p>
        Buy one template at a time, grab a whole <Link href="/bundles">category bundle</Link>, or get
        the full library in a single purchase. Bundles are always the best value per template.
      </p>
      <h2>Original &amp; owned</h2>
      <p>
        All templates are original works created and owned by WorkflowCrate. When you buy, you receive a
        license to use and adapt them in your own personal or business projects. Built for the n8n
        automation platform.
      </p>
      <h2>Get in touch</h2>
      <p>
        Questions or workflow requests? Head to our <Link href="/contact">Contact</Link> page or email
        directly &mdash; I read everything.
      </p>
    </PageShell>
  );
}
