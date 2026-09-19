"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import { runService } from "@/api/runs";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function RunsPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns(true);
    const interval = setInterval(() => fetchRuns(false), 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchRuns = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await runService.getRuns();
      if (data.success) {
        setRuns(data.runs);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch runs");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteId === null) return;
    try {
      await runService.deleteRun(confirmDeleteId);
      fetchRuns();
    } catch (err: any) {
      alert(err.message || "Failed to delete run");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900 font-sans">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Execution History</h1>
            </div>
            <button
              onClick={() => fetchRuns()}
              className="p-2.5 bg-white border border-zinc-200/90 rounded-xl hover:bg-zinc-50 hover:border-zinc-300 text-zinc-600 shadow-xs transition-all self-start sm:self-auto flex items-center gap-2 text-xs font-semibold"
              title="Refresh"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
              <div className="w-9 h-9 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs uppercase tracking-widest font-medium">Loading execution history...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center text-sm font-medium">
              {error}
            </div>
          ) : runs.length === 0 ? (
            <div className="bg-white border border-zinc-200/90 rounded-3xl p-16 text-center shadow-xs">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-red-100">
                🚀
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">No runs executed yet</h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Execute a test case or project suite to view automation results and traces here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white border border-zinc-200/90 rounded-3xl shadow-xs">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200/80">
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">ID</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Test Case</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Asset</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Time</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Date</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {runs.map((run: any) => (
                    <tr key={run.id} className="hover:bg-zinc-50/60 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-zinc-400">#{run.id}</td>
                      <td className="px-6 py-4 font-bold text-zinc-900 text-sm">{run.case_name}</td>
                      <td className="px-6 py-4 text-zinc-500 text-xs">{run.asset_name || "None"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                            run.status === "passed" || run.status === "safe"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : run.status === "vulnerable"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : run.status === "warning"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : run.status === "failed"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              run.status === "passed" || run.status === "safe"
                                ? "bg-emerald-600"
                                : run.status === "vulnerable" || run.status === "failed"
                                ? "bg-red-600"
                                : "bg-amber-600"
                            }`}
                          />
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-xs font-mono">
                        {run.execution_time ? `${run.execution_time}ms` : "-"}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-xs">
                        {new Date(run.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedRun(run)}
                            className="bg-zinc-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-zinc-200/60 text-zinc-700 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all"
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(e, run.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Run"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detailed Modal */}
          {selectedRun && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-auto">
              <div className="bg-white border border-zinc-200 w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-900">
                <div className="p-6 sm:p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-3.5 h-3.5 rounded-full ${
                        selectedRun.status === "safe" || selectedRun.status === "passed"
                          ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                          : selectedRun.status === "vulnerable"
                          ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                          : selectedRun.status === "warning"
                          ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                          : "bg-zinc-400"
                      }`}
                    />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                        Run Details: #{selectedRun.id}
                      </h2>
                      <p className="text-zinc-500 mt-1 font-mono text-xs">
                        {selectedRun.case_name} • {selectedRun.status?.toUpperCase()} • {selectedRun.execution_time}ms
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRun(null)}
                    className="text-zinc-400 hover:text-zinc-700 text-2xl p-1.5 rounded-xl hover:bg-zinc-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 max-h-[75vh] overflow-auto">
                  {/* Security Report Section */}
                  <div className="space-y-4 lg:border-r lg:border-zinc-100 lg:pr-8">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                      <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-wider">
                        Security Report
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          selectedRun.status === "safe" || selectedRun.status === "passed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : selectedRun.status === "vulnerable"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {selectedRun.vulnerabilities
                          ? (typeof selectedRun.vulnerabilities === "string"
                              ? JSON.parse(selectedRun.vulnerabilities).length
                              : selectedRun.vulnerabilities.length)
                          : 0}{" "}
                        Issues
                      </span>
                    </div>

                    <div className="space-y-3">
                      {selectedRun.vulnerabilities &&
                      (typeof selectedRun.vulnerabilities === "string"
                        ? JSON.parse(selectedRun.vulnerabilities)
                        : selectedRun.vulnerabilities
                      ).length > 0 ? (
                        (typeof selectedRun.vulnerabilities === "string"
                          ? JSON.parse(selectedRun.vulnerabilities)
                          : selectedRun.vulnerabilities
                        ).map((v: any, i: number) => (
                          <div
                            key={i}
                            className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200/80 group hover:border-red-300 transition-all"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold uppercase text-zinc-500">
                                #{i + 1} {v.type}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  v.severity === "HIGH" || v.severity === "CRITICAL"
                                    ? "bg-red-100 text-red-700 border border-red-200"
                                    : v.severity === "MEDIUM"
                                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                                    : "bg-blue-100 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {v.severity}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                              {v.evidence}
                            </p>
                            {v.step_index !== undefined && (
                              <div className="mt-2 text-[10px] text-zinc-400 font-mono">
                                Detected at Step {v.step_index + 1}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="bg-emerald-50/60 border border-emerald-200 p-8 rounded-2xl text-center space-y-2">
                          <div className="text-3xl">🛡️</div>
                          <p className="text-emerald-800 text-sm font-bold">No vulnerabilities detected</p>
                          <p className="text-emerald-600/80 text-xs">Test execution passed clean and safe</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Execution Logs Section */}
                  <div className="space-y-4">
                    <div className="pb-2 border-b border-zinc-100">
                      <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-wider">
                        Execution Logs
                      </h3>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl font-mono text-xs space-y-2.5 max-h-96 overflow-auto border border-zinc-800 text-zinc-300 shadow-inner">
                      {selectedRun.logs ? (
                        (typeof selectedRun.logs === "string"
                          ? JSON.parse(selectedRun.logs)
                          : selectedRun.logs
                        ).map((log: any, i: number) =>
                          log.level === "screenshot" ? (
                            (() => {
                              const imgUrl =
                                log.message.startsWith("data:") || log.message.startsWith("http")
                                  ? log.message
                                  : `${
                                      typeof window !== "undefined" && window.location.hostname === "localhost"
                                        ? "http://localhost:4000"
                                        : "https://bobtester-u9xe.vercel.app"
                                    }/${log.message}`;
                              return (
                                <div key={i} className="mt-2 mb-1 bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                                  <div className="text-[9px] uppercase tracking-widest text-zinc-400 mb-1.5 font-sans font-bold">
                                    {log.step_index === "result"
                                      ? "📸 Final Result Screenshot"
                                      : typeof log.step_index === "number"
                                      ? `📸 Step ${log.step_index + 1} — Captured Screenshot`
                                      : "📸 Captured Screenshot"}
                                  </div>
                                  <img
                                    src={imgUrl}
                                    onClick={() => setZoomImage(imgUrl)}
                                    alt={
                                      log.step_index === "result"
                                        ? "Final Result Screenshot"
                                        : `Step ${(log.step_index ?? 0) + 1}`
                                    }
                                    className="w-full rounded-lg border border-zinc-700 hover:border-red-500/60 shadow-md cursor-zoom-in hover:scale-[1.01] transition-all"
                                  />
                                </div>
                              );
                            })()
                          ) : (
                            <div key={i} className="flex gap-2.5 leading-relaxed">
                              <span className="text-zinc-500 shrink-0">
                                [
                                {new Date(log.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                                ]
                              </span>
                              <span
                                className={`shrink-0 font-bold ${
                                  log.level === "error"
                                    ? "text-red-400"
                                    : log.level === "warn"
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                                }`}
                              >
                                {log.level.toUpperCase()}
                              </span>
                              <span className="text-zinc-300 break-all">{log.message}</span>
                            </div>
                          )
                        )
                      ) : (
                        <p className="text-zinc-500 italic">No logs available</p>
                      )}
                    </div>
                  </div>

                  {/* Result Screenshot Section */}
                  <div className="space-y-4">
                    <div className="pb-2 border-b border-zinc-100">
                      <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-wider">
                        Result Screenshot
                      </h3>
                    </div>
                    {(() => {
                      const parsedLogs: any[] = Array.isArray(selectedRun.logs)
                        ? selectedRun.logs
                        : typeof selectedRun.logs === "string"
                        ? (() => {
                            try {
                              return JSON.parse(selectedRun.logs);
                            } catch {
                              return [];
                            }
                          })()
                        : [];

                      const resultScreenshotFromLogs = [...parsedLogs]
                        .reverse()
                        .find((l: any) => l.level === "screenshot")?.message;

                      const rawScreenshot =
                        selectedRun.screenshot_path || resultScreenshotFromLogs;

                      if (!rawScreenshot) {
                        return (
                          <div className="bg-zinc-50 rounded-2xl p-12 border border-zinc-200 flex flex-col items-center justify-center text-zinc-400 text-xs italic">
                            <span>No screenshot captured for this run</span>
                          </div>
                        );
                      }

                      const srcUrl =
                        rawScreenshot.startsWith("data:") || rawScreenshot.startsWith("http")
                          ? rawScreenshot
                          : `${
                              typeof window !== "undefined" && window.location.hostname === "localhost"
                                ? "http://localhost:4000"
                                : "https://bobtester-u9xe.vercel.app"
                            }/${rawScreenshot}`;

                      return (
                        <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-sm relative group bg-zinc-50">
                          <img
                            src={srcUrl}
                            onClick={() => setZoomImage(srcUrl)}
                            alt="Run Screenshot"
                            className="w-full h-auto cursor-zoom-in hover:scale-[1.01] transition-transform duration-200"
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <ConfirmModal
            isOpen={confirmDeleteId !== null}
            title="Delete Run History"
            message="Are you sure you want to delete this run from your execution history? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={handleConfirmDelete}
            onClose={() => setConfirmDeleteId(null)}
            isDanger={true}
          />

          {/* Lightbox Zoom Modal */}
          {zoomImage && (
            <div
              onClick={() => setZoomImage(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
            >
              <button
                onClick={() => setZoomImage(null)}
                className="absolute top-6 right-6 text-white text-3xl font-bold bg-white/10 hover:bg-white/20 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-colors border border-white/20"
              >
                ×
              </button>
              <img
                src={zoomImage}
                alt="Enlarged visual logs snapshot"
                className="max-w-full max-h-[92vh] object-contain rounded-2xl border border-white/20 shadow-2xl animate-in zoom-in-95 duration-200"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
