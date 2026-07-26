/**
 * Loading placeholders for route-level `loading.tsx` files.
 *
 * These mirror the real components' box model closely enough that content
 * swapping in doesn't shift the layout — the whole point of a skeleton is to
 * reserve the space, not just to show that something is happening. The sweep
 * animation itself lives in `globals.css` (`.skeleton`).
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** Matches WorkflowCard: badge row, two title lines, blurb, chips, price row. */
export function WorkflowCardSkeleton() {
  return (
    <div className="card flex flex-col p-5">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-5 w-full" />
      <Skeleton className="mt-1.5 h-5 w-3/5" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-4/5" />
      <div className="mb-4 mt-4 flex flex-1 flex-wrap content-start gap-1.5">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-14" />
      </div>
      <div className="flex items-center justify-between border-t border-hairline pt-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

/** N card skeletons, unwrapped — the caller supplies the grid so the fallback
 *  and the real results can't drift apart. */
export function WorkflowCardSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <WorkflowCardSkeleton key={i} />
      ))}
    </>
  );
}

/** Screen-reader announcement so a skeleton isn't silence for non-visual users. */
export function LoadingAnnouncement({ label = "Loading" }: { label?: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {label}
    </p>
  );
}
