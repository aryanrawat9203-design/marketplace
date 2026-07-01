"use client";

import { useState } from "react";

export default function FreeDownloadButton({
  workflowKey,
  block = false,
}: {
  workflowKey: string;
  block?: boolean;
}) {
  const [step, setStep] = useState<"button" | "prompt">("button");
  const [email, setEmail] = useState("");
  const w = block ? "w-full" : "";
  const downloadUrl = `/api/download?kind=workflow&key=${encodeURIComponent(workflowKey)}`;

  function download(withEmail: boolean) {
    if (withEmail && email) {
      // Fire-and-forget - never blocks or delays the download.
      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "free-download:" + workflowKey }),
        keepalive: true,
      }).catch(() => {});
    }
    window.location.href = downloadUrl;
  }

  if (step === "button") {
    return (
      <button
        type="button"
        onClick={() => setStep("prompt")}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-medium text-white hover:opacity-95 ${w}`}
      >
        Download free
      </button>
    );
  }

  return (
    <div className={`rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 ${w}`}>
      <p className="text-sm text-zinc-300">
        Want new free templates in your inbox? Enter your email (optional).
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => download(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-medium text-white hover:opacity-95"
        >
          Get my download
        </button>
        <button
          type="button"
          onClick={() => download(false)}
          className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Skip, just download
        </button>
      </div>
    </div>
  );
}
