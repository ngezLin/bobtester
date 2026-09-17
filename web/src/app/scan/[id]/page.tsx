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
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    (error as { message: string }).message === "Scan not found"
  );
}

function getSeverityStyles(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical" || normalized === "high") {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  if (normalized === "medium") {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }
  if (normalized === "low") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  return "bg-zinc-100 text-zinc-600 border border-zinc-200";
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
        item.id === scan.id ? updatedScan : item
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
          item.id === scan.id ? updatedScan : item
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
            item.id === scan.id ? updatedScan : item
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
            item.id === scan.id ? updatedScan : item
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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6 border-b border-zinc-200">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Scan Details</h1>
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
            <div className="flex flex-wrap items-center gap-2.5">
              {scan?.status === "Running" && (
                <button
                  type="button"
                  disabled={terminating}
                  onClick={terminateScan}
                  className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 text-xs font-semibold text-red-600 transition-all disabled:opacity-50"
                >
                  {terminating ? "Terminating..." : "Terminate Scan"}
                </button>
              )}
              {scan && (
                <button
                  type="button"
                  onClick={removeScan}
                  className="rounded-xl border border-zinc-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-4 py-2 text-xs font-semibold text-zinc-600 transition-all shadow-xs"
                >
                  Remove from History
                </button>
              )}
              <Link
                href="/scan"
                className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700 transition-all shadow-xs"
              >
                ← Back to Scans
              </Link>
            </div>
          </div>

          {!scan ? (
            <div className="rounded-3xl border border-zinc-200/90 bg-white p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 border border-red-100">
                🔍
              </div>
              <p className="text-lg font-bold text-zinc-900">Scan not found</p>
              <p className="mt-1 text-xs text-zinc-500">This scan may have been removed or the identifier is invalid.</p>
            </div>
          ) : (
            <div className="grid gap-8">
              <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border mb-2 ${
                        scan.status === "Completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : scan.status === "Failed"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          scan.status === "Completed"
                            ? "bg-emerald-600"
                            : scan.status === "Failed"
                            ? "bg-red-600"
                            : "bg-amber-600"
                        }`}
                      />
                      {scan.status}
                    </span>
                    <h2 className="text-2xl font-bold text-zinc-900">{scan.name}</h2>
                    <p className="mt-1 text-xs text-zinc-400 font-mono">{scan.url}</p>
                    {scan.status === "Running" && scan.startedAt && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        Running for {formatElapsedTime(scan.startedAt)}. If this scan stays running for more than 10 minutes it may have timed out.
                      </p>
                    )}
                    {scan.status === "Failed" && scan.error && (
                      <p className="mt-2 text-xs font-medium text-red-600">Error: {scan.error}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs text-zinc-500 md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-zinc-100">
                    <p>Created: <span className="font-semibold text-zinc-700">{scan.date}</span></p>
                    {scan.updatedAt && (
                      <p>Last updated: <span className="font-semibold text-zinc-700">{new Date(scan.updatedAt).toLocaleString()}</span></p>
                    )}
                    <p>Checks: <span className="font-semibold text-zinc-700">{scan.checks.join(", ")}</span></p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
                <div className="space-y-6">
                  {/* Scan Summary */}
                  <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
                    <h3 className="text-lg font-bold text-zinc-900">Scan Summary</h3>
                    {scan.report ? (
                      <>
                        <p className="mt-2 text-xs text-zinc-600 leading-relaxed">{scan.report.summary}</p>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Findings</p>
                            <p className="mt-1 text-3xl font-bold text-zinc-900">{scan.report.counts.total}</p>
                          </div>
                          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
                            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">High Severity</p>
                            <p className="mt-1 text-3xl font-bold text-red-600">{scan.report.counts.high}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-400">
                        Results are not available yet. Return to the scan list to check when the scan completes.
                      </p>
                    )}
                  </div>

                  {/* Findings */}
                  <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900">Findings</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Detailed vulnerabilities from the scan.</p>
                      </div>
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                        {scan.findings.length} findings
                      </span>
                    </div>

                    {scan.findings.length === 0 ? (
                      <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center text-xs text-zinc-500">
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
                            <div
                              key={`${finding.title}-${index}`}
                              className="rounded-2xl border border-zinc-200/90 bg-zinc-50/40 p-5 hover:border-red-300 transition-all"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-base font-bold text-zinc-900">{finding.title}</p>
                                  <span
                                    className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getSeverityStyles(
                                      finding.severity
                                    )}`}
                                  >
                                    {finding.severity}
                                  </span>
                                </div>
                                <div className="sm:text-right">
                                  <p className="text-xs font-bold text-zinc-900">{owaspInfo?.id ?? "A06:2025"}</p>
                                  <p className="text-xs text-zinc-500">{owaspInfo?.title ?? "OWASP guidance"}</p>
                                </div>
                              </div>
                              <p className="mt-3 text-xs text-zinc-600 leading-relaxed">{finding.description}</p>
                              <div className="mt-3.5 flex items-center justify-between gap-3">
                                {owaspInfo && (
                                  <Link
                                    href={owaspInfo.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1 text-xs font-bold text-red-600 transition-all inline-flex items-center gap-1"
                                  >
                                    <span>OWASP {owaspInfo.id}</span>
                                    <span>↗</span>
                                  </Link>
                                )}
                              </div>
                              {finding.evidence && (
                                <div className="mt-3.5 rounded-xl bg-zinc-950 p-3.5 text-xs text-zinc-300 shadow-inner">
                                  <p className="font-semibold text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
                                    Evidence
                                  </p>
                                  <pre className="overflow-x-auto text-[11px] font-mono text-zinc-300">
                                    {JSON.stringify(finding.evidence, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {finding.remediation && (
                                <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900">
                                  <p className="font-bold text-[11px] uppercase tracking-wider text-emerald-800 mb-1">
                                    Remediation
                                  </p>
                                  <p className="leading-relaxed">{finding.remediation}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* OWASP Guidance Sidebar */}
                <div className="space-y-6">
                  <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
                    <h3 className="text-lg font-bold text-zinc-900">OWASP 2025 Guidance</h3>
                    <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                      Relevant OWASP risks are shown below based on scan findings. Each finding includes the matching OWASP risk link.
                    </p>
                    <div className="mt-5 space-y-4">
                      {relevantOwasp.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-6 text-center text-xs text-zinc-400">
                          <p>No specific OWASP risk mappings are available yet. Review the findings and apply secure design best practices.</p>
                        </div>
                      ) : (
                        relevantOwasp.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-zinc-200/90 bg-zinc-50/40 p-4"
                          >
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-600">
                                {item.id}
                              </span>
                              <p className="mt-1 text-sm font-bold text-zinc-900">{item.title}</p>
                            </div>
                            <p className="mt-2 text-xs text-zinc-600 leading-relaxed">{item.description}</p>
                            <div className="mt-3 pt-2.5 border-t border-zinc-200/60">
                              <p className="text-[11px] font-bold text-zinc-700">Prevention:</p>
                              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-zinc-500">
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
