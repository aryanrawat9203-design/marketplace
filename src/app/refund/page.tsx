import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPage() {
  return (
    <PageShell title="Refund Policy" updated="4 July 2026">
      <p>
        We want you to be happy with your purchase. This policy explains how refunds work for our
        digital products.
      </p>

      <h2>No refund for change of mind</h2>
      <p>
        Our workflows are delivered instantly as digital downloads, so <strong>all sales are
        final</strong> once a file has been downloaded. We do not offer refunds because you changed
        your mind, found a similar template elsewhere, or no longer need the workflow.
      </p>

      <h2>When we will help</h2>
      <p>
        The one exception: if a file is faulty, will not import, is not as described, or you were
        charged more than once for the same order, contact us within <strong>7 days</strong> of
        purchase and we will fix the issue or provide a refund.
      </p>

      <h2>How to request</h2>
      <p>
        Email{" "}
        <a href={`mailto:${process.env.SUPPORT_EMAIL}`}>{process.env.SUPPORT_EMAIL}</a> with your
        order details and a short description of the problem. We respond within 1&ndash;2 business
        days.
      </p>

      <h2>Free items</h2>
      <p>Free downloads carry no charge, so no refund is needed.</p>
    </PageShell>
  );
}
