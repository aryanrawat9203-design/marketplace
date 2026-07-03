import Link from "next/link";
import type { Metadata } from "next";
import CustomRequestForm from "./CustomRequestForm";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Get a custom n8n workflow built",
  description:
    "Can't find the exact automation you need? Describe it and get a fixed quote - we build custom, ready-to-import n8n workflows on the same quality bar as our 10,500-template catalog.",
};

const faqs: [string, string][] = [
  [
    "How does pricing work?",
    "You describe the workflow, we reply with a fixed quote based on complexity - most custom builds land between the price of a template bundle and a freelance project. No payment until you accept the quote.",
  ],
  [
    "What do I receive?",
    "A ready-to-import n8n JSON file built and tested for your use case, with setup notes for connecting your credentials. You own the right to use and adapt it in your projects, just like our catalog templates.",
  ],
  [
    "How long does a build take?",
    "Simple workflows are usually delivered within a few days of accepting the quote; multi-app or AI-heavy builds take longer - the quote includes a delivery estimate.",
  ],
  [
    "What if it doesn't work as described?",
    "The same promise as the store: if the delivered workflow won't import or doesn't do what the agreed spec says, we fix it or refund you.",
  ],
];

export default function CustomPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Custom workflows", path: "/custom" },
  ]);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const steps: [string, string][] = [
    ["Describe it", "Tell us the trigger, the steps, and the result you want - plus the apps involved."],
    ["Get a fixed quote", "We reply within 1-2 business days with a price and delivery estimate. No obligation."],
    ["Receive your workflow", "A tested, ready-to-import n8n JSON with setup notes - yours to use and adapt."],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <JsonLd data={faqJsonLd} />

      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          Need a workflow we <span className="gradient-text">don&apos;t have?</span>
        </h1>
        <p className="mt-3 text-lg text-zinc-400">
          We built the 10,500 templates in this store - we can build yours. Describe the automation
          and get a fixed quote, no payment upfront.
        </p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {steps.map(([t, d], i) => (
          <div key={t} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/15 font-semibold text-violet-300">
              {i + 1}
            </div>
            <h2 className="mt-3 font-medium text-zinc-100">{t}</h2>
            <p className="mt-1 text-sm text-zinc-400">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-zinc-100">Tell us what to build</h2>
          <div className="mt-4">
            <CustomRequestForm />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">Common questions</h2>
            <div className="mt-3 space-y-2">
              {faqs.map(([q, a]) => (
                <details key={q} className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-zinc-200 marker:content-none group-open:text-white">
                    {q}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 text-sm text-zinc-400">
            Not sure yet? Something close might already exist -{" "}
            <Link href="/workflows" className="text-violet-400 hover:text-violet-300">
              search the catalog
            </Link>{" "}
            or{" "}
            <Link href="/collections" className="text-violet-400 hover:text-violet-300">
              browse curated collections
            </Link>
            .
          </div>
        </aside>
      </div>
    </div>
  );
}
