"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/common/Sidebar";
import { scanService } from "@/api/scans";

const scanOptions = [
  { id: "xss", label: "XSS Injection Vulnerability Scan", description: "Detect cross-site scripting issues." },
  { id: "headers", label: "Security Header Check", description: "Verify common HTTP security headers." },
  { id: "crypto", label: "Cryptographic Failure Check", description: "Inspect insecure or missing crypto settings." },
];

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

export default function ScanCreatePage() {
  const router = useRouter();
  const [testName, setTestName] = useState("");
  const [targetLink, setTargetLink] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" | "info" } | null>(null);

  const toggleOption = (optionId: string) => {
    setSelectedOptions((current) =>
      current.includes(optionId)
        ? current.filter((item) => item !== optionId)
        : [...current, optionId]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!testName.trim() || !targetLink.trim()) {
      setMessage({ text: "Please enter a scan name and target URL.", type: "error" });
      return;
    }

    if (selectedOptions.length === 0) {
      setMessage({ text: "Select at least one scan type.", type: "error" });
      return;
    }

    const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const startedAt = new Date().toISOString();
    setLoading(true);

    try {
      const data = await scanService.startScan({
        name: testName,
        url: targetLink,
        checks: selectedOptions,
        scanId,
      });

      if (!data.success) {
        throw new Error(data.message || "Scan did not complete successfully.");
      }

      const actualScanId = typeof data.scanId === "string" && data.scanId.length > 0 ? data.scanId : scanId;
      const newScan: ScanHistoryItem = {
        id: actualScanId,
        name: testName,
        url: targetLink,
        status: "Running",
        checks: selectedOptions,
        date: new Date().toLocaleString(),
        startedAt,
        report: null,
        findings: [],
      };

      const history = loadScanHistory();
      saveScanHistory([newScan, ...history]);
      router.push("/scan");
    } catch (error: any) {
      const updatedHistory = loadScanHistory().map((item) =>
        item.id === scanId
          ? {
              ...item,
              status: "Failed",
              report: null,
              findings: [],
            }
          : item
      );
      saveScanHistory(updatedHistory);
      setMessage({ text: error.message || "Scan failed to start.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-200">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Create Scan</h1>
            </div>
            <button
              type="button"
              onClick={() => router.push("/scan")}
              className="self-start sm:self-auto rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-600 transition-all shadow-xs"
            >
              ← Back to Scans
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs"
          >
            {message && (
              <div
                className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
                  message.type === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                Test Name
              </label>
              <input
                type="text"
                value={testName}
                onChange={(event) => setTestName(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
                placeholder="e.g., Staging Environment DAST Scan"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                Target URL
              </label>
              <input
                type="url"
                value={targetLink}
                onChange={(event) => setTargetLink(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm font-mono"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  Select Scan Types
                </label>
                <p className="text-zinc-400 text-xs mt-1">
                  Pick one or more security checks to include in this scan.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scanOptions.map((option) => {
                  const isSelected = selectedOptions.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(option.id)}
                      className={`rounded-2xl border p-5 text-left transition-all ${
                        isSelected
                          ? "border-red-500 bg-red-50/40 ring-1 ring-red-500 shadow-xs"
                          : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-sm text-zinc-900">{option.label}</p>
                          <p className="text-xs text-zinc-500 mt-1">{option.description}</p>
                        </div>
                        <div
                          className={`h-4 w-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                            isSelected ? "border-red-600 bg-red-600" : "border-zinc-300"
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-zinc-100">
              <div className="text-xs font-semibold text-zinc-500">
                {selectedOptions.length} option{selectedOptions.length === 1 ? "" : "s"} selected
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting scan...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Run Target Scan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
