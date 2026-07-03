"use client";

import { useState } from "react";

const BUDGETS = ["Under Rs 2,000", "Rs 2,000 - 5,000", "Rs 5,000 - 15,000", "Rs 15,000+", "Not sure yet"];
const TIMELINES = ["As soon as possible", "Within 1-2 weeks", "Flexible"];

const inputCls =
  "mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus-visible:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500";

export default function CustomRequestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [apps, setApps] = useState("");
  const [budget, setBudget] = useState("Not sure yet");
  const [timeline, setTimeline] = useState("Flexible");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <p className="font-medium text-emerald-300">Request received!</p>
        <p className="mt-2 text-sm text-zinc-400">
          We&apos;ll reply to <span className="text-zinc-200">{email}</span> with a quote and any
          follow-up questions, usually within 1&ndash;2 business days.
        </p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 20) {
      setErrorMsg("Please describe what you want to automate in a bit more detail (a few sentences helps us quote accurately).");
      setState("error");
      return;
    }
    setState("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/custom-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, description, apps, budget, timeline }),
      });
      if (res.ok) {
        setState("done");
        return;
      }
      setErrorMsg(
        res.status === 429
          ? "Too many requests - please wait a few minutes and try again."
          : res.status === 400
            ? "Please check your email address and description, then try again."
            : "Something went wrong sending your request. Please try again, or email us via the contact page."
      );
      setState("error");
    } catch {
      setErrorMsg("Network error - please check your connection and try again.");
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cr-name" className="text-sm font-medium text-zinc-200">
            Name <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input id="cr-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your name" className={inputCls} />
        </div>
        <div>
          <label htmlFor="cr-email" className="text-sm font-medium text-zinc-200">Email</label>
          <input id="cr-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={inputCls} />
        </div>
      </div>

      <div>
        <label htmlFor="cr-desc" className="text-sm font-medium text-zinc-200">What should the workflow do?</label>
        <textarea
          id="cr-desc"
          required
          minLength={20}
          maxLength={4000}
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. When a new order lands in Shopify, enrich the customer in HubSpot, generate an invoice PDF, and post a summary to our Slack channel..."
          className={inputCls}
        />
        <p className="mt-1 text-xs text-zinc-600">The trigger, the steps, and the end result - as specific as you can.</p>
      </div>

      <div>
        <label htmlFor="cr-apps" className="text-sm font-medium text-zinc-200">
          Apps &amp; tools involved <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input id="cr-apps" value={apps} onChange={(e) => setApps(e.target.value)} maxLength={300} placeholder="e.g. Shopify, HubSpot, Slack, OpenAI" className={inputCls} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cr-budget" className="text-sm font-medium text-zinc-200">Budget</label>
          <select id="cr-budget" value={budget} onChange={(e) => setBudget(e.target.value)} className={inputCls}>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>{b.replace("Rs ", "₹")}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cr-timeline" className="text-sm font-medium text-zinc-200">Timeline</label>
          <select id="cr-timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)} className={inputCls}>
            {TIMELINES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {state === "error" && errorMsg && <p className="text-sm text-amber-300">{errorMsg}</p>}

      <button
        type="submit"
        disabled={state === "sending"}
        className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3 font-medium text-white hover:opacity-95 disabled:opacity-60"
      >
        {state === "sending" ? "Sending..." : "Request a quote"}
      </button>
      <p className="text-xs text-zinc-600">No payment now - you get a fixed quote first, and only pay if you go ahead.</p>
    </form>
  );
}
