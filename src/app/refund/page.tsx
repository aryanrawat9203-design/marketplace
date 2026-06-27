import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPage() {
  return (
    <PageShell title="Refund Policy" updated="27 June 2026">
      <p>
        We want you to be happy with your purchase. This policy explains how refunds work for our
        digital products.
      </p>

      <h2>Digital downloads</h2>
      <p>
        Because our workflows are delivered instantly as digital downloads, all sales are generally
        final once the file has been downloaded.
      </p>

      <h2>When we will help</h2>
      <p>
        If a file is faulty, will not import, or is not as described, contact us within{" "}
        <strong>7 days</strong> of purchase and we will fix the issue or provide a refund.
      </p>

      <h2>How to request</h2>
      <p>
        Email <a href="mailto:hello@flowdex.example">hello@flowdex.example</a> with your order
        details and a short description of the problem. We respond within 1–2 business days.
      </p>

      <h2>Free items</h2>
      <p>Free downloads carry no charge, so no refund is needed.</p>
    </PageShell>
  );
}
