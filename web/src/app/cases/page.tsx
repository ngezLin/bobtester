"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { caseService } from "@/api/cases";
import { assetService } from "@/api/assets";
import { runService } from "@/api/runs";

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseAssets, setCaseAssets] = useState([]);
  const [running, setRunning] = useState(false);
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
    try {
      const data = await assetService.getAssetsByCase(testCase.id);
      if (data.success) {
        setCaseAssets(data.assets);
      }
    } catch (err) {
      console.error("Failed to fetch assets");
    }
  };

  const handleExecuteRun = async (assetId: number | null) => {
    setRunning(true);
    try {
      const data = await runService.executeRun(selectedCase.id, assetId);
      if (data.success) {
        router.push("/runs");
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.message || "Failed to start test execution");
    } finally {
      setRunning(false);
      setSelectedCase(null);
    }
  };

  const handleDeleteCase = async (id: number) => {
    if (!confirm("Are you sure you want to delete this test case?")) return;
    try {
      const data = await caseService.deleteCase(id);
      if (data.success) {
        fetchCases();
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete case");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />

      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-bold">My Test Cases</h1>
              <p className="text-gray-400 mt-2">Manage your recorded flows and automation suites</p>
            </div>
            <Link
              href="/record"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <span>+</span> New Test Case
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Loading your cases...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
              {error}
            </div>
          ) : cases.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-20 text-center">
              <div className="text-5xl mb-6 opacity-30 text-gray-400">📝</div>
              <h2 className="text-2xl font-bold text-gray-300 mb-2">No test cases found</h2>
              <p className="text-gray-500 mb-8">Start by recording your first browser flow.</p>
              <Link
                href="/record"
                className="inline-block bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-xl font-bold transition-all"
              >
                Record Now
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cases.map((testCase: any) => (
                <div
                  key={testCase.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                      🌐
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-gray-500 font-mono">#{testCase.id}</span>
                      <button
                        onClick={() => handleDeleteCase(testCase.id)}
                        className="text-gray-600 hover:text-red-500 transition-colors p-1"
                        title="Delete Case"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 truncate">{testCase.name}</h3>
                  <p className="text-sm text-gray-500 mb-6 truncate">{testCase.target_url}</p>
                  
                  <div className="flex gap-2">
                    <Link 
                      href={`/cases/${testCase.id}/config`}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm font-bold py-2 rounded-lg transition-all text-center"
                    >
                      Config
                    </Link>
                    <button 
                      onClick={() => handleOpenRunModal(testCase)}
                      className="flex-1 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white text-sm font-bold py-2 rounded-lg transition-all"
                    >
                      Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run Modal */}
        {selectedCase && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-800 bg-gray-800/30">
                <h2 className="text-xl font-bold">Execute: {selectedCase.name}</h2>
                <p className="text-gray-400 mt-1">Select a data set (asset) to run this test</p>
              </div>
              
              <div className="p-8 space-y-4">
                <button
                  onClick={() => handleExecuteRun(null)}
                  disabled={running}
                  className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-2xl border border-transparent hover:border-blue-500 transition-all flex justify-between items-center group"
                >
                  <div>
                    <p className="font-bold">No Asset (Default)</p>
                    <p className="text-xs text-gray-500">Run with recorded values only</p>
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">▶️</span>
                </button>

                {caseAssets.map((asset: any) => (
                  <button
                    key={asset.id}
                    onClick={() => handleExecuteRun(asset.id)}
                    disabled={running}
                    className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-2xl border border-transparent hover:border-emerald-500 transition-all flex justify-between items-center group"
                  >
                    <div>
                      <p className="font-bold">{asset.name}</p>
                      <p className="text-xs text-gray-500">
                        {asset.is_negative ? "Negative Test Case" : "Positive Test Case"}
                      </p>
                    </div>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">▶️</span>
                  </button>
                ))}
              </div>

              <div className="p-6 bg-gray-800/30 border-t border-gray-800 flex justify-end">
                <button
                  onClick={() => setSelectedCase(null)}
                  className="px-6 py-2 text-gray-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
