"use client";

import { useState, useEffect, Suspense } from "react";
import Sidebar from "@/components/common/Sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { caseService } from "@/api/cases";
import { projectService } from "@/api/projects";
import { translateChromeRecorderToBob, BobTranslation } from "@/utils/recorderTranslator";

function RecordPageContent() {
  const [jsonInput, setJsonInput] = useState("");
  const [functionName, setFunctionName] = useState("login");
  const [datasetName, setDatasetName] = useState("lalala1");
  const [translation, setTranslation] = useState<BobTranslation | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<"step" | "module" | "dataset" | "main">("step");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Optional save to database state
  const [saveToCloud, setSaveToCloud] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [folder, setFolder] = useState("General");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get("project_id");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await projectService.getProjects();
      const projectList = res.projects || [];
      setProjects(projectList);
      if (preselectedProjectId) {
        setSelectedProjectId(preselectedProjectId);
      } else if (projectList.length > 0) {
        setSelectedProjectId(projectList[0].id.toString());
      }
    } catch (_) {}
  };

  // Live translate whenever jsonInput, functionName, or datasetName changes
  useEffect(() => {
    if (jsonInput.trim()) {
      const res = translateChromeRecorderToBob(
        jsonInput,
        functionName || "login",
        datasetName || "lalala1"
      );
      setTranslation(res);
      if (!caseName && res.hasLogin) {
        setCaseName("Login Authentication Flow");
      }
    } else {
      setTranslation(null);
    }
  }, [jsonInput, functionName, datasetName]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveToDatabase = async () => {
    if (!caseName || !translation) {
      setMessage({ text: "Please enter a test case name", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const targetUrl = translation.variables.targetUrl || "https://example.com";
      const bundle = {
        type: "script",
        entry: "main.js",
        files: {
          "main.js": `const { bob } = require('bobtester');\nconst common = require('../utils/common');\n\nbob.run(async () => {\n  await common.${functionName}('${datasetName}');\n});\n`,
          [`utils/${functionName}.js`]: translation.moduleCode,
        },
      };

      const res = await caseService.createCase({
        name: caseName,
        target_url: targetUrl,
        steps: bundle,
        project_id: selectedProjectId ? parseInt(selectedProjectId) : null,
        folder: folder || "General",
      });

      if (res.success) {
        setMessage({ text: "Test case saved successfully!", type: "success" });
        setTimeout(() => router.push("/cases"), 1200);
      } else {
        setMessage({ text: res.message || "Failed to save", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Server error", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Sample quick load for testing
  const loadSampleJson = () => {
    const sample = {
      title: "SauceDemo Login Flow",
      steps: [
        { type: "navigate", url: "https://www.saucedemo.com" },
        { type: "click", selectors: [["#user-name"]] },
        { type: "change", value: "standard_user", selectors: [["#user-name"]] },
        { type: "click", selectors: [["#password"]] },
        { type: "change", value: "secret_sauce", selectors: [["#password"]] },
        { type: "click", selectors: [["#login-button"]] },
      ],
    };
    setJsonInput(JSON.stringify(sample, null, 2));
    setFunctionName("login");
    setDatasetName("lalala1");
  };

  const generatedMainJs = `const { bob } = require('bobtester');
const utils = require('../utils/${functionName}');

bob.run(async () => {
  // 1. Call converted routine using dataset '${datasetName}'
  await utils.${functionName}('${datasetName}');

  // 2. Capture proof screenshot
  await bob.screenshot('${functionName}_completed');
});
`;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                Recorder & Converter Studio
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Convert Chrome DevTools Recorder JSON into DRY, modular Playwright code for your local IDE.
              </p>
            </div>
            <button
              onClick={loadSampleJson}
              className="text-xs font-semibold px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:text-zinc-900 rounded-full shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>🧪</span>
              <span>Load Sample Recorder JSON</span>
            </button>
          </header>

          {/* How it works 3-step banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold text-xs shrink-0">
                1
              </span>
              <div>
                <h4 className="text-xs font-bold text-zinc-900">Record in Chrome</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                  Open DevTools (F12) → Recorder → Record flow → Export as <strong>JSON</strong>.
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold text-xs shrink-0">
                2
              </span>
              <div>
                <h4 className="text-xs font-bold text-zinc-900">Paste & Convert</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                  Paste JSON below. Variables (<code className="text-red-600">[username]</code>) and dataset are auto-extracted.
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold text-xs shrink-0">
                3
              </span>
              <div>
                <h4 className="text-xs font-bold text-zinc-900">Run in Your IDE</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                  Paste into <code className="text-zinc-700 font-mono text-[10px]">utils/common.js</code> and run in Browserless!
                </p>
              </div>
            </div>
          </div>

          {/* Converter Workspace: 2-Column Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input Pane */}
            <div className="bg-white border border-zinc-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <span>📥 Chrome Recorder JSON</span>
                  </h3>
                  {jsonInput && (
                    <button
                      onClick={() => setJsonInput("")}
                      className="text-[11px] text-zinc-400 hover:text-red-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                      Function Name
                    </label>
                    <input
                      type="text"
                      value={functionName}
                      onChange={(e) => setFunctionName(e.target.value)}
                      placeholder="login"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                      Dataset Name
                    </label>
                    <input
                      type="text"
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                      placeholder="lalala1"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="relative flex-1">
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    rows={17}
                    placeholder={`Paste Chrome DevTools Recorder JSON here...\n\nExample:\n{\n  "title": "Recording",\n  "steps": [\n    { "type": "navigate", "url": "https://www.saucedemo.com" },\n    { "type": "change", "value": "standard_user", "selectors": [["#user-name"]] }\n  ]\n}`}
                    className="w-full h-full bg-zinc-950 text-emerald-400 font-mono text-xs p-4 rounded-2xl outline-none focus:ring-1 focus:ring-red-500 resize-none leading-relaxed border border-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* Right: Output Pane */}
            <div className="bg-white border border-zinc-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Tab Selector */}
                  <div className="bg-zinc-100 p-1 rounded-xl border border-zinc-200 inline-flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveOutputTab("step")}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        activeOutputTab === "step"
                          ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <span>Step Snippet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveOutputTab("module")}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        activeOutputTab === "module"
                          ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <span>utils/{functionName}.js</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveOutputTab("dataset")}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        activeOutputTab === "dataset"
                          ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <span>datasets.json</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveOutputTab("main")}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        activeOutputTab === "main"
                          ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <span>main.js</span>
                    </button>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => {
                      const text =
                        activeOutputTab === "step"
                          ? translation?.stepCode || ""
                          : activeOutputTab === "module"
                          ? translation?.moduleCode || ""
                          : activeOutputTab === "dataset"
                          ? translation?.datasetJson || ""
                          : generatedMainJs;
                      handleCopy(text, activeOutputTab);
                    }}
                    disabled={!translation}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-red-500/20 flex items-center gap-1.5"
                  >
                    <span>{copiedKey === activeOutputTab ? "✅ Copied!" : "📋 Copy"}</span>
                  </button>
                </div>

                {/* Code Preview */}
                <div className="relative flex-1 bg-zinc-950 rounded-2xl p-4 font-mono text-xs text-zinc-200 overflow-auto border border-zinc-800 leading-relaxed min-h-[380px]">
                  {!translation ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2 py-12">
                      <span className="text-2xl">⚡</span>
                      <p>Paste Chrome Recorder JSON on the left to see converted code</p>
                    </div>
                  ) : (
                    <pre className="text-zinc-200 selection:bg-red-900 selection:text-white">
                      {activeOutputTab === "step" && translation.stepCode}
                      {activeOutputTab === "module" && translation.moduleCode}
                      {activeOutputTab === "dataset" && translation.datasetJson}
                      {activeOutputTab === "main" && generatedMainJs}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Optional: Save to BobTester Dashboard */}
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setSaveToCloud(!saveToCloud)}>
              <div className="flex items-center gap-3">
                <span className="text-lg">☁️</span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    Sync to BobTester Dashboard (Optional)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Save this test case record to your online dashboard suites for historical reporting.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                {saveToCloud ? "Hide" : "Show"}
              </button>
            </div>

            {saveToCloud && (
              <div className="pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    Test Case Name
                  </label>
                  <input
                    type="text"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    placeholder="e.g. Login Flow"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    Assign to Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-red-500"
                  >
                    <option value="">None (Standalone)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    onClick={handleSaveToDatabase}
                    disabled={loading || !translation || !caseName}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-xl font-bold text-xs transition-all shadow-sm shadow-red-500/20"
                  >
                    {loading ? "Saving..." : "Save Test Case"}
                  </button>
                </div>

                {message.text && (
                  <div
                    className={`col-span-full p-3 rounded-xl text-xs font-semibold border ${
                      message.type === "error"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {message.text}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-zinc-400">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        </div>
      }
    >
      <RecordPageContent />
    </Suspense>
  );
}
