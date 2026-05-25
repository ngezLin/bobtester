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
          : item,
      );
      saveScanHistory(updatedHistory);
      setMessage({ text: error.message || "Scan failed to start.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Create Scan</h1>
              <p className="text-gray-400 mt-2">Enter the scan details and choose the checks to run.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/scan")}
              className="rounded-full border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              Back
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-lg shadow-black/20">
            {message && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  message.type === "error"
                    ? "border-red-500 bg-red-500/10 text-red-300"
                    : "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {message.text}
              </div>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-gray-300">Test Name</span>
              <input
                type="text"
                value={testName}
                onChange={(event) => setTestName(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                placeholder="Enter a name for this scan"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-300">Target Link</span>
              <input
                type="url"
                value={targetLink}
                onChange={(event) => setTargetLink(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                placeholder="https://example.com"
              />
            </label>

            <div>
              <div className="mb-4">
                <span className="text-sm font-semibold text-gray-300">Select Scan Types</span>
                <p className="text-gray-500 text-sm mt-1">Pick one or more security checks to include in this scan.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scanOptions.map((option) => {
                  const isSelected = selectedOptions.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(option.id)}
                      className={`rounded-3xl border px-5 py-5 text-left transition ${
                        isSelected
                          ? "border-blue-500 bg-blue-600/10"
                          : "border-gray-700 bg-gray-950 hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{option.label}</p>
                          <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-600"}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-400">{selectedOptions.length} option{selectedOptions.length === 1 ? "" : "s"} selected</div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Submitting scan..." : "Run Target"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
