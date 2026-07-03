import { Suspense } from "react";
import type { Metadata } from "next";
import ReviewForm from "./ReviewForm";

export const metadata: Metadata = {
  title: "Leave a review",
  robots: { index: false },
};

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-100">How was your template?</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Reviews come only from verified buyers via emailed links, and are checked before they
        appear on the site.
      </p>
      <Suspense fallback={<div className="mt-10 text-sm text-zinc-500">Loading&hellip;</div>}>
        <ReviewForm />
      </Suspense>
    </div>
  );
}
