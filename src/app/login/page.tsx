"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TRIAL_ACCOUNTS = [
  {
    role: "Admin",
    email: "admin@blueprint.edu",
    password: "admin123",
    note: "Institution setup, users, reviews, analytics",
  },
  {
    role: "Coordinator",
    email: "coordinator@blueprint.edu",
    password: "coord123",
    note: "Course setup, bulk upload, blueprint review",
  },
  {
    role: "Instructor",
    email: "instructor@blueprint.edu",
    password: "instructor123",
    note: "Create and submit assessment blueprints",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push(data.redirectTo || "/");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
          <p className="text-gray-500 text-sm mt-1">Use one account for instructor, coordinator, or admin access.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="name@university.edu"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Temporary Trial Logins</p>
              <p className="text-xs text-amber-700">Visible for testing only. Remove before launch.</p>
            </div>
          </div>
          <div className="space-y-2">
            {TRIAL_ACCOUNTS.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  setError("");
                }}
                className="w-full text-left bg-white border border-amber-200 rounded-lg px-3 py-2 hover:border-amber-300 hover:bg-amber-50/50 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{account.role}</p>
                    <p className="text-xs text-gray-500">{account.note}</p>
                  </div>
                  <span className="text-[11px] text-indigo-600 font-medium shrink-0">Use</span>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  <code className="bg-gray-100 text-gray-700 rounded px-2 py-1 overflow-hidden text-ellipsis">
                    {account.email}
                  </code>
                  <code className="bg-gray-100 text-gray-700 rounded px-2 py-1">
                    {account.password}
                  </code>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 mt-4 space-y-2">
          <p>
            New instructor?{" "}
            <Link href="/instructor/register" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Create an account
            </Link>
          </p>
          <p>
            <Link href="/" className="text-gray-400 hover:text-gray-600">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
