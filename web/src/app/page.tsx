"use client";

import { useState } from "react";

export default function Dashboard() {
  const [url, setUrl] = useState("https://example.com/login");
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("http://localhost:4000/api/run-login-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, email, password }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error running test:", error);
      setResult({ success: false, message: "Failed to connect to API" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-white p-8 font-sans bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
              BobTester AI
            </h1>
            <p className="text-slate-400 text-lg">AI-Assisted QA Automation Prototype</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs uppercase tracking-widest text-emerald-500 font-bold">System Online</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Config Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-2xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="p-2 bg-blue-500/20 rounded-lg">🚀</span> Test Configuration
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Target URL</label>
                  <input 
                    type="text" 
                    value={url} 
                    placeholder="https://example.com/login"
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Test Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                
                <button 
                  onClick={runTest}
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 flex justify-center items-center gap-2 ${
                    loading 
                      ? "bg-slate-700 cursor-not-allowed" 
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/20"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Executing...
                    </>
                  ) : (
                    "Run Login Test"
                  )}
                </button>

                <button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await fetch("http://localhost:4000/api/record-test", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url }),
                      });
                    } catch (error) {
                      console.error("Error recording test:", error);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-bold text-lg border-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all flex justify-center items-center gap-2"
                >
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  Record Actions (Codegen)
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-2xl min-h-[500px] flex flex-col">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="p-2 bg-emerald-500/20 rounded-lg">📊</span> Execution Results
              </h2>

              {!result && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic">
                  <div className="w-20 h-20 bg-slate-700/30 rounded-full flex items-center justify-center mb-4 text-3xl opacity-50">
                    🔍
                  </div>
                  Configure and run a test to see results
                </div>
              )}

              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-xl font-medium animate-pulse text-blue-400">AI is controlling the browser...</p>
                  <p className="text-slate-500 mt-2">Initializing Playwright context</p>
                </div>
              )}

              {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Status</p>
                      <p className={`text-xl font-black ${result.success ? "text-emerald-400" : "text-rose-400"}`}>
                        {result.status?.toUpperCase() || (result.success ? "PASSED" : "FAILED")}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Time</p>
                      <p className="text-xl font-black text-white">{result.executionTime}ms</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Run ID</p>
                      <p className="text-xl font-black text-blue-400">#{result.testRunId}</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Database</p>
                      <p className="text-xl font-black text-emerald-500">Synced</p>
                    </div>
                  </div>

                  {result.screenshot && (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Last Screenshot</p>
                      <div className="rounded-2xl overflow-hidden border-4 border-slate-700/50 shadow-2xl relative group">
                        <img 
                          src={`http://localhost:4000/${result.screenshot}`} 
                          alt="Test Screenshot" 
                          className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                          <p className="text-white font-medium">Captured at result state</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-400">
                      <p className="font-bold mb-1">Error Message:</p>
                      <p className="text-sm opacity-90">{result.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          BobTester v0.1.0-alpha | Hackathon Edition
        </footer>
      </div>
    </main>
  );
}
