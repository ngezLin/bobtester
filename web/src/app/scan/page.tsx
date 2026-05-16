"use client";

import { useRouter } from "next/navigation";

export default function ScanLandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-3xl p-10 shadow-xl shadow-black/20">
        <h1 className="text-4xl font-bold mb-4">Security Scan</h1>
        <p className="text-gray-400 mb-8">
          Create a new scan and choose the checks you want to run against your target.
        </p>

        <button
          type="button"
          onClick={() => router.push("/scan/create")}
          className="inline-flex items-center justify-center w-full rounded-2xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500"
        >
          Create Scan
        </button>
      </div>
    </main>
  );
}
