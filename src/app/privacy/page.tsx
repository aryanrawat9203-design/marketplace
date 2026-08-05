import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" updated="5 August 2026">
      <p>
        WorkflowCrate (&quot;we&quot;, &quot;us&quot;), operated by <strong>Aryan Rawat, trading as
        WorkflowCrate</strong>, respects your privacy. This policy explains what information we
        collect, how we use it, and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Usage data</strong>{" "}&mdash; basic, mostly anonymous information about how you use
          the site (pages visited, device and browser type), collected through analytics.
        </li>
        <li>
          <strong>Information you provide</strong>{" "}&mdash; for example, your email address if you
          contact us.
        </li>
        <li>
          <strong>Purchase information</strong>{" "}&mdash; when you buy a product, your payment is processed
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
        We use only <strong>strictly necessary cookies</strong> &mdash; for example, to keep you
        signed in and to complete secure checkout. We do not use advertising or tracking cookies. Site
        usage is measured through Vercel Analytics, which is cookieless and reports aggregated,
        non-identifying data only. Because we do not set non-essential cookies, no cookie-consent
        banner is required; if that changes, we will add one before any new cookie is set.
      </p>

      <h2>Third-party services</h2>
      <p>
        We rely on trusted providers to run WorkflowCrate, including hosting and cookieless analytics
        (Vercel), database, authentication, and file storage (Supabase), payments (Razorpay), and
        transactional email (Resend). These providers process data on our behalf under their own
        privacy policies.
      </p>

      <h2>Data retention</h2>
      <ul>
        <li>
          <strong>Account data</strong> (Supabase Auth) is kept for as long as your account is active,
          and for a limited period after you request deletion to complete the deletion process.
        </li>
        <li>
          <strong>Order and payment records</strong> are retained for up to 8 years to meet Indian tax
          and consumer-dispute recordkeeping requirements.
        </li>
        <li>
          <strong>Support and contact emails</strong> are retained for up to 24 months, then deleted.
        </li>
        <li>
          <strong>Analytics data</strong> is aggregated and non-identifying, and is not tied to your
          account.
        </li>
      </ul>

      <h2>International transfers</h2>
      <p>
        Some of our providers (including Vercel and Supabase) process and store data on servers located
        outside India. By using the site, you consent to this transfer, which is necessary to provide
        the service.
      </p>

      <h2>Data sharing</h2>
      <p>We do not sell your personal information. We share it only with the providers above as needed to run the service, or where required by law.</p>

      <h2>Security</h2>
      <p>We take reasonable measures to protect your information, though no method of transmission or storage is completely secure.</p>

      <h2>Your rights</h2>
      <p>You may request access to, correction of, or deletion of your personal information by contacting us.</p>

      <h2>Grievance officer</h2>
      <p>
        For any privacy or data-protection grievance, contact our grievance officer, Aryan Rawat, at{" "}
        <a href={`mailto:${process.env.SUPPORT_EMAIL}`}>{process.env.SUPPORT_EMAIL}</a>. We aim to
        acknowledge grievances within 1&ndash;2 business days.
      </p>

      <h2>Children</h2>
      <p>WorkflowCrate is not directed to children under 18, and we do not knowingly collect their personal information.</p>

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
