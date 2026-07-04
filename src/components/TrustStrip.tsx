import Link from "next/link";

export default function TrustStrip() {
  return (
    <p className="mt-3 text-center text-xs text-zinc-500">
      Secure checkout &middot; Payments by Razorpay &middot; Instant download &middot;{" "}
      <Link href="/refund" className="underline underline-offset-2 hover:text-zinc-300">
        No refund policy
      </Link>
    </p>
  );
}
