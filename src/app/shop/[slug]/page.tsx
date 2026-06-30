import { redirect } from "next/navigation";
import { getBundle } from "@/lib/bundles";

// Old per-product shop routes now live under /bundles.
export default async function ShopProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = getBundle(slug);
  redirect(b ? `/bundles/${slug}` : "/bundles");
}
