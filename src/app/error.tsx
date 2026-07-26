"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary. Catches render/data failures below the root
 * layout, so the header, footer and cart survive — the visitor keeps their
 * navigation instead of getting a blank page.
 *
 * `unstable_retry` (Next 16.2+) re-fetches and re-renders the failed segment,
 * which is what we want here; `reset` only clears boundary state without
 * re-fetching, so a transient catalog/network failure would just re-throw.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] border border-amber-500/25 bg-amber-500/10 text-amber-300"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Something went wrong on our end
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          This one is on us, not you. Retrying usually clears it — if it doesn&apos;t, the
          catalog and your account are unaffected and nothing was charged.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => unstable_retry()} className="btn-primary btn-md">
            Try again
          </button>
          <Link href="/workflows" className="btn-secondary btn-md">
            Browse templates
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 font-mono text-xs text-faint">
            Reference: {error.digest}
          </p>
        )}

        <p className="mt-3 text-sm text-faint">
          Still stuck?{" "}
          <Link href="/contact" className="text-violet-400 underline underline-offset-2 hover:text-violet-300">
            Contact support
          </Link>
          {error.digest ? " and quote the reference above." : "."}
        </p>
      </div>
    </div>
  );
}
