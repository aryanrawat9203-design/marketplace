"use client";

import { Geist } from "next/font/google";
import "./globals.css";

// global-error.tsx replaces the root layout entirely when it renders, so the
// font variables that layout.tsx normally puts on <html> don't exist here —
// this file has to establish its own.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

/**
 * Last-resort boundary for failures in the root layout itself. Everything the
 * normal chrome provides (header, footer, cart, chat) is gone at this point,
 * so this page is deliberately self-contained and dependency-free.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <title>Something went wrong - WorkflowCrate</title>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <span className="font-mono text-sm font-medium uppercase tracking-[0.22em] text-violet-400">
            WorkflowCrate
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Something went wrong
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            The page failed to load. Retrying usually clears it. Your account and any completed
            purchases are unaffected.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => unstable_retry()} className="btn-primary btn-md">
              Try again
            </button>
            {/* Deliberately a plain <a>, not next/link: this boundary only
                renders when the root layout itself failed, so the client
                router is exactly the thing not to trust. A hard navigation
                discards the broken app state instead of routing within it. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="btn-secondary btn-md">
              Go to homepage
            </a>
          </div>
          {error.digest && (
            <p className="mt-8 font-mono text-xs text-faint">Reference: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
