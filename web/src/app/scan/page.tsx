"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/common/Sidebar";
import { scanService } from "@/api/scans";

type ScanHistoryItem = {
  id: string;
  name: string;
  url: string;
  status: string;
  checks: string[];
  date: string;
  startedAt?: string;
  updatedAt?: string;
  error?: string;
  report?: {
    summary: string;
    counts: {
      total: number;
      high: number;
    };
  } | null;
  findings?: unknown[];
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

function saveScanHistory(history: ScanHistoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function formatElapsedTime(startedAt: string) {
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return "unknown time";
  const diff = Date.now() - start;
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function isScanNotFoundError(error: unknown) {
  return typeof error === "object" && error !== null &&
    "message" in error &&
    (error as { message: string }).message === "Scan not found";
}

export default function ScanLandingPage() {
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [terminatingScanId, setTerminatingScanId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const terminateScan = async (scanId: string) => {
    setMessage(null);
    setTerminatingScanId(scanId);

    try {
      const response = await scanService.terminateScan(scanId);

      const updatedHistory = loadScanHistory().map((item) =>
        item.id === scanId
          ? {
              ...item,
              status: response.success ? response.status : item.status,
              error: response.success ? response.error : item.error,
              updatedAt: response.updatedAt ?? item.updatedAt,
            }
          : item,
      );

      if (!response.success) {
        if (response.message === "Scan not found") {
          setMessage({ text: "Scan was not found on the server and has been marked as failed.", type: "error" });
        } else {
          setMessage({ text: response.message || "Unable to terminate scan.", type: "error" });
        }
      } else {
        setMessage({ text: "Scan terminated successfully.", type: "success" });
      }

      saveScanHistory(updatedHistory);
      setScanHistory(updatedHistory);
    } catch (error: any) {
      if (isScanNotFoundError(error)) {
        const updatedHistory = loadScanHistory().map((item) =>
          item.id === scanId
            ? {
                ...item,
                status: "Failed",
                error: "Scan not found on the server.",
                updatedAt: new Date().toISOString(),
              }
            : item,
        );
        saveScanHistory(updatedHistory);
        setScanHistory(updatedHistory);
        setMessage({ text: "Scan not found on the server. Marked as failed.", type: "error" });
      } else {
        setMessage({ text: error?.message ?? "Unable to terminate scan.", type: "error" });
      }
    } finally {
      setTerminatingScanId(null);
    }
  };

  const removeScan = (scanId: string) => {
    const updatedHistory = loadScanHistory().filter((item) => item.id !== scanId);
    saveScanHistory(updatedHistory);
    setScanHistory(updatedHistory);
    setMessage({ text: "Scan history entry removed.", type: "success" });
  };

  useEffect(() => {
    setScanHistory(loadScanHistory());

    const refreshRunningScans = async () => {
      const currentHistory = loadScanHistory();
      let updated = false;

      const updatedHistory = await Promise.all(
        currentHistory.map(async (item) => {
          if (item.status !== "Running") {
            return item;
          }

          try {
            const response = await scanService.getScanById(item.id);
            if (!response.success) {
              return item;
            }

            if (
              response.status !== item.status ||
              JSON.stringify(response.report) !== JSON.stringify(item.report) ||
              JSON.stringify(response.findings) !== JSON.stringify(item.findings) ||
              response.error !== item.error ||
              response.updatedAt !== item.updatedAt
            ) {
              updated = true;
              return {
                ...item,
                status: response.status,
                report: response.report,
                findings: response.findings,
                error: response.error,
                updatedAt: response.updatedAt,
                startedAt: item.startedAt ?? response.createdAt,
              };
            }
          } catch (error: any) {
            if (isScanNotFoundError(error)) {
              updated = true;
              return {
                ...item,
                status: "Failed",
                error: "Scan not found on the server.",
                updatedAt: new Date().toISOString(),
              };
            }
            return item;
          }

          return item;
        }),
      );

      if (updated) {
        saveScanHistory(updatedHistory);
        setScanHistory(updatedHistory);
      }
    };

    refreshRunningScans();
    const interval = setInterval(refreshRunningScans, 5000);
    return () => clearInterval(interval);
  }, []);

  const runningScans = scanHistory.filter((item) => item.status === "Running");

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white">Security Scans</h1>
              <p className="mt-2 text-gray-400">Run automated security checks on your web applications</p>
              {message ? (
                <p className={`mt-3 text-sm ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                  {message.text}
                </p>
              ) : null}
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
                        <Link
                          href={`/scan/${scan.id}`}
                          className="rounded-full bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-600/20"
                        >
                          View details
                        </Link>
                        <button
                          type="button"
                          disabled={terminatingScanId === scan.id}
                          onClick={() => terminateScan(scan.id)}
                          className="rounded-full border border-red-500 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {terminatingScanId === scan.id ? "Terminating..." : "Terminate"}
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
                        <Link
                          href={`/scan/${item.id}`}
                          className="rounded-full bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-600/20"
                        >
                          View details
                        </Link>
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
                    {item.status === "Running" && item.startedAt ? (
                      <p className="mt-3 text-sm text-yellow-300">
                        Started {formatElapsedTime(item.startedAt)} ago. This may take several minutes depending on target response time.
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      {item.status === "Running" ? (
                        <button
                          type="button"
                          disabled={terminatingScanId === item.id}
                          onClick={() => terminateScan(item.id)}
                          className="rounded-full border border-red-500 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {terminatingScanId === item.id ? "Terminating..." : "Terminate scan"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeScan(item.id)}
                        className="rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                      >
                        Remove
                      </button>
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
