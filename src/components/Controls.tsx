"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { integrationSlug } from "@/lib/slug";

type SuggestPayload = {
  templates: Array<{ route: string; title: string; category: string | null; price: number; free: boolean }>;
  categories: Array<{ name: string; count: number }>;
  platforms: Array<{ name: string; count: number }>;
  total: number;
};

type SuggestRow = { key: string; href: string; label: string; hint: string };

function suggestRows(q: string, s: SuggestPayload): SuggestRow[] {
  const rows: SuggestRow[] = s.templates.map((t) => ({
    key: `w:${t.route}`,
    href: `/workflows/${t.route}`,
    label: t.title,
    hint: t.free ? "Free" : t.category ?? "Template",
  }));
  for (const c of s.categories) {
    rows.push({
      key: `c:${c.name}`,
      href: `/workflows?category=${encodeURIComponent(c.name)}`,
      label: `${c.name} (category)`,
      hint: `${c.count.toLocaleString("en-IN")} templates`,
    });
  }
  for (const p of s.platforms) {
    rows.push({
      key: `p:${p.name}`,
      href: `/integrations/${integrationSlug(p.name)}`,
      label: `${p.name} (integration)`,
      hint: `${p.count.toLocaleString("en-IN")} templates`,
    });
  }
  if (s.total > 0) {
    rows.push({
      key: "all",
      href: `/workflows?q=${encodeURIComponent(q)}`,
      label: `See all ${s.total.toLocaleString("en-IN")} results`,
      hint: "",
    });
  }
  return rows;
}

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [rows, setRows] = useState<SuggestRow[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = compact ? "search-suggest-compact" : "search-suggest";

  useEffect(() => {
    const query = q.trim();
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      if (query.length < 2) {
        setRows([]);
        return;
      }
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        const data = (await res.json()) as SuggestPayload;
        setRows(suggestRows(query, data));
        setActive(-1);
      } catch {
        /* stale/aborted lookups are fine to drop */
      }
    }, 150);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const showList = open && rows.length > 0 && q.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && rows[active]) go(rows[active].href);
          else go(`/workflows?q=${encodeURIComponent(q)}`);
        }}
        role="search"
      >
        <input
          suppressHydrationWarning
          aria-label="Search templates"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % rows.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a <= 0 ? rows.length - 1 : a - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
          }}
          placeholder="Search 10,500+ templates..."
          className={`w-full rounded-xl border border-zinc-700/70 bg-zinc-900/70 pl-10 pr-3 text-zinc-100 placeholder-zinc-500 outline-none focus-visible:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 ${
            compact ? "h-10 text-sm" : "h-12"
          }`}
        />
        <svg
          aria-hidden="true"
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
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-zinc-700/70 bg-[#101018] py-1 shadow-2xl shadow-black/50"
        >
          {rows.map((r, i) => (
            <li key={r.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r.href)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm ${
                  i === active ? "bg-violet-500/15 text-zinc-100" : "text-zinc-300"
                } ${r.key === "all" ? "font-medium text-violet-300" : ""}`}
              >
                <span className="line-clamp-1">{r.label}</span>
                {r.hint && <span className="shrink-0 text-xs text-zinc-500">{r.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
      aria-label={all}
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams(Array.from(sp.entries()));
        if (e.target.value) params.set(name, e.target.value);
        else params.delete(name);
        params.delete("page");
        router.push(`/workflows?${params.toString()}`);
      }}
      className="h-10 rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 text-sm text-zinc-200 outline-none focus-visible:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
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
    platformsTop: Option[];
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
        name="platform"
        value={current.platform ?? ""}
        options={taxonomy.platformsTop}
        all="All integrations"
      />
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

export function PageJump({
  basePath,
  page,
  pages,
}: {
  basePath: string;
  page: number;
  pages: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [val, setVal] = useState(String(page));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = Math.min(Math.max(1, Math.round(Number(val)) || 1), pages);
        const params = new URLSearchParams(Array.from(sp.entries()));
        params.set("page", String(n));
        router.push(`${basePath}?${params.toString()}`);
      }}
      className="flex items-center gap-2 text-zinc-500"
    >
      <label htmlFor="page-jump">Go to page</label>
      <input
        id="page-jump"
        type="number"
        min={1}
        max={pages}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="h-9 w-20 rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-2 text-center text-zinc-100 outline-none focus:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
      />
      <button
        type="submit"
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
      >
        Go
      </button>
    </form>
  );
}
