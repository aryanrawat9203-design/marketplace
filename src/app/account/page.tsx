"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { inr } from "@/lib/pricing";

type MyOrder = {
  kind: string;
  ref: string;
  itemTitle: string;
  amountPaise: number;
  razorpayOrderId: string | null;
  createdAt: string | null;
  downloadUrl: string;
};

export default function AccountPage() {
  const { session, user, loading, openLogin } = useAuth();
  // Orders are keyed to the email they were fetched for, so one account's
  // list can never flash on screen after a different account signs in.
  const [fetched, setFetched] = useState<{ email: string; orders: MyOrder[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.email) return;
    const email = session.user.email;
    const ctrl = new AbortController();
    fetch("/api/orders/mine", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { orders: MyOrder[] };
        setFetched({ email, orders: data.orders });
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setError("Could not load your orders. Please refresh.");
      });
    return () => ctrl.abort();
  }, [session]);

  const orders = fetched && user?.email === fetched.email ? fetched.orders : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-100">My library</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Every template and bundle you&apos;ve bought, ready to re-download anytime.
      </p>

      {loading && <div className="mt-10 text-sm text-zinc-500">Loading&hellip;</div>}

      {!loading && !user && (
        <div className="mt-10 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center">
          <p className="text-zinc-300">Sign in to see your purchases.</p>
          <button
            onClick={() => openLogin({ force: true })}
            className="mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 font-medium text-white hover:opacity-95"
          >
            Sign in
          </button>
          <p className="mt-4 text-xs text-zinc-500">
            Bought as a guest?{" "}
            <Link href="/orders/lookup" className="text-violet-400 hover:text-violet-300">
              Re-download with your order id
            </Link>
          </p>
        </div>
      )}

      {user && error && <p className="mt-10 text-sm text-amber-300">{error}</p>}

      {user && orders && orders.length === 0 && (
        <div className="mt-10 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center">
          <p className="text-zinc-300">No purchases yet on {user.email}.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Orders appear here automatically after payment. Paid with a different email?{" "}
            <Link href="/orders/lookup" className="text-violet-400 hover:text-violet-300">
              Look the order up here
            </Link>
            .
          </p>
          <Link
            href="/workflows"
            className="mt-5 inline-block rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 font-medium text-white hover:opacity-95"
          >
            Browse templates
          </Link>
        </div>
      )}

      {user && orders && orders.length > 0 && (
        <ul className="mt-8 space-y-3">
          {orders.map((o, i) => (
            <li
              key={`${o.razorpayOrderId ?? i}-${o.ref}`}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="line-clamp-1 font-medium text-zinc-100">{o.itemTitle}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {o.kind === "bundle" ? "Bundle (ZIP)" : o.kind === "cart" ? "Multi-template order (ZIP)" : "Single template (JSON)"}
                  {" · "}
                  {inr(o.amountPaise / 100)}
                  {o.createdAt && <> &middot; {new Date(o.createdAt).toLocaleDateString("en-IN")}</>}
                </div>
              </div>
              <a
                href={o.downloadUrl}
                className="shrink-0 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-center text-sm font-medium text-violet-300 hover:bg-violet-500/20"
              >
                Download again
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
