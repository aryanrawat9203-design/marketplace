import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { verifyAdminSession, ADMIN_COOKIE } from "@/lib/admin-auth";
import ScreenshotUploadClient from "./ScreenshotUploadClient";

export const metadata: Metadata = { title: "Template screenshots", robots: { index: false } };

export default async function AdminScreenshotsPage() {
  const jar = await cookies();
  if (!verifyAdminSession(jar.get(ADMIN_COOKIE)?.value)) {
    redirect("/admin/login?next=/admin/screenshots");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <ScreenshotUploadClient />
    </div>
  );
}
