import Link from "next/link";

export default function TrustStrip() {
  return (
    <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-xs text-faint">
      <svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-500/80"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      Secure checkout &middot; Razorpay &middot; Instant download &middot;{" "}
      <Link href="/refund" className="underline underline-offset-2 transition-colors hover:text-body">
        Refund policy
      </Link>
    </p>
  );
}
