import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <PageShell title="Terms & Conditions" updated="29 June 2026">
      <p>By using FlowDex (the site), you agree to these terms. Please read them carefully.</p>

      <h2>The service</h2>
      <p>
        FlowDex is a marketplace that sells original n8n workflow templates created and owned by us,
        available as single templates, category and subcategory bundles, and a full-library bundle.
      </p>

      <h2>Purchases and downloads</h2>
      <p>
        All products are our own original work. On successful payment you receive a non-exclusive
        license to use and adapt the template(s) for your own personal or business purposes.
        Download links are time-limited for security. You may not resell, redistribute, or
        sublicense the template files themselves. Refunds are handled under our{" "}
        <a href="/refund">Refund Policy</a>.
      </p>

      <h2>License</h2>
      <p>
        You may deploy, modify, and build upon purchased templates in unlimited projects of your
        own. You may not repackage or distribute the templates as a competing product, whether free
        or paid.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You agree not to misuse the site, attempt to disrupt it, or scrape, copy, or redistribute
        our catalog or template files for commercial purposes.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The FlowDex name, design, catalog, and template files belong to us. Products you purchase
        are licensed to you, not sold for redistribution.
      </p>

      <h2>Disclaimer</h2>
      <p>
        The site and its content are provided as is, without warranties of any kind. We do not
        guarantee that any workflow will be error-free or suitable for your specific needs.
        Templates require your own credentials and configuration to run. Built for the n8n platform;
        FlowDex is independent and not affiliated with n8n.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, FlowDex is not liable for any indirect or consequential loss
        arising from your use of the site or its products.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India.</p>

      <h2>Changes</h2>
      <p>We may update these terms from time to time. The date above shows the latest revision.</p>

      <h2>Contact</h2>
      <p>Questions? Email hello@flowdex.example.</p>
    </PageShell>
  );
}
