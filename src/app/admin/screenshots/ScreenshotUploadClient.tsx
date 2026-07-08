"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = { route: string; title: string; category: string | null };
type Screenshots = {
  overview?: string;
  nodeDetail?: string;
  capabilities?: string;
  cardThumb?: string;
};

const SLOTS: { key: keyof Screenshots; label: string; hint: string }[] = [
  { key: "overview", label: "Overview", hint: "Full workflow canvas + description panel" },
  { key: "nodeDetail", label: "Node detail", hint: "Zoomed key-logic node" },
  { key: "capabilities", label: "Capabilities strip", hint: "Error-handling / data-quality / customize-me cards" },
  { key: "cardThumb", label: "Card thumbnail", hint: "Compact thumbnail for listing cards, OG image, and JSON-LD" },
];

export default function ScreenshotUploadClient() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshots>({});
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      const res = await fetch(`/api/admin/screenshots?q=${encodeURIComponent(query)}`);
      if (res.status === 401) {
        router.push("/admin/login?next=/admin/screenshots");
        return;
      }
      const data = (await res.json()) as { results: SearchResult[] };
      setResults(data.results ?? []);
    },
    [router]
  );

  useEffect(() => {
    const t = setTimeout(() => search(q), 250);
    return () => clearTimeout(t);
  }, [q, search]);

  async function select(r: SearchResult) {
    setSelected(r);
    setResults([]);
    setQ("");
    setError(null);
    const res = await fetch(`/api/admin/screenshots?route=${encodeURIComponent(r.route)}`);
    if (res.status === 401) {
      router.push("/admin/login?next=/admin/screenshots");
      return;
    }
    const data = (await res.json()) as { screenshots: Screenshots };
    setScreenshots(data.screenshots ?? {});
  }

  async function upload(slot: keyof Screenshots, file: File) {
    if (!selected) return;
    setBusySlot(slot);
    setError(null);
    try {
      const form = new FormData();
      form.set("route", selected.route);
      form.set("slot", slot);
      form.set("file", file);
      const res = await fetch("/api/admin/screenshots", { method: "POST", body: form });
      if (res.status === 401) {
        router.push("/admin/login?next=/admin/screenshots");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(`Upload failed: ${data.error ?? res.status}`);
        return;
      }
      setScreenshots((prev) => ({ ...prev, [slot]: data.url }));
    } catch {
      setError("Network error - please try again.");
    } finally {
      setBusySlot(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">Template screenshots</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Search a template, then attach up to four named screenshots. Fields are independent - upload
        just the ones you have.
      </p>
      <a href="/admin/reviews" className="mt-1 inline-block text-xs text-violet-400 hover:text-violet-300">
        &larr; Review moderation
      </a>

      <div className="relative mt-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by template title or route..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
            {results.map((r) => (
              <li key={r.route}>
                <button
                  onClick={() => select(r)}
                  className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-zinc-800"
                >
                  <span className="text-sm text-zinc-100">{r.title}</span>
                  <span className="text-xs text-zinc-500">
                    {r.route}
                    {r.category ? ` · ${r.category}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-amber-300">{error}</p>}

      {selected && (
        <div className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-100">{selected.title}</div>
              <a
                href={`/workflows/${selected.route}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                {selected.route} &#8599;
              </a>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Done
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {SLOTS.map((slot) => {
              const url = screenshots[slot.key];
              const busy = busySlot === slot.key;
              return (
                <div key={slot.key} className="rounded-xl border border-zinc-800/80 p-3">
                  <div className="text-sm font-medium text-zinc-200">{slot.label}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">{slot.hint}</div>
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="mt-2 aspect-video w-full rounded-lg object-cover" />
                  )}
                  <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-violet-500 hover:text-violet-300">
                    {busy ? "Uploading..." : url ? "Replace image" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) upload(slot.key, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
