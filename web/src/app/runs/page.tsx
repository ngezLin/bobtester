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
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-950 text-white font-sans">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Execution History</h1>
              <p className="text-gray-400 mt-2">Track the performance and results of your automation flows</p>
            </div>
            <button
              onClick={() => fetchRuns()}
              className="p-3 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 transition-all"
              title="Refresh"
            >
              🔄
            </button>
          </header>

          {loading ? (
            <div className="text-center py-20 text-gray-500 italic">Loading run history...</div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
              {error}
            </div>
          ) : runs.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-20 text-center text-gray-500">
              No runs executed yet. Start by running a test case.
            </div>
          ) : (
            <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-800/50">
                    <th className="px-6 py-4 text-xs uppercase font-black text-gray-500 tracking-widest">ID</th>
                    <th className="px-6 py-4 text-xs uppercase font-black text-gray-500 tracking-widest">Test Case</th>
                    <th className="px-6 py-4 text-xs uppercase font-black text-gray-500 tracking-widest">Asset</th>
                    <th className="px-6 py-4 text-xs uppercase font-black text-gray-500 tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs uppercase font-black text-gray-500 tracking-widest">Time</th>
                    <th className="px-6 py-4 text-xs uppercase font-black text-gray-500 tracking-widest">Date</th>
                    <th className="px-6 py-4 text-xs uppercase font-black text-gray-500 tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {runs.map((run: any) => (
                    <tr key={run.id} className="hover:bg-gray-800/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">#{run.id}</td>
                      <td className="px-6 py-4 font-bold">{run.case_name}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{run.asset_name || "None"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          run.status === "passed" || run.status === "safe" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                          run.status === "vulnerable" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                          run.status === "warning" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                          run.status === "failed" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                          "bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse"
                        }`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{run.execution_time ? `${run.execution_time}ms` : "-"}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(run.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedRun(run)}
                          className="bg-gray-800 hover:bg-blue-600 hover:text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                        >
                          View
                        </button>
                        <button
                           onClick={(e) => handleDeleteClick(e, run.id)}
                           className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                         >
                           🗑️
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detailed Modal */}
          {selectedRun && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
              <div className="bg-gray-900 border border-gray-800 w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-4 sm:p-8 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedRun.status === "safe" || selectedRun.status === "passed" ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
                      selectedRun.status === "vulnerable" ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" :
                      selectedRun.status === "warning" ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" :
                      "bg-gray-500"
                    }`}></div>
                    <div>
                      <h2 className="text-2xl font-bold uppercase tracking-tight">Run Details: #{selectedRun.id}</h2>
                      <p className="text-gray-400 mt-1 font-mono text-xs">{selectedRun.case_name} • {selectedRun.status.toUpperCase()} • {selectedRun.execution_time}ms</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRun(null)}
                    className="text-gray-400 hover:text-white text-3xl p-2"
                  >
                    ×
                  </button>
                </div>
                
                <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 max-h-[75vh] overflow-auto">
                  {/* Security Report Section */}
                  <div className="space-y-6 lg:border-r lg:border-gray-800 lg:pr-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs uppercase font-black text-gray-500 tracking-widest">Security Report</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                         selectedRun.status === "safe" || selectedRun.status === "passed" ? "text-emerald-500 border-emerald-500/20" :
                         selectedRun.status === "vulnerable" ? "text-rose-500 border-rose-500/20" :
                         "text-amber-500 border-amber-500/20"
                      }`}>
                        {selectedRun.vulnerabilities ? (typeof selectedRun.vulnerabilities === "string" ? JSON.parse(selectedRun.vulnerabilities).length : selectedRun.vulnerabilities.length) : 0} Issues
                      </span>
                    </div>

                    <div className="space-y-4">
                      {selectedRun.vulnerabilities && (typeof selectedRun.vulnerabilities === "string" ? JSON.parse(selectedRun.vulnerabilities) : selectedRun.vulnerabilities).length > 0 ? (
                        (typeof selectedRun.vulnerabilities === "string" ? JSON.parse(selectedRun.vulnerabilities) : selectedRun.vulnerabilities).map((v: any, i: number) => (
                          <div key={i} className="bg-gray-950 p-4 rounded-2xl border border-gray-800 group hover:border-gray-700 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-black uppercase text-gray-500">#{i+1} {v.type}</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                v.severity === "HIGH" || v.severity === "CRITICAL" ? "bg-rose-500/20 text-rose-500" :
                                v.severity === "MEDIUM" ? "bg-amber-500/20 text-amber-500" :
                                "bg-blue-500/20 text-blue-500"
                              }`}>{v.severity}</span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">{v.evidence}</p>
                            {v.step_index !== undefined && (
                              <div className="mt-2 text-[10px] text-gray-600 font-mono">Detected at Step {v.step_index + 1}</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-3xl text-center">
                          <div className="text-2xl mb-2">🛡️</div>
                          <p className="text-emerald-500 text-sm font-bold">No vulnerabilities detected</p>
                          <p className="text-emerald-500/50 text-[10px] mt-1 uppercase tracking-widest">Environment looks safe</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs uppercase font-black text-gray-500 tracking-widest">Execution Logs</h3>
                    <div className="bg-gray-950 p-6 rounded-2xl font-mono text-xs space-y-3 max-h-96 overflow-auto border border-gray-800">
                      {selectedRun.logs ? (typeof selectedRun.logs === "string" ? JSON.parse(selectedRun.logs) : selectedRun.logs).map((log: any, i: number) => (
                        log.level === "screenshot" ? (
                          <div key={i} className="mt-2 mb-1">
                            <div className="text-[9px] uppercase tracking-widest text-gray-400 mb-1.5 font-sans font-bold">
                              📸 Step {(log.step_index ?? 0) + 1} — Captured Screenshot
                            </div>
                            <img
                              src={log.message}
                              onClick={() => setZoomImage(log.message)}
                              alt={`Step ${(log.step_index ?? 0) + 1}`}
                              className="w-full rounded-xl border border-gray-800 hover:border-blue-500/40 shadow-lg cursor-zoom-in hover:scale-[1.02] transition-all"
                            />
                          </div>
                        ) : (
                          <div key={i} className="flex gap-3">
                            <span className="text-gray-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                            <span className={`shrink-0 ${
                              log.level === "error" ? "text-rose-500" :
                              log.level === "warn" ? "text-yellow-500" :
                              "text-emerald-500"
                            }`}>{log.level.toUpperCase()}</span>
                            <span className="text-gray-300 break-all">{log.message}</span>
                          </div>
                        )
                      )) : <p className="text-gray-600 italic">No logs available</p>}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs uppercase font-black text-gray-500 tracking-widest">Result Screenshot</h3>
                    {selectedRun.screenshot_path ? (
                      <div className="rounded-2xl overflow-hidden border-4 border-gray-800 shadow-2xl relative group">
                        <img
                          src={
                            selectedRun.screenshot_path.startsWith("data:")
                              ? selectedRun.screenshot_path
                              : selectedRun.screenshot_path.startsWith("http")
                              ? selectedRun.screenshot_path
                              : `${typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:4000" : "https://bobtester-u9xe.vercel.app"}/${selectedRun.screenshot_path}`
                          }
                          onClick={() => {
                            const srcUrl = selectedRun.screenshot_path.startsWith("data:")
                              ? selectedRun.screenshot_path
                              : selectedRun.screenshot_path.startsWith("http")
                              ? selectedRun.screenshot_path
                              : `${typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:4000" : "https://bobtester-u9xe.vercel.app"}/${selectedRun.screenshot_path}`;
                            setZoomImage(srcUrl);
                          }}
                          alt="Run Screenshot"
                          className="w-full h-auto cursor-zoom-in hover:scale-[1.01] transition-transform duration-350"
                        />
                      </div>
                    ) : (
                      <div className="bg-gray-950 rounded-2xl p-12 border border-gray-800 flex flex-col items-center justify-center text-gray-600 italic">
                        <span>No screenshot captured for this run</span>
                      </div>
                    )}
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
            className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          >
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-6 right-6 text-white text-4xl font-bold bg-black/60 hover:bg-black/95 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors border border-gray-800"
            >
              ×
            </button>
            <img
              src={zoomImage}
              alt="Enlarged visual logs snapshot"
              className="max-w-full max-h-[92vh] object-contain rounded-2xl border border-gray-800 shadow-2xl animate-in zoom-in-95 duration-200"
            />
          </div>
        )}
      </div>
    </main>
  </div>
);
}
