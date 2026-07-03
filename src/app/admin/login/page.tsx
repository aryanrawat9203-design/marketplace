import type { Metadata } from "next";
import AdminLoginForm from "./AdminLoginForm";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm items-center px-4 sm:px-6">
      <div className="w-full">
        <h1 className="text-xl font-semibold text-zinc-100">Admin sign in</h1>
        <p className="mt-1 text-sm text-zinc-500">Store owner access only.</p>
        <div className="mt-6">
          <AdminLoginForm next={next && next.startsWith("/admin") ? next : "/admin/reviews"} />
        </div>
      </div>
    </div>
  );
}
