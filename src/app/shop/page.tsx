import Link from "next/link";
import type { Metadata } from "next";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = { title: "Shop — Premium workflows" };

export default function ShopPage() {
  const products = getProducts();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-zinc-50">Premium workflows</h1>
        <p className="mt-2 text-zinc-400">
          Original, ready-to-use n8n workflows you can buy and download instantly — built and owned
          by FlowDex.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/shop/${p.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 card-hover hover:border-violet-500/50"
          >
            <div className={`h-28 bg-gradient-to-br ${p.gradient}`} />
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-zinc-500">{p.category}</span>
                <span className="text-sm font-semibold text-zinc-100">
                  {p.free ? "Free" : `₹${p.price}`}
                </span>
              </div>
              <h3 className="mt-2 font-semibold text-zinc-100 group-hover:text-white">{p.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{p.tagline}</p>
              <span className="mt-4 text-sm text-violet-400">View →</span>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-10 rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-4 text-xs text-zinc-500">
        These are your own products. To add one, drop your workflow file into the project&apos;s{" "}
        <code className="text-zinc-300">product-files</code> folder and add an entry to{" "}
        <code className="text-zinc-300">src/data/products.json</code>. (I can do this for you anytime.)
      </p>
    </div>
  );
}
