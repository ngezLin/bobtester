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
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    (error as { message: string }).message === "Scan not found"
  );
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
          : item
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
            : item
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
        })
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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-200">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900">
                Security Scans
              </h1>
              {message && (
                <p
                  className={`mt-3 text-xs font-semibold p-3 rounded-xl border ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {message.text}
                </p>
              )}
            </div>
            <Link
              href="/scan/create"
              className="self-start sm:self-auto inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-500/20 transition-all active:scale-95"
            >
              <span>+</span>
              <span>Create Scan</span>
            </Link>
          </div>

          {runningScans.length > 0 && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <h2 className="text-xl font-bold text-amber-950">Currently Running</h2>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-3.5 py-1 text-xs font-bold text-amber-800">
                  {runningScans.length} active scan{runningScans.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="grid gap-4">
                {runningScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-xs"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="text-base font-bold text-zinc-900 truncate">{scan.name}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-spin" />
                            Running
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-zinc-400 font-mono truncate">{scan.url}</p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2.5">
                        <p className="text-xs text-zinc-400">{scan.date}</p>
                        <Link
                          href={`/scan/${scan.id}`}
                          className="rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition-all"
                        >
                          View Details
                        </Link>
                        <button
                          type="button"
                          disabled={terminatingScanId === scan.id}
                          onClick={() => terminateScan(scan.id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
                        >
                          {terminatingScanId === scan.id ? "Terminating..." : "Terminate"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {scan.checks.map((check) => (
                        <span
                          key={check}
                          className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider text-zinc-600"
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

          <section className="rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Scan History</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-zinc-500">
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">
                  Total scans: {scanHistory.length}
                </span>
              </div>
            </div>

            {scanHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center text-zinc-400">
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 border border-red-100">
                  🛡️
                </div>
                <p className="text-base font-bold text-zinc-900">No scan history yet</p>
                <p className="text-xs text-zinc-500 mt-1">Click Create Scan to run your first target security check.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {scanHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200/80 bg-zinc-50/30 p-5 hover:border-red-300 hover:bg-white transition-all shadow-2xs"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="text-base font-bold text-zinc-900 truncate">{item.name}</p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                              item.status === "Completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : item.status === "Failed"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.status === "Completed"
                                  ? "bg-emerald-600"
                                  : item.status === "Failed"
                                  ? "bg-red-600"
                                  : "bg-amber-600"
                              }`}
                            />
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-zinc-400 font-mono truncate">{item.url}</p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2.5">
                        <p className="text-xs text-zinc-400">{item.date}</p>
                        <Link
                          href={`/scan/${item.id}`}
                          className="rounded-xl bg-zinc-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-zinc-200/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition-all"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {item.checks.map((check) => (
                        <span
                          key={check}
                          className="rounded-md border border-zinc-200 bg-white px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider text-zinc-600"
                        >
                          {check}
                        </span>
                      ))}
                    </div>

                    {item.status === "Running" && item.startedAt && (
                      <p className="mt-3 text-xs font-medium text-amber-700">
                        Started {formatElapsedTime(item.startedAt)} ago. This may take several minutes depending on target response time.
                      </p>
                    )}

                    <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-wrap gap-2">
                      {item.status === "Running" && (
                        <button
                          type="button"
                          disabled={terminatingScanId === item.id}
                          onClick={() => terminateScan(item.id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
                        >
                          {terminatingScanId === item.id ? "Terminating..." : "Terminate Scan"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeScan(item.id)}
                        className="rounded-xl border border-zinc-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 text-xs font-semibold text-zinc-500 transition-all"
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
