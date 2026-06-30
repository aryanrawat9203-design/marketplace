"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/workflows?q=${encodeURIComponent(q)}`);
      }}
      className="relative"
    >
      <input
        suppressHydrationWarning
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search 10,500+ templates..."
        className={`w-full rounded-xl border border-zinc-700/70 bg-zinc-900/70 pl-10 pr-3 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500/70 ${
          compact ? "h-10 text-sm" : "h-12"
        }`}
      />
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </form>
  );
}

type Option = { name: string; count?: number; label?: string };

function Select({
  name,
  value,
  options,
  all,
}: {
  name: string;
  value: string;
  options: Option[];
  all: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <select
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams(Array.from(sp.entries()));
        if (e.target.value) params.set(name, e.target.value);
        else params.delete(name);
        params.delete("page");
        router.push(`/workflows?${params.toString()}`);
      }}
      className="h-10 rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 text-sm text-zinc-200 outline-none focus:border-violet-500/70"
    >
      <option value="">{all}</option>
      {options.map((o) => (
        <option key={o.name} value={o.name}>
          {(o.label ?? o.name) + (o.count != null ? ` (${o.count})` : "")}
        </option>
      ))}
    </select>
  );
}

export function FilterBar({
  taxonomy,
  current,
}: {
  taxonomy: {
    industries: Option[];
    categories: Option[];
    difficulties: Option[];
    tiers: Option[];
  };
  current: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select name="industry" value={current.industry ?? ""} options={taxonomy.industries} all="All industries" />
      <Select name="category" value={current.category ?? ""} options={taxonomy.categories} all="All categories" />
      <Select name="difficulty" value={current.difficulty ?? ""} options={taxonomy.difficulties} all="Any level" />
      <Select name="tier" value={current.tier ?? ""} options={taxonomy.tiers} all="Any tier" />
      <Select
        name="sort"
        value={current.sort ?? ""}
        all="Sort by"
        options={[
          { name: "demand", label: "Most popular" },
          { name: "value", label: "Highest value" },
          { name: "price_asc", label: "Price: low to high" },
          { name: "price_desc", label: "Price: high to low" },
          { name: "title", label: "A-Z" },
        ]}
      />
    </div>
  );
}
