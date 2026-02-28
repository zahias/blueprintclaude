"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LookupPage() {
  const [token, setToken] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (token.trim()) {
      router.push(`/blueprint/${token.trim()}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Open Existing Blueprint</h1>
        <p className="text-gray-500 mb-6">Enter the access token you received when you saved your blueprint.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none mb-4"
            placeholder="Paste your access token here"
            required
          />
          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            Open Blueprint
          </button>
        </form>

        <a href="/" className="inline-block mt-4 text-sm text-gray-500 hover:text-gray-700">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
