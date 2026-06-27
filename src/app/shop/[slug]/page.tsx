import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct } from "@/lib/products";
import BuyButton from "@/components/BuyButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  return p ? { title: p.name, description: p.tagline } : { title: "Product not found" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/shop" className="hover:text-zinc-300">Shop</Link>
      </nav>

      <div className={`mt-4 h-40 rounded-2xl bg-gradient-to-br ${p.gradient}`} />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wide text-zinc-500">{p.category}</span>
          <h1 className="mt-1 text-3xl font-bold text-zinc-50">{p.name}</h1>
          <p className="mt-2 max-w-xl text-zinc-400">{p.tagline}</p>
        </div>
        <div className="text-2xl font-bold text-zinc-100">{p.free ? "Free" : `₹${p.price}`}</div>
      </div>

      <div className="mt-6">
        <BuyButton
          product={{ slug: p.slug, name: p.name, price: p.price, currency: p.currency, free: p.free }}
        />
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-zinc-100">About this workflow</h2>
          <p className="mt-3 leading-relaxed text-zinc-300">{p.description}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-zinc-200">What&apos;s included</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {p.features.map((f, i) => (
              <li key={i} className="flex gap-2 text-zinc-300">
                <span className="mt-0.5 text-emerald-400">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
