import Link from "next/link";
import { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

/**
 * The one way a page announces itself: breadcrumbs, eyebrow, h1, description
 * and an optional action slot.
 *
 * Before this existed every page hand-rolled its own `<h1>` and the site had
 * six mutually-incompatible recipes for the same element (two text tones, two
 * weights, `tracking-tight` present or absent, responsive or not). Route
 * pages should reach for this rather than styling a heading inline.
 *
 * `SectionHeader` is the equivalent for headings *within* a page — this is
 * strictly for the top-of-page title block.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  action,
  size = "lg",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  action?: ReactNode;
  /** `md` for pages whose title is user data and can run long (a template
   *  name, a bundle name); `lg` for fixed editorial titles. */
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div className={className}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      {eyebrow && <p className={`eyebrow ${breadcrumbs?.length ? "mt-4" : ""}`}>{eyebrow}</p>}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          <h1
            className={`font-bold tracking-tight text-ink ${
              size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
            } ${eyebrow || breadcrumbs?.length ? "mt-2.5" : ""}`}
          >
            {title}
          </h1>
          {description && (
            <div className="mt-2.5 text-[15px] leading-relaxed text-muted">{description}</div>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/** Trail of ancestor links. The last item is the current page and is never a
 *  link — it is marked `aria-current` instead. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1.5 text-xs text-faint">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-x-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="rounded transition-colors hover:text-body">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-muted" : undefined}>
                  {c.label}
                </span>
              )}
              {!last && (
                // Decorative: the <ol> already conveys the hierarchy to
                // assistive tech, so this is hidden rather than announced.
                <span aria-hidden="true" className="text-faint/70">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
