"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function RunsPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRun, setSelectedRun] = useState<any>(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("http://localhost:4000/api/runs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setRuns(data.runs);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to fetch runs");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRun = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Delete this run from history?")) return;
    
    const token = localStorage.getItem("token");
    try {
      await fetch(`http://localhost:4000/api/runs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRuns();
    } catch (err) {
      alert("Failed to delete run");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white font-sans">
      <Sidebar />

      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <header className="mb-10 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Execution History</h1>
              <p className="text-gray-400 mt-2">Track the performance and results of your automation flows</p>
            </div>
            <button
              onClick={fetchRuns}
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
            <div className="overflow-hidden bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl">
              <table className="w-full text-left border-collapse">
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
                          run.status === "passed" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
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
                          onClick={(e) => handleDeleteRun(e, run.id)}
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
              <div className="bg-gray-900 border border-gray-800 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
                  <div>
                    <h2 className="text-2xl font-bold">Run Details: #{selectedRun.id}</h2>
                    <p className="text-gray-400 mt-1">{selectedRun.case_name} • {selectedRun.status}</p>
                  </div>
                  <button
                    onClick={() => setSelectedRun(null)}
                    className="text-gray-400 hover:text-white text-3xl p-2"
                  >
                    ×
                  </button>
                </div>
                
                <div className="p-8 grid md:grid-cols-2 gap-8 max-h-[70vh] overflow-auto">
                  <div className="space-y-6">
                    <h3 className="text-xs uppercase font-black text-gray-500 tracking-widest">Execution Logs</h3>
                    <div className="bg-gray-950 p-6 rounded-2xl font-mono text-xs space-y-3 max-h-96 overflow-auto border border-gray-800">
                      {selectedRun.logs ? (typeof selectedRun.logs === "string" ? JSON.parse(selectedRun.logs) : selectedRun.logs).map((log: any, i: number) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                          <span className={
                            log.level === "error" ? "text-rose-500" :
                            log.level === "warn" ? "text-yellow-500" :
                            "text-emerald-500"
                          }>{log.level.toUpperCase()}</span>
                          <span className="text-gray-300">{log.message}</span>
                        </div>
                      )) : <p className="text-gray-600 italic">No logs available</p>}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs uppercase font-black text-gray-500 tracking-widest">Result Screenshot</h3>
                    {selectedRun.screenshot_path ? (
                      <div className="rounded-2xl overflow-hidden border-4 border-gray-800 shadow-2xl relative group">
                        <img
                          src={`http://localhost:4000/${selectedRun.screenshot_path}`}
                          alt="Run Screenshot"
                          className="w-full h-auto cursor-zoom-in"
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
        </div>
      </main>
    </div>
  );
}
