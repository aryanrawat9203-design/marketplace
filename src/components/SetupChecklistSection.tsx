import type { SetupChecklist, SetupStep } from "@/lib/setup-checklist";

/**
 * The pre-purchase "what you will have to do" section.
 *
 * This is deliberately above the fold of the buying decision rather than in a
 * post-purchase readme. Most of these templates leave resource locators
 * unbound behind placeholder labels, so the n8n editor shows a filled-in
 * dropdown that is bound to nothing - a buyer cannot discover that by looking
 * at the product page, the screenshots or the node graph. At the prices these
 * carry, they are entitled to know before paying, not after.
 *
 * Rendered from the same `buildSetupChecklist` the SETUP.md in the download is
 * rendered from, so the page and the file cannot disagree.
 */

function StepList({ steps }: { steps: SetupStep[] }) {
  return (
    <ol className="mt-3 space-y-3">
      {steps.map((s, i) => (
        <li key={`${s.title}-${i}`} className="flex gap-3">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-xs font-semibold text-muted">
            {i + 1}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink">{s.title}</div>
            <p className="mt-0.5 break-words text-sm leading-relaxed text-muted">{s.detail}</p>
            {s.param && (
              <p className="mt-1 text-xs text-faint">
                Parameter <code className="code-ref">{s.param}</code>
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Group({
  heading,
  blurb,
  steps,
}: {
  heading: string;
  blurb: string;
  steps: SetupStep[];
}) {
  if (steps.length === 0) return null;
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="text-sm font-semibold text-ink">
        {heading} <span className="font-normal text-faint">({steps.length})</span>
      </h3>
      <p className="mt-1 text-sm text-muted">{blurb}</p>
      <StepList steps={steps} />
    </div>
  );
}

export default function SetupChecklistSection({ checklist }: { checklist: SetupChecklist }) {
  const {
    credentials,
    bindings,
    behaviour,
    stepCount,
    bindingFree,
    missingSubWorkflows,
    malformedNodes,
  } = checklist;

  return (
    <section className="card mt-8 p-5" id="setup">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-semibold text-ink">Before it runs: {stepCount} setup steps</h2>
        <span className="text-xs text-faint">generated from this template&apos;s JSON</span>
      </div>

      <p className="mt-2 text-sm text-muted">
        This is not a ready-to-run automation. It is a complete, documented workflow that you
        connect to your own accounts and data. Here is exactly what that takes for this template -
        read it before you buy.
      </p>

      {malformedNodes.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-500/35 bg-rose-500/[0.08] p-4">
          <div className="text-sm font-semibold text-rose-200">
            Known defect in this template
          </div>
          <p className="mt-1 break-words text-sm text-rose-100/85">
            {malformedNodes.map((n) => `"${n}"`).join(", ")}{" "}
            {malformedNodes.length === 1 ? "carries parameters" : "carry parameters"} belonging to a
            different n8n node type, so {malformedNodes.length === 1 ? "it" : "they"} cannot be
            configured and will do nothing on import. We would rather tell you before you buy -
            email support@workflowcrate.com and we will fix it or refund you.
          </p>
        </div>
      )}

      {missingSubWorkflows.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
          <div className="text-sm font-semibold text-amber-200">
            This template calls {missingSubWorkflows.length === 1 ? "a sub-workflow" : "sub-workflows"}{" "}
            that {missingSubWorkflows.length === 1 ? "is" : "are"} not included
          </div>
          <p className="mt-1 break-words text-sm text-amber-100/80">
            {missingSubWorkflows.map((n) => `"${n}"`).join(", ")}{" "}
            {missingSubWorkflows.length === 1 ? "is referenced" : "are referenced"} by name, and no
            template in the catalog provides {missingSubWorkflows.length === 1 ? "it" : "them"}. You
            will have to build {missingSubWorkflows.length === 1 ? "it" : "them"} yourself before
            this workflow runs end to end.
          </p>
        </div>
      )}

      {bindingFree && missingSubWorkflows.length === 0 && (
        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
          <div className="text-sm font-semibold text-emerald-200">Nothing is left unbound here</div>
          <p className="mt-1 text-sm text-emerald-100/80">
            Every parameter in this template has a real value. Add the credentials below and it runs
            as shipped - no placeholder dropdowns to hunt down.
          </p>
        </div>
      )}

      <div className="mt-5">
        <Group
          heading="Credentials to create"
          blurb="Workflow files ship without credentials attached, so each of these nodes has an empty credential selector on import."
          steps={credentials}
        />
        <Group
          heading="Values you have to pick"
          blurb="These parameters have no value stored. Where n8n shows a name in the dropdown, that name is a label with nothing behind it - the node looks configured and will fail or quietly return nothing until you select the real item."
          steps={bindings}
        />
        <Group
          heading="Behaviour to check"
          blurb="These run without erroring, but will not do what you probably want until you change them."
          steps={behaviour}
        />
      </div>

      <p className="mt-5 text-xs text-faint">
        The same checklist ships as a SETUP.md inside the download.
      </p>
    </section>
  );
}
