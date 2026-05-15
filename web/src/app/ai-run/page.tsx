"use client";

import { useState } from "react";
import { runService } from "@/api/runs";
import Sidebar from "@/components/common/Sidebar";

interface StepResult {
  action: string;
  selector?: string;
  value?: string;
}

interface AiRunResult {
  testRunId: number;
  caseId: number;
  stepsGenerated: number;
  steps: StepResult[];
  message: string;
}

export default function AiRunPage() {
  const [url, setUrl] = useState("");
  const [goal, setGoal] = useState("");
  const [testName, setTestName] = useState("");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !goal) return;

    setLoading(true);
    setResult(null);
    setSteps([]);
    setError(null);
    setSuccess(null);

    try {
      const data = await runService.aiRun(url, goal);
      setSteps(data.steps);
      setTestName(data.name);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndRun = async () => {
    if (!url || steps.length === 0) return;

    setRunning(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await runService.aiRun(url, goal, testName, steps);
      setResult(data);
      setSuccess("Test case saved! Execution started in the background.");
      // Clear steps after successful start to prevent double submission
      setSteps([]);
    } catch (err: any) {
      setError(err.message || "Failed to start execution.");
    } finally {
      setRunning(false);
    }
  };

  const exampleGoals = [
    "Test the login form for SQL injection vulnerabilities",
    "Check if the registration form is vulnerable to XSS attacks",
    "Test if the search bar accepts malicious SQL payloads",
    "Verify the login page handles authentication bypass attempts",
  ];

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <div className="flex-1 p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">✨</span>
          <h1 className="text-3xl font-bold text-white">Bob AI</h1>
          <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
            New
          </span>
        </div>
        <p className="text-gray-400 text-sm ml-12">
          Describe what you want to test. Bob AI will generate steps for you to review before running.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Form */}
        <form
          onSubmit={handleGenerate}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5"
        >
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target URL
            </label>
            <input
              id="ai-run-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yoursite.com/login"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Goal Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Testing Goal
            </label>
            <textarea
              id="ai-run-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe what to test. E.g: Test the login form for SQL injection vulnerabilities"
              required
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
            />
          </div>

          {/* Example Goals */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Quick examples:</p>
            <div className="flex flex-wrap gap-2">
              {exampleGoals.map((eg) => (
                <button
                  key={eg}
                  type="button"
                  onClick={() => setGoal(eg)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  {eg}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            id="ai-run-generate"
            type="submit"
            disabled={loading || running || !url || !goal}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-white font-semibold py-3 rounded-xl border border-gray-700 transition-all"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Bob AI is thinking...
              </>
            ) : (
              <>✨ Generate Steps</>
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm flex items-center gap-3">
             <span>✅</span>
             <div>
               <p className="font-semibold">{success}</p>
               {result && <p className="text-xs opacity-70 mt-1">Run ID: #{result.testRunId}</p>}
             </div>
          </div>
        )}

        {/* Steps Preview & Save */}
        {steps.length > 0 && (
          <div className="bg-gray-900 border border-blue-500/30 rounded-2xl p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                  Test Case Name
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Give this test a name"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                  Generated Steps
                </label>
                <div className="space-y-2">
                  {steps.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700/50"
                    >
                      <span className="text-xs text-gray-500 font-mono mt-0.5 w-4 shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mr-2 ${
                            step.action === "goto"
                              ? "bg-blue-500/20 text-blue-400"
                              : step.action === "fill"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : step.action === "verify"
                              ? "bg-purple-500/20 text-purple-400"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {step.action}
                        </span>
                        {step.selector && (
                          <span className="text-gray-400 text-xs font-mono">
                            {step.selector}
                          </span>
                        )}
                        {step.value && (
                          <p className="text-gray-300 text-xs mt-1 font-mono truncate">
                            → &quot;{step.value}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveAndRun}
              disabled={running || !testName}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20"
            >
              {running ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Starting...
                </>
              ) : (
                <>🚀 Save & Run Test</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
