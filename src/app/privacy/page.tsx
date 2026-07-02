import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" updated="27 June 2026">
      <p>
        WorkflowCrate (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy explains what
        information we collect, how we use it, and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Usage data</strong> &mdash; basic, mostly anonymous information about how you use
          the site (pages visited, device and browser type), collected through analytics.
        </li>
        <li>
          <strong>Information you provide</strong> &mdash; for example, your email address if you
          contact us.
        </li>
        <li>
          <strong>Purchase information</strong> &mdash; when you buy a product, your payment is processed
          securely by our payment provider (Razorpay). We do not see or store your card details.
        </li>
      </ul>

      <h2>How we use your information</h2>
      <p>
        To operate and improve the site, process and deliver your purchases, respond to your
        enquiries, and keep the service secure.
      </p>

      <h2>Cookies</h2>
      <p>
        We use essential cookies to run the site and analytics cookies to understand usage. You can
        control cookies through your browser settings.
      </p>

      <h2>Third-party services</h2>
      <p>
        We rely on trusted providers to run WorkflowCrate, including hosting (Vercel), payments
        (Razorpay), email, and analytics. These providers process data on our behalf under their own
        privacy policies.
      </p>

      <h2>Data sharing</h2>
      <p>We do not sell your personal information. We share it only with the providers above as needed to run the service, or where required by law.</p>

      <h2>Security</h2>
      <p>We take reasonable measures to protect your information, though no method of transmission or storage is completely secure.</p>

      <h2>Your rights</h2>
      <p>You may request access to, correction of, or deletion of your personal information by contacting us.</p>

      <h2>Children</h2>
      <p>WorkflowCrate is not directed to children under 16, and we do not knowingly collect their personal information.</p>

      <h2>Changes</h2>
      <p>We may update this policy from time to time. The date above shows the latest revision.</p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email us at{" "}
        <a href={`mailto:${process.env.SUPPORT_EMAIL}`}>{process.env.SUPPORT_EMAIL}</a>.
      </p>
    </PageShell>
  );
}
