/**
 * WorkflowCrate brand mark: a crate-shaped tile holding a three-node
 * workflow graph. Single source of truth for the logo — used in the
 * header, footer and mobile menu (favicon/OG mirror it in next/og code).
 *
 * The gradient id is intentionally fixed: multiple instances on a page all
 * resolve to the same (identical) definition, which renders correctly and
 * keeps this usable from both server and client components.
 */
const GRADIENT_ID = "wc-logo-gradient";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  const id = GRADIENT_ID;
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B6CFF" />
          <stop offset="1" stopColor="#5B3AF0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill={`url(#${id})`} />
      {/* inset highlight for a machined, physical feel */}
      <rect x="1.75" y="1.75" width="28.5" height="28.5" rx="7.75" stroke="white" strokeOpacity="0.22" strokeWidth="1" />
      {/* the workflow: trigger → step → step */}
      <path
        d="M9.2 20.6 16.4 11.6 M16.4 11.6 23 19.4"
        stroke="white"
        strokeOpacity="0.9"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="9.2" cy="20.6" r="2.7" fill="white" />
      <circle cx="16.4" cy="11.6" r="3" fill="white" />
      <circle cx="23" cy="19.4" r="2.7" fill="white" />
    </svg>
  );
}

/** Mark + wordmark lockup. Wrap it in your own <Link>. */
export default function Logo({ markClassName = "h-8 w-8" }: { markClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className={markClassName} />
      <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
        Workflow<span className="text-violet-400">Crate</span>
      </span>
    </span>
  );
}
