"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "@/components/common/Sidebar";
import { scanService } from "@/api/scans";
import { getOwaspInfo } from "@/lib/owasp-mapping";

type ScanFinding = {
  title: string;
  description: string;
  severity: string;
  category: string;
  remediation?: string;
  evidence?: Record<string, unknown>;
};

type ScanReport = {
  summary: string;
  counts: {
    total: number;
    high: number;
  };
};

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
  report: ScanReport | null;
  findings: ScanFinding[];
};

const HISTORY_KEY = "bobtester_scan_history";

function loadScanHistory(): ScanHistoryItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ScanHistoryItem[];
  } catch {
    return [];
  }
}

function saveScanHistory(history: ScanHistoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function formatElapsedTime(timestamp: string) {
  const value = new Date(timestamp).getTime();
  if (Number.isNaN(value)) return "unknown";
  const diff = Date.now() - value;
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function isScanNotFoundError(error: unknown) {
  return typeof error === "object" && error !== null &&
    "message" in error &&
    (error as { message: string }).message === "Scan not found";
}

function getSeverityStyles(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical") {
    return "bg-red-600/15 text-red-200 border border-red-500/30";
  }
  if (normalized === "high") {
    return "bg-orange-600/15 text-orange-200 border border-orange-500/30";
  }
  if (normalized === "medium") {
    return "bg-amber-600/15 text-amber-200 border border-amber-500/30";
  }
  if (normalized === "low") {
    return "bg-emerald-600/15 text-emerald-200 border border-emerald-500/30";
  }
  return "bg-slate-600/15 text-slate-200 border border-slate-500/30";
}

export default function ScanDetailPage() {
  const params = useParams();
  const scanId = params?.id as string;
  const [scan, setScan] = useState<ScanHistoryItem | null>(null);
  const [terminating, setTerminating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const terminateScan = async () => {
    if (!scan) return;
    setMessage(null);
    setTerminating(true);

    try {
      const response = await scanService.terminateScan(scan.id);
      if (!response.success) {
        setMessage({ text: response.message || "Unable to terminate scan.", type: "error" });
        return;
      }

      const updatedScan = {
        ...scan,
        status: response.status,
        error: response.error,
        updatedAt: response.updatedAt,
      };
      setScan(updatedScan);

      const history = loadScanHistory().map((item) =>
        item.id === scan.id ? updatedScan : item,
      );
      saveScanHistory(history);
      setMessage({ text: "Scan terminated successfully.", type: "success" });
    } catch (error: any) {
      if (isScanNotFoundError(error)) {
        const updatedScan = {
          ...scan,
          status: "Failed",
          error: "Scan not found on the server.",
          updatedAt: new Date().toISOString(),
        };
        setScan(updatedScan);
        const history = loadScanHistory().map((item) =>
          item.id === scan.id ? updatedScan : item,
        );
        saveScanHistory(history);
        setMessage({ text: "Scan not found on the server and has been marked failed.", type: "error" });
      } else {
        setMessage({ text: error?.message ?? "Unable to terminate scan.", type: "error" });
      }
    } finally {
      setTerminating(false);
    }
  };

  const removeScan = () => {
    if (!scan) return;
    const updatedHistory = loadScanHistory().filter((item) => item.id !== scan.id);
    saveScanHistory(updatedHistory);
    setMessage({ text: "Scan history entry removed.", type: "success" });
    setScan(null);
  };

  useEffect(() => {
    if (!scanId) return;
    const history = loadScanHistory();
    const found = history.find((item) => item.id === scanId) ?? null;
    setScan(found);
  }, [scanId]);

  useEffect(() => {
    if (!scan || scan.status !== "Running") return;

    const refreshScanStatus = async () => {
      try {
        const response = await scanService.getScanById(scan.id);
        if (!response.success) return;

        if (
          response.status !== scan.status ||
          JSON.stringify(response.report) !== JSON.stringify(scan.report) ||
          JSON.stringify(response.findings) !== JSON.stringify(scan.findings) ||
          response.error !== scan.error ||
          response.updatedAt !== scan.updatedAt
        ) {
          const updatedScan = {
            ...scan,
            status: response.status,
            report: response.report,
            findings: response.findings,
            error: response.error,
            updatedAt: response.updatedAt,
            startedAt: scan.startedAt ?? response.createdAt,
          };
          setScan(updatedScan);

          const history = loadScanHistory().map((item) =>
            item.id === scan.id ? updatedScan : item,
          );
          saveScanHistory(history);
        }
      } catch (error: any) {
        if (isScanNotFoundError(error) && scan) {
          const updatedScan = {
            ...scan,
            status: "Failed",
            error: "Scan not found on the server.",
            updatedAt: new Date().toISOString(),
          };
          setScan(updatedScan);
          const history = loadScanHistory().map((item) =>
            item.id === scan.id ? updatedScan : item,
          );
          saveScanHistory(history);
          setMessage({ text: "Scan not found on the server and has been marked failed.", type: "error" });
        }
      }
    };

    refreshScanStatus();
    const interval = window.setInterval(refreshScanStatus, 3000);
    return () => window.clearInterval(interval);
  }, [scan]);

  const relevantOwasp = useMemo(() => {
    if (!scan?.findings?.length) return [];
    const seen = new Set<string>();
    return scan.findings
      .map((finding) => getOwaspInfo(finding.category))
      .filter((info): info is NonNullable<typeof info> => {
        if (!info || seen.has(info.id)) return false;
        seen.add(info.id);
        return true;
      });
  }, [scan]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-950 text-white">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Scan Details</h1>
              <p className="text-gray-400 mt-2">Review the result, the OWASP 2025 guidance, and prevention recommendations.</p>
              {message ? (
                <p className={`mt-3 text-sm ${message.type === "success" ? "text-emerald-300" : "text-red-300"}`}>
                  {message.text}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {scan?.status === "Running" ? (
                <button
                  type="button"
                  disabled={terminating}
                  onClick={terminateScan}
                  className="rounded-2xl border border-red-500 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {terminating ? "Terminating..." : "Terminate scan"}
                </button>
              ) : null}
              {scan ? (
                <button
                  type="button"
                  onClick={removeScan}
                  className="rounded-2xl border border-slate-700 bg-slate-800/80 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  Remove from history
                </button>
              ) : null}
              <Link
                href="/scan"
                className="rounded-2xl border border-gray-700 bg-gray-900 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
              >
                Back to scans
              </Link>
            </div>
          </div>
          {!scan ? (
            <div className="rounded-3xl border border-gray-800 bg-gray-900 p-10 text-center text-gray-300">
              <p className="text-lg font-semibold text-white">Scan not found</p>
              <p className="mt-3 text-gray-400">This scan may have been removed or the identifier is invalid.</p>
            </div>
          ) : (
            <div className="grid gap-8">
              <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-blue-400">{scan.status}</p>
                    <h2 className="text-2xl font-semibold text-white">{scan.name}</h2>
                    <p className="mt-2 text-gray-400">{scan.url}</p>
                    {scan.status === "Running" && scan.startedAt ? (
                      <p className="mt-2 text-sm text-yellow-300">
                        Running for {formatElapsedTime(scan.startedAt)}. If this scan stays running for more than 10 minutes it may have timed out.
                      </p>
                    ) : null}
                    {scan.status === "Failed" && scan.error ? (
                      <p className="mt-2 text-sm text-red-300">Error: {scan.error}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 text-right">
                    <p className="text-sm text-gray-500">Created: {scan.date}</p>
                    {scan.updatedAt ? <p className="text-sm text-gray-500">Last updated: {new Date(scan.updatedAt).toLocaleString()}</p> : null}
                    <p className="text-sm text-gray-500">Checks: {scan.checks.join(", ")}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
                <div className="space-y-6">
                  <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
                    <h3 className="text-xl font-semibold text-white">Scan summary</h3>
                    {scan.report ? (
                      <>
                        <p className="mt-3 text-gray-400">{scan.report.summary}</p>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
                            <p className="text-sm text-gray-400">Total findings</p>
                            <p className="mt-2 text-3xl font-semibold text-white">{scan.report.counts.total}</p>
                          </div>
                          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
                            <p className="text-sm text-gray-400">High severity</p>
                            <p className="mt-2 text-3xl font-semibold text-white">{scan.report.counts.high}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-gray-400">Results are not available yet. Return to the scan list to check when the scan completes.</p>
                    )}
                  </div>

                  <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">Findings</h3>
                        <p className="text-gray-400 mt-1">Detailed vulnerabilities from the scan.</p>
                      </div>
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-200">
                        {scan.findings.length} findings
                      </span>
                    </div>

                    {scan.findings.length === 0 ? (
                      <div className="mt-6 rounded-3xl border border-dashed border-gray-700 bg-gray-950 p-8 text-center text-gray-400">
                        {scan.status === "Running" ? (
                          <p>Scan results are still being generated. Check back after completion.</p>
                        ) : (
                          <p>No vulnerabilities were captured for this scan.</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-6 space-y-4">
                        {scan.findings.map((finding, index) => {
                          const owaspInfo = getOwaspInfo(finding.category);

                          return (
                            <div key={`${finding.title}-${index}`} className="rounded-3xl border border-gray-800 bg-gray-950 p-6">
                              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="text-lg font-semibold text-white">{finding.title}</p>
                                  <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.15em] ${getSeverityStyles(finding.severity)}`}>
                                    {finding.severity}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-gray-200">{owaspInfo?.id ?? "A06:2025"}</p>
                                  <p className="text-sm text-gray-400">{owaspInfo?.title ?? "OWASP guidance"}</p>
                                </div>
                              </div>
                              <p className="mt-4 text-gray-300">{finding.description}</p>
                              <div className="mt-4 flex items-center justify-between gap-3">
                                {owaspInfo ? (
                                  <Link
                                    href={owaspInfo.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-600/20"
                                  >
                                    OWASP {owaspInfo.id}
                                  </Link>
                                ) : null}
                              </div>
                              {finding.evidence && (
                                <div className="mt-4 rounded-2xl bg-gray-900 p-4 text-sm text-gray-300">
                                  <p className="font-semibold">Evidence</p>
                                  <pre className="mt-2 overflow-x-auto text-xs text-gray-200">{JSON.stringify(finding.evidence, null, 2)}</pre>
                                </div>
                              )}
                              {finding.remediation && (
                                <div className="mt-4 rounded-2xl bg-gray-900 p-4 text-sm text-gray-300">
                                  <p className="font-semibold">Remediation</p>
                                  <p className="mt-2">{finding.remediation}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
                    <h3 className="text-xl font-semibold text-white">OWASP 2025 Guidance</h3>
                    <p className="mt-3 text-gray-400">Relevant OWASP risks are shown below based on scan findings. Each finding includes the matching OWASP risk link when available.</p>
                    <div className="mt-6 space-y-4">
                      {relevantOwasp.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-gray-700 bg-gray-950 p-6 text-gray-400">
                          <p>No specific OWASP risk mappings are available yet. Review the findings and apply secure design best practices.</p>
                        </div>
                      ) : (
                        relevantOwasp.map((item) => (
                          <div key={item.id} className="rounded-3xl border border-gray-800 bg-gray-950 p-5">
                            <div>
                              <p className="text-sm uppercase tracking-[0.24em] text-blue-400">{item.id}</p>
                              <p className="mt-2 text-lg font-semibold text-white">{item.title}</p>
                            </div>
                            <p className="mt-4 text-gray-300">{item.description}</p>
                            <div className="mt-3 text-gray-400">
                              <p className="font-semibold">Prevention:</p>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-400">
                                {item.prevention.map((tip, index) => (
                                  <li key={index}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
