"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewStatus } from "@/lib/reviews";

type Row = {
  id: string;
  email: string;
  authorName: string | null;
  itemKind: string;
  itemRef: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  createdAt: string | null;
};

const TABS: { key: ReviewStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function ReviewModerationClient() {
  const router = useRouter();
  const [tab, setTab] = useState<ReviewStatus>("pending");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: ReviewStatus) => {
    setRows(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews?status=${status}`);
      if (res.status === 401) {
        router.push("/admin/login?next=/admin/reviews");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { reviews: Row[] };
      setRows(data.reviews);
    } catch {
      setError("Could not load reviews. Please refresh.");
    }
  }, [router]);

  useEffect(() => {
    // Deferred so the synchronous state resets never run inside the effect body.
    const t = setTimeout(() => load(tab), 0);
    return () => clearTimeout(t);
  }, [tab, load]);

  async function moderate(id: string, action: "approved" | "rejected") {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
      } else {
        setError("Could not update that review. Please try again.");
      }
    } catch {
      setError("Network error - please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Review moderation</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Only approved reviews ever appear on product pages.
          </p>
          <a href="/admin/screenshots" className="mt-1 inline-block text-xs text-violet-400 hover:text-violet-300">
            Template screenshots &rarr;
          </a>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Sign out
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t.key
                ? "bg-violet-500/15 text-violet-300"
                : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-amber-300">{error}</p>}

      {rows === null && !error && <p className="mt-8 text-sm text-zinc-500">Loading&hellip;</p>}

      {rows && rows.length === 0 && (
        <p className="mt-8 text-sm text-zinc-500">No {tab} reviews.</p>
      )}

      {rows && rows.length > 0 && (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span aria-label={`${r.rating} out of 5 stars`} className="text-amber-400">
                  {"★".repeat(r.rating)}
                  <span className="text-zinc-700">{"★".repeat(5 - r.rating)}</span>
                </span>
                <span className="text-zinc-300">{r.authorName || "(no display name)"}</span>
                <span className="text-zinc-600">&middot;</span>
                <span className="text-zinc-500">{r.email}</span>
                <span className="text-zinc-600">&middot;</span>
                <a
                  href={`/workflows/${r.itemRef}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-400 hover:text-violet-300"
                >
                  {r.itemRef}
                </a>
                {r.createdAt && (
                  <span className="text-xs text-zinc-600">
                    {new Date(r.createdAt).toLocaleDateString("en-IN")}
                  </span>
                )}
              </div>
              {r.title && <div className="mt-2 text-sm font-medium text-zinc-100">{r.title}</div>}
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{r.body}</p>

              {tab === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => moderate(r.id, "approved")}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => moderate(r.id, "rejected")}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
