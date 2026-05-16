"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/common/Sidebar";

type ScanHistoryItem = {
  id: string;
  name: string;
  url: string;
  status: string;
  checks: string[];
  date: string;
};

const HISTORY_KEY = "bobtester_scan_history";

function loadScanHistory(): ScanHistoryItem[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as ScanHistoryItem[];
  } catch {
    return [];
  }
}

export default function ScanLandingPage() {
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);

  useEffect(() => {
    setScanHistory(loadScanHistory());

    const interval = window.setInterval(() => {
      setScanHistory(loadScanHistory());
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const runningScans = scanHistory.filter((scan) => scan.status === "Running");

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />

      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Scans</h1>
              <p className="text-gray-400 mt-2">Monitor your scan history and launch new security checks.</p>
            </div>
            <Link
              href="/scan/create"
              className="self-start rounded-2xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500"
            >
              + Create Scan
            </Link>
          </div>

          {runningScans.length > 0 && (
            <section className="mb-8 rounded-3xl border border-yellow-500/30 bg-yellow-500/5 p-8 shadow-lg shadow-yellow-500/10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-yellow-200">Currently Running</h2>
                  <p className="text-gray-300 mt-1">One or more scans are running in the background.</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-yellow-600/15 px-4 py-2 text-sm text-yellow-200">
                  {runningScans.length} active scan{runningScans.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-6 grid gap-4">
                {runningScans.map((scan) => (
                  <div key={scan.id} className="rounded-3xl border border-yellow-500/30 bg-gray-900 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-lg font-semibold text-white truncate">{scan.name}</p>
                          <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-sm text-yellow-200">Running</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-400 truncate">{scan.url}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <p className="text-sm text-gray-500">{scan.date}</p>
                        <button
                          type="button"
                          className="rounded-full bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-600/20"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {scan.checks.map((check) => (
                        <span
                          key={check}
                          className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs uppercase tracking-[0.15em] text-gray-300"
                        >
                          {check}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-lg shadow-black/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Scan History</h2>
                <p className="text-gray-400 mt-1">Recent scan runs will appear here for review.</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                <span className="rounded-full border border-gray-700 bg-gray-950 px-3 py-2">Total scans: {scanHistory.length}</span>
              </div>
            </div>

            {scanHistory.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-700 bg-gray-950 p-10 text-center text-gray-400">
                <p className="text-lg font-medium text-white">No scan history yet</p>
                <p className="mt-2">Click Create Scan to run your first target check.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {scanHistory.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-gray-800 bg-gray-950 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-lg font-semibold text-white truncate">{item.name}</p>
                          <span className={`inline-flex rounded-full px-3 py-1 text-sm ${
                            item.status === "Completed"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : item.status === "Failed"
                              ? "bg-red-500/15 text-red-300"
                              : "bg-yellow-500/15 text-yellow-200"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-400 truncate">{item.url}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <p className="text-sm text-gray-500">{item.date}</p>
                        <button
                          type="button"
                          className="rounded-full bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-600/20"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.checks.map((check) => (
                        <span
                          key={check}
                          className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs uppercase tracking-[0.15em] text-gray-300"
                        >
                          {check}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
