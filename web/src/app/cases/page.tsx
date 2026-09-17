"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { caseService } from "@/api/cases";
import { assetService } from "@/api/assets";
import { runService } from "@/api/runs";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseAssets, setCaseAssets] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [runningAssetName, setRunningAssetName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const data = await caseService.getCases();
      if (data.success) {
        setCases(data.cases);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch cases");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRunModal = async (testCase: any) => {
    setSelectedCase(testCase);
    setCaseAssets([]);
    try {
      const data = await assetService.getAssetsByCase(testCase.id);
      if (data.success) {
        setCaseAssets(data.assets);
      }
    } catch (err) {
      console.error("Failed to fetch assets", err);
    }
  };

  const handleExecuteRun = async (assetId: number | null, assetName: string) => {
    setRunning(true);
    setRunningAssetName(assetName);
    try {
      const data = await runService.executeRun(selectedCase.id, assetId);
      if (data.success) {
        router.push("/runs");
      } else {
        alert(data.message || "Execution failed");
        setRunning(false);
        setSelectedCase(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to start test execution");
      setRunning(false);
      setSelectedCase(null);
    }
  };

  const handleDeleteCase = (id: number) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteId === null) return;
    try {
      const data = await caseService.deleteCase(confirmDeleteId);
      if (data.success) {
        fetchCases();
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete case");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Test Cases</h1>
            </div>
            <Link
              href="/record"
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-red-500/20 active:scale-95"
            >
              <span>+</span>
              <span>New Test Case</span>
            </Link>
          </div>

          {/* Body Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
              <div className="w-9 h-9 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs uppercase tracking-widest font-medium">Loading test cases...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center text-sm font-medium">
              {error}
            </div>
          ) : cases.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-3xl p-16 text-center shadow-xs">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-red-100">
                📝
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">No test cases found</h2>
              <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                You haven&apos;t recorded any browser test cases yet. Start by recording your first flow.
              </p>
              <Link
                href="/record"
                className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs"
              >
                Record Now
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cases.map((testCase: any) => (
                <div
                  key={testCase.id}
                  className="bg-white border border-zinc-200/90 rounded-2xl p-6 hover:shadow-md hover:border-red-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-11 h-11 bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                        🌐
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">
                          #{testCase.id}
                        </span>
                        <button
                          onClick={() => handleDeleteCase(testCase.id)}
                          title="Delete Case"
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 mb-1 truncate" title={testCase.name}>
                      {testCase.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mb-6 truncate font-mono" title={testCase.target_url}>
                      {testCase.target_url}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-zinc-100">
                    <Link
                      href={`/cases/${testCase.id}/config`}
                      className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold py-2.5 rounded-xl transition-all text-center border border-zinc-200/50"
                    >
                      Config
                    </Link>
                    <button
                      onClick={() => handleOpenRunModal(testCase)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm shadow-red-500/20 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>▶</span>
                      <span>Run</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run Modal */}
        {selectedCase && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-zinc-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              {running ? (
                /* Animated Real-time Execution View */
                <div className="p-8 text-center space-y-6">
                  <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-red-100 animate-ping opacity-75" />
                    <div className="w-16 h-16 rounded-full border-3 border-red-600 border-t-transparent animate-spin" />
                    <span className="absolute text-xl">🚀</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      Running test...
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900">
                      Executing {selectedCase.name}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Dataset: <span className="font-semibold text-zinc-700">{runningAssetName}</span>
                    </p>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-zinc-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Browser launched</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-900 font-medium">
                      <span className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Running steps...</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <span className="text-zinc-300">○</span>
                      <span>Finishing run</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-600">
                      Running in background...
                    </p>
                  </div>
                </div>
              ) : (
                /* Asset Selection View */
                <>
                  <div className="p-6 sm:p-8 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">
                        {selectedCase.name}
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs font-mono">
                        {selectedCase.target_url}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCase(null)}
                      className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 sm:p-8 space-y-3">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Select Data Set to Run
                    </p>

                    <button
                      onClick={() => handleExecuteRun(null, "No Asset (Default)")}
                      className="w-full text-left p-4 bg-white hover:bg-zinc-50 rounded-2xl border border-zinc-200 hover:border-red-400 transition-all flex justify-between items-center group shadow-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-zinc-900">No Asset (Default)</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                            Default
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                          Run with originally recorded values
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-zinc-100 group-hover:bg-red-600 group-hover:text-white text-zinc-500 flex items-center justify-center text-xs font-bold transition-all">
                        ▶
                      </div>
                    </button>

                    {caseAssets.map((asset: any) => (
                      <button
                        key={asset.id}
                        onClick={() => handleExecuteRun(asset.id, asset.name)}
                        className="w-full text-left p-4 bg-white hover:bg-zinc-50 rounded-2xl border border-zinc-200 hover:border-red-400 transition-all flex justify-between items-center group shadow-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-zinc-900">{asset.name}</p>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                asset.is_negative
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {asset.is_negative ? "Negative Test" : "Positive Test"}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">
                            Overrides variables with this data set
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 group-hover:bg-red-600 group-hover:text-white text-zinc-500 flex items-center justify-center text-xs font-bold transition-all">
                          ▶
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="p-4 sm:p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                    <button
                      onClick={() => setSelectedCase(null)}
                      className="px-5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-full hover:bg-zinc-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmDeleteId !== null}
          title="Delete Test Case"
          message="Are you sure you want to delete this test case? This will permanently delete the test steps and all associated history."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onClose={() => setConfirmDeleteId(null)}
          isDanger={true}
        />
      </main>
    </div>
  );
}
