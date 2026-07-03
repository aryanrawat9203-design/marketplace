"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function AuthStatus() {
  const { user, loading, openLogin, signOut } = useAuth();

  if (loading) return <div className="h-9 w-20" />;

  if (!user) {
    return (
      <button
        onClick={() => openLogin()}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
      >
        Log in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-300">
      <Link
        href="/account"
        className="hidden rounded-lg px-2 py-1.5 text-violet-300 hover:bg-zinc-800 hover:text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 sm:inline"
      >
        My library
      </Link>
      <span className="hidden max-w-[10rem] truncate lg:inline">{user.email}</span>
      <button
        onClick={() => signOut()}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
      >
        Sign out
      </button>
    </div>
  );
}
