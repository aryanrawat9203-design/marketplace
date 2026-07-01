import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import OrderLookupForm from "@/components/OrderLookupForm";

export const metadata: Metadata = { title: "Re-download an order" };

export default function OrderLookupPage() {
  return (
    <PageShell title="Re-download an order">
      <p>
        Lost your download link? Enter the email you used at checkout and your Razorpay order id
        and we&apos;ll email you a fresh download link, valid for 30 days.
      </p>
      <OrderLookupForm />
    </PageShell>
  );
}
