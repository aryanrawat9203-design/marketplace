import Link from "next/link";
import { ReactNode } from "react";

/**
 * Shared header for landing/listing sections: mono eyebrow label, display
 * heading, optional description and a right-aligned "view all" arrow link.
 */
export default function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: { href: string; label: string };
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Heading className={`text-2xl font-semibold text-zinc-50 ${eyebrow ? "mt-2.5" : ""}`}>
          {title}
        </Heading>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="link-arrow shrink-0">
          {action.label} <span className="arrow">&rarr;</span>
        </Link>
      )}
    </div>
  );
}
