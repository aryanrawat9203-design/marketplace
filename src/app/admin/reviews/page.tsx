import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { verifyAdminSession, ADMIN_COOKIE } from "@/lib/admin-auth";
import ReviewModerationClient from "./ReviewModerationClient";

export const metadata: Metadata = { title: "Review moderation", robots: { index: false } };

export default async function AdminReviewsPage() {
  const jar = await cookies();
  if (!verifyAdminSession(jar.get(ADMIN_COOKIE)?.value)) {
    redirect("/admin/login?next=/admin/reviews");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <ReviewModerationClient />
    </div>
  );
}
