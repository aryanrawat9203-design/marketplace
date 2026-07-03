"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(next);
        router.refresh();
        return;
      }
      setError(
        res.status === 429
          ? "Too many attempts - please wait a few minutes and try again."
          : res.status === 503
            ? "Admin access isn't configured yet (ADMIN_PASSWORD is not set)."
            : "Incorrect password."
      );
    } catch {
      setError("Network error - please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="admin-password" className="text-sm font-medium text-zinc-200">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus-visible:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
        />
      </div>
      {error && <p className="text-sm text-amber-300">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3 font-medium text-white hover:opacity-95 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
