import { redirect } from "next/navigation";

// The shop has moved to /bundles (single templates live under /workflows).
export default function ShopPage() {
  redirect("/bundles");
}
