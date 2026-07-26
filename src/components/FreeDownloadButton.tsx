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
      <button type="button" onClick={() => setStep("prompt")} className={`btn-emerald btn-lg ${w}`}>
        Download free
      </button>
    );
  }

  return (
    <div className={`card-raised p-4 ${w}`}>
      <p className="text-sm text-body">
        Want new free templates in your inbox? Enter your email (optional).
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => download(true)} className="btn-emerald btn-md">
          Get my download
        </button>
        <button type="button" onClick={() => download(false)} className="btn-secondary btn-md">
          Skip, just download
        </button>
      </div>
    </div>
  );
}
