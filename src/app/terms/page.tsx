import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <PageShell title="Terms & Conditions" updated="27 June 2026">
      <p>
        By using FlowDex (&quot;the site&quot;), you agree to these terms. Please read them
        carefully.
      </p>

      <h2>The service</h2>
      <p>
        FlowDex provides a directory of publicly available n8n workflows and a shop offering our own
        original workflow products.
      </p>

      <h2>Third-party content and links</h2>
      <p>
        Workflows listed in the directory are created by their respective authors and hosted on
        n8n.io. We provide links for your convenience and are not responsible for third-party
        content. FlowDex is independent and not affiliated with n8n.
      </p>

      <h2>Purchases and downloads</h2>
      <p>
        Paid products in our Shop are our own original work. On successful payment, you receive a
        licence to use the workflow for your own personal or business purposes. Download links are
        time-limited for security. You may not resell or redistribute products purchased from us.
        Refunds are handled under our <a href="/refund">Refund Policy</a>.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You agree not to misuse the site, attempt to disrupt it, or scrape or copy our content for
        commercial redistribution.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The FlowDex name, design, and original content belong to us. Products you purchase are
        licensed to you, not sold for redistribution.
      </p>

      <h2>Disclaimer</h2>
      <p>
        The site and its content are provided &quot;as is&quot;, without warranties of any kind. We
        do not guarantee that any workflow will be error-free or suitable for your specific needs.
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
      <p>
        Questions? Email <a href="mailto:hello@flowdex.example">hello@flowdex.example</a>.
      </p>
    </PageShell>
  );
}
