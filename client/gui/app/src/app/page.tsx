"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/cases");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans">
      {/* Navigation */}
      <nav className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center border-b border-zinc-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-sm shadow-red-500/20">
            B
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900">BobTester</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-xs shadow-red-500/20 active:scale-95"
          >
            Create Account
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-20 text-center space-y-6">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 leading-[1.1]">
          Record browser flows. <br />
          <span className="text-red-600">Run them with real datasets.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-500 leading-relaxed">
          Capture flows in Chrome DevTools, parameterize variables in an editable spreadsheet grid, and run regression and security tests with Playwright.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-red-500/20 active:scale-95"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl font-bold text-sm transition-all shadow-xs"
          >
            Sign In to Dashboard
          </Link>
        </div>
      </div>

      {/* Capabilities Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-6">
        <div className="p-7 bg-white border border-zinc-200/90 rounded-3xl shadow-xs space-y-3">
          <div className="w-11 h-11 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-xl text-red-600">
            🛠️
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Chrome Recorder & Playwright</h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Record directly in Chrome DevTools. Paste the exported JSON or Playwright script, and variables are auto-detected.
          </p>
        </div>

        <div className="p-7 bg-white border border-zinc-200/90 rounded-3xl shadow-xs space-y-3">
          <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-xl text-emerald-600">
            📊
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Spreadsheet Dataset Grid</h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Manage test values in an inline Excel-style table. Switch active rows, test positive and negative paths, and save batches in one click.
          </p>
        </div>

        <div className="p-7 bg-white border border-zinc-200/90 rounded-3xl shadow-xs space-y-3">
          <div className="w-11 h-11 bg-zinc-100 border border-zinc-200/80 rounded-2xl flex items-center justify-center text-xl text-zinc-700">
            🛡️
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Security & DAST Checks</h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Run automated SQL injection, XSS, and security header scans alongside test runs, complete with screenshots and logs.
          </p>
        </div>
      </div>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-zinc-200 text-center text-xs text-zinc-400">
        © 2026 BobTester. Built for the IBM Bob Hackathon.
      </footer>
    </main>
  );
}
