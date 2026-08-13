"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function AuthStatus() {
  const { user, loading, openLogin, signOut } = useAuth();

  if (loading) return <div className="h-9 w-20" />;

  if (!user) {
    return (
      <button onClick={() => openLogin()} className="btn-secondary btn-sm">
        Log in
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 text-sm text-body">
      <Link
        href="/account"
        className="hidden whitespace-nowrap rounded-lg px-2 py-1.5 text-violet-300 hover:bg-white/[0.06] hover:text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 sm:inline"
      >
        My library
      </Link>
      <span className="hidden max-w-[12rem] truncate xl:inline">{user.email}</span>
      <button onClick={() => signOut()} className="btn-secondary btn-sm whitespace-nowrap">
        Sign out
      </button>
    </div>
  );
}
