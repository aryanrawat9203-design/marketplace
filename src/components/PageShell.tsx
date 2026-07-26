import { ReactNode } from "react";
import PageHeader from "./PageHeader";

export default function PageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: title }]}
        title={title}
        description={updated ? `Last updated: ${updated}` : undefined}
      />
      <div className="mt-8 leading-relaxed text-body [&_a]:text-violet-400 hover:[&_a]:text-violet-300 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-ink [&_li]:mt-1.5 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </div>
  );
}
