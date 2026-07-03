"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ReviewForm() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  const [itemTitle, setItemTitle] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return; // rendered as invalid below without touching state
    const ctrl = new AbortController();
    fetch(`/api/reviews?token=${encodeURIComponent(token)}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { itemTitle: string };
        setItemTitle(data.itemTitle);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setInvalid(true);
      });
    return () => ctrl.abort();
  }, [token]);

  if (invalid || !token) {
    return (
      <div className="mt-10 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center">
        <p className="text-zinc-300">This review link is invalid or has expired.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Review links arrive in your order-confirmation email and stay valid for 90 days.{" "}
          <Link href="/contact" className="text-violet-400 hover:text-violet-300">
            Contact us
          </Link>{" "}
          if you need a fresh one.
        </p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <p className="font-medium text-emerald-300">Thank you! Your review was submitted.</p>
        <p className="mt-2 text-sm text-zinc-400">
          It will appear on the site once it clears a quick moderation check.
        </p>
        <Link
          href="/workflows"
          className="mt-5 inline-block rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 font-medium text-white hover:opacity-95"
        >
          Keep browsing
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || body.trim().length < 10) {
      setErrorMsg("Please pick a star rating and write at least 10 characters.");
      setState("error");
      return;
    }
    setState("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, authorName, title, body }),
      });
      if (res.ok) {
        setState("done");
        return;
      }
      setErrorMsg(
        res.status === 429
          ? "Too many attempts - please wait a few minutes and try again."
          : res.status === 403
            ? "This review link is invalid or has expired."
            : "Something went wrong on our side. Please try again in a minute."
      );
      setState("error");
    } catch {
      setErrorMsg("Network error - please check your connection and try again.");
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {itemTitle && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300">
          Reviewing: <span className="font-medium text-zinc-100">{itemTitle}</span>
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-medium text-zinc-200">Your rating</legend>
        <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="p-1 text-3xl leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
            >
              <span className={(hover || rating) >= n ? "text-amber-400" : "text-zinc-700"}>★</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="review-name" className="text-sm font-medium text-zinc-200">
          Display name <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="review-name"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={60}
          placeholder="e.g. Priya S."
          className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus-visible:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
        />
      </div>

      <div>
        <label htmlFor="review-title" className="text-sm font-medium text-zinc-200">
          Headline <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Sums it up in one line"
          className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus-visible:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
        />
      </div>

      <div>
        <label htmlFor="review-body" className="text-sm font-medium text-zinc-200">
          Your review
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Did it import cleanly? Save you time? What did you use it for?"
          className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus-visible:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
        />
      </div>

      {state === "error" && errorMsg && <p className="text-sm text-amber-300">{errorMsg}</p>}

      <button
        type="submit"
        disabled={state === "sending"}
        className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3 font-medium text-white hover:opacity-95 disabled:opacity-60"
      >
        {state === "sending" ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
