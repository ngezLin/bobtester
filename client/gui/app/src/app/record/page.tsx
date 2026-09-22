"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import Sidebar from "@/components/common/Sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { caseService } from "@/api/cases";
import { recorderService } from "@/api/recorder";
import {
  translateChromeRecorderToPlaywright,
  PlaywrightTranslation,
} from "@/utils/recorderTranslator";

// ─── Live Recorder ────────────────────────────────────────────────────────────

type FillDialog = { selector: string } | null;

function LiveRecorder() {
  const [targetUrl, setTargetUrl] = useState("https://www.saucedemo.com");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [screenshotTs, setScreenshotTs] = useState(0);
  const [fillDialog, setFillDialog] = useState<FillDialog>(null);
  const [fillValue, setFillValue] = useState("");
  const [assertSelector, setAssertSelector] = useState("");
  const [showAssertDialog, setShowAssertDialog] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const stepsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll steps list
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      esRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startSession = async () => {
    if (!targetUrl.trim()) return;
    setIsStarting(true);
    setStatusMsg("Connecting to cloud browser…");
    setSteps([]);
    setGeneratedCode(null);
    try {
      const { sessionId: sid } = await recorderService.start(targetUrl.trim());
      setSessionId(sid);
      setStatusMsg("Recording — click anything in the browser view");

      // Screenshot polling
      pollRef.current = setInterval(() => setScreenshotTs(Date.now()), 700);

      // SSE step stream
      const es = recorderService.createEventSource(sid);
      esRef.current = es;
      es.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "init" || data.type === "update") setSteps(data.steps ?? []);
        else if (data.type === "step") setSteps((prev) => [...prev, data.step]);
        else if (data.type === "done") {
          setGeneratedCode(data.code);
          setSessionId(null);
          setStatusMsg("Recording stopped — copy or download the code below");
        }
      };
      es.onerror = () => setStatusMsg("⚠️ SSE connection lost — steps may not update live");
    } catch (err: any) {
      setStatusMsg("❌ " + (err.message || "Failed to connect"));
    } finally {
      setIsStarting(false);
    }
  };

  const stopSession = async () => {
    if (!sessionId) return;
    esRef.current?.close();
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      const { code } = await recorderService.stop(sessionId);
      setGeneratedCode(code);
    } catch (_) {}
    setSessionId(null);
    setStatusMsg("Recording stopped");
  };

  const handleScreenshotClick = useCallback(
    async (e: React.MouseEvent<HTMLImageElement>) => {
      if (!sessionId) return;
      const img = e.currentTarget;
      const rect = img.getBoundingClientRect();
      // Scale display coordinates → actual 1280×800 browser coordinates
      const x = Math.round((e.clientX - rect.left) * (1280 / rect.width));
      const y = Math.round((e.clientY - rect.top) * (800 / rect.height));

      const result = await recorderService.action(sessionId, { action: "click", x, y });
      if (result.action === "fill_dialog") {
        setFillDialog({ selector: result.selector });
        setFillValue("");
      }
    },
    [sessionId]
  );

  const submitFill = async () => {
    if (!sessionId || !fillDialog) return;
    await recorderService.action(sessionId, {
      action: "fill",
      selector: fillDialog.selector,
      value: fillValue,
    });
    setFillDialog(null);
    setFillValue("");
  };

  const submitAssert = async () => {
    if (!sessionId || !assertSelector.trim()) return;
    await recorderService.action(sessionId, {
      action: "assert",
      selector: assertSelector.trim(),
    });
    setShowAssertDialog(false);
    setAssertSelector("");
  };

  const addScreenshotStep = () =>
    sessionId && recorderService.action(sessionId, { action: "screenshot" });

  const addWaitStep = () =>
    sessionId && recorderService.action(sessionId, { action: "wait", value: 500 });

  const removeStep = async (index: number) => {
    if (!sessionId) {
      setSteps((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    await recorderService.removeStep(sessionId, index);
  };

  const copyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    if (!generatedCode) return;
    const blob = new Blob([generatedCode], { type: "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "recorded_test.js";
    a.click();
  };

  // ── Initial URL form ───────────────────────────────────────────────────────
  if (!sessionId && !generatedCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🔴</div>
          <h2 className="text-xl font-bold text-zinc-900">Live Recorder</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Opens a cloud browser, records your clicks as bobtester steps
          </p>
        </div>
        <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
          <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
            Target URL
          </label>
          <input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startSession()}
            placeholder="https://your-app.com"
            className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
          <button
            onClick={startSession}
            disabled={isStarting || !targetUrl.trim()}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
          >
            {isStarting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting…
              </span>
            ) : (
              "▶ Start Recording"
            )}
          </button>
          {statusMsg && <p className="text-xs text-center text-zinc-500">{statusMsg}</p>}
        </div>
      </div>
    );
  }

  // ── Generated code view ────────────────────────────────────────────────────
  if (generatedCode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">🎉 Recording Complete</h2>
          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
            >
              {copied ? "✅ Copied!" : "📋 Copy Code"}
            </button>
            <button
              onClick={downloadCode}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl"
            >
              ⬇ Download .js
            </button>
            <button
              onClick={() => { setGeneratedCode(null); setSteps([]); setStatusMsg(""); }}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl"
            >
              Record Again
            </button>
          </div>
        </div>
        <div className="bg-zinc-950 rounded-2xl p-5 font-mono text-xs text-emerald-400 overflow-auto max-h-[600px] border border-zinc-800">
          <pre>{generatedCode}</pre>
        </div>
        {steps.length > 0 && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-3">
              {steps.length} Steps Recorded
            </h3>
            <ol className="space-y-1">
              {steps.map((s, i) => (
                <li key={i} className="text-xs font-mono text-zinc-700 bg-zinc-50 px-3 py-1.5 rounded-lg">
                  {i + 1}. {s}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  // ── Active recording view ──────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-red-700">{statusMsg || "Recording…"}</span>
        </div>
        <button
          onClick={stopSession}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
        >
          ⏹ Stop & Export
        </button>
      </div>

      {/* Two-column layout: screenshot | steps */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">

        {/* Live screenshot */}
        <div className="bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 relative">
          <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-xs text-zinc-400 font-mono truncate">{targetUrl}</span>
          </div>
          {screenshotTs > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recorderService.screenshotUrl(sessionId!, screenshotTs)}
              alt="Live browser view"
              onClick={handleScreenshotClick}
              className="w-full cursor-crosshair block"
              draggable={false}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin mr-2" />
              Loading browser…
            </div>
          )}
        </div>

        {/* Steps panel */}
        <div className="bg-white border border-zinc-200 rounded-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              📝 Steps ({steps.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[540px]">
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-zinc-400">
                <span className="text-2xl mb-2">👆</span>
                <p className="text-xs text-center">Click on the browser screenshot to record steps</p>
              </div>
            ) : (
              steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 group bg-zinc-50 hover:bg-zinc-100 rounded-lg px-3 py-2 transition-colors"
                >
                  <span className="text-[10px] text-zinc-400 font-mono pt-0.5 shrink-0 w-5 text-right">
                    {i + 1}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-700 flex-1 break-all leading-relaxed">
                    {step}
                  </span>
                  <button
                    onClick={() => removeStep(i)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all shrink-0 mt-0.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
            )}
            <div ref={stepsEndRef} />
          </div>

          {/* Toolbar */}
          <div className="border-t border-zinc-100 p-3 grid grid-cols-3 gap-2">
            <button
              onClick={addScreenshotStep}
              className="flex flex-col items-center gap-1 py-2 px-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-semibold transition-colors"
            >
              <span className="text-base">📸</span>
              Screenshot
            </button>
            <button
              onClick={() => setShowAssertDialog(true)}
              className="flex flex-col items-center gap-1 py-2 px-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-semibold transition-colors"
            >
              <span className="text-base">✅</span>
              Assert
            </button>
            <button
              onClick={addWaitStep}
              className="flex flex-col items-center gap-1 py-2 px-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-semibold transition-colors"
            >
              <span className="text-base">⏱</span>
              Wait 500ms
            </button>
          </div>
        </div>
      </div>

      {/* Fill dialog */}
      {fillDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-zinc-50">
              <h3 className="font-bold text-zinc-900 text-sm">Fill Input</h3>
              <p className="text-xs text-zinc-500 mt-0.5 font-mono truncate">{fillDialog.selector}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                  Value to type
                </label>
                <input
                  autoFocus
                  value={fillValue}
                  onChange={(e) => setFillValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitFill()}
                  placeholder="e.g. standard_user or [username]"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
                />
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  Tip: use <code className="text-red-600">[username]</code> to make it a dataset variable
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setFillDialog(null); setFillValue(""); }}
                  className="px-4 py-2 text-sm text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={submitFill}
                  disabled={!fillValue}
                  className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-semibold"
                >
                  Record Fill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assert dialog */}
      {showAssertDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-zinc-50">
              <h3 className="font-bold text-zinc-900 text-sm">Assert Visible</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">CSS Selector</label>
                <input
                  autoFocus
                  value={assertSelector}
                  onChange={(e) => setAssertSelector(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitAssert()}
                  placeholder="e.g. .inventory_list or #login-button"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowAssertDialog(false); setAssertSelector(""); }}
                  className="px-4 py-2 text-sm text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAssert}
                  disabled={!assertSelector.trim()}
                  className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-semibold"
                >
                  Add Assert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chrome JSON Converter (unchanged) ───────────────────────────────────────

function JsonConverter() {
  const [jsonInput, setJsonInput] = useState("");
  const [functionName, setFunctionName] = useState("login");
  const [datasetName, setDatasetName] = useState("lalala1");
  const [translation, setTranslation] = useState<PlaywrightTranslation | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<"step" | "module" | "dataset" | "main">("step");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveToCloud, setSaveToCloud] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const router = useRouter();

  useEffect(() => {
    if (jsonInput.trim()) {
      const res = translateChromeRecorderToPlaywright(jsonInput, functionName || "login", datasetName || "lalala1");
      setTranslation(res);
    } else {
      setTranslation(null);
    }
  }, [jsonInput, functionName, datasetName]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = async () => {
    if (!caseName || !translation) { setMessage({ text: "Please enter a test case name", type: "error" }); return; }
    setLoading(true);
    try {
      const targetUrl = translation.variables.targetUrl || "https://example.com";
      const res = await caseService.createCase({
        name: caseName,
        target_url: targetUrl,
        steps: { type: "script", entry: "main.js", files: { [`utils/${functionName}.js`]: translation.moduleCode, [`data/${datasetName}.json`]: translation.datasetJson } },
      });
      if (res.success) { setMessage({ text: "Saved!", type: "success" }); setTimeout(() => router.push("/cases"), 1200); }
      else setMessage({ text: res.message || "Failed", type: "error" });
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setJsonInput(JSON.stringify({ title: "SauceDemo Login", steps: [{ type: "navigate", url: "https://www.saucedemo.com" }, { type: "change", value: "standard_user", selectors: [["#user-name"]] }, { type: "change", value: "secret_sauce", selectors: [["#password"]] }, { type: "click", selectors: [["#login-button"]] }] }, null, 2));
  };

  const generatedMainJs = `const { chromium } = require('playwright');\nconst utils = require('../utils/${functionName}');\nconst data = require('../data/${datasetName}.json');\n\n(async () => {\n  const browser = await chromium.launch({ headless: true });\n  const page = await browser.newPage();\n  await utils.${functionName}(page, data.${datasetName} || {});\n  await browser.close();\n})();\n`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[["1", "Record in Chrome", "Open DevTools → Recorder → Record → Export as JSON"], ["2", "Paste & Convert", `Paste JSON below. Variables ([username]) and dataset are extracted automatically.`], ["3", "Run in Your IDE", "Paste into utils/common.js and run with Browserless!"]].map(([n, title, desc]) => (
          <div key={n} className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold text-xs shrink-0">{n}</span>
            <div><h4 className="text-xs font-bold text-zinc-900">{title}</h4><p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{desc}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">📥 Chrome Recorder JSON</h3>
            <div className="flex gap-3">
              <button onClick={loadSample} className="text-[11px] text-zinc-400 hover:text-red-600">Load sample</button>
              {jsonInput && <button onClick={() => setJsonInput("")} className="text-[11px] text-zinc-400 hover:text-red-600">Clear</button>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["Function Name", functionName, setFunctionName, "login"], ["Dataset Name", datasetName, setDatasetName, "lalala1"]].map(([label, val, setter, ph]: any) => (
              <div key={label}>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">{label}</label>
                <input value={val} onChange={(e) => setter(e.target.value)} placeholder={ph} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 outline-none focus:border-red-500" />
              </div>
            ))}
          </div>
          <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} rows={17} placeholder={`Paste Chrome DevTools Recorder JSON here…`} className="w-full bg-zinc-950 text-emerald-400 font-mono text-xs p-4 rounded-2xl outline-none focus:ring-1 focus:ring-red-500 resize-none leading-relaxed border border-zinc-800" />
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-3xl p-5 shadow-xs flex flex-col space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="bg-zinc-100 p-1 rounded-xl border border-zinc-200 inline-flex items-center gap-1 text-xs">
              {(["step", "module", "dataset", "main"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveOutputTab(tab)} className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeOutputTab === tab ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80" : "text-zinc-600 hover:text-zinc-900"}`}>
                  {tab === "module" ? `utils/${functionName}.js` : tab === "dataset" ? "datasets.json" : tab === "main" ? "main.js" : "Step Snippet"}
                </button>
              ))}
            </div>
            <button onClick={() => handleCopy(activeOutputTab === "step" ? translation?.stepCode || "" : activeOutputTab === "module" ? translation?.moduleCode || "" : activeOutputTab === "dataset" ? translation?.datasetJson || "" : generatedMainJs, activeOutputTab)} disabled={!translation} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold">
              {copiedKey === activeOutputTab ? "✅ Copied!" : "📋 Copy"}
            </button>
          </div>
          <div className="flex-1 bg-zinc-950 rounded-2xl p-4 font-mono text-xs text-zinc-200 overflow-auto border border-zinc-800 min-h-[380px]">
            {!translation ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2 py-12"><span className="text-2xl">⚡</span><p>Paste Chrome Recorder JSON on the left to see converted code</p></div>
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

      <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setSaveToCloud(!saveToCloud)}>
          <div className="flex items-center gap-3">
            <span className="text-lg">☁️</span>
            <div><h3 className="text-sm font-bold text-zinc-900">Save generated files</h3><p className="text-xs text-zinc-500">Save this test case to your dashboard.</p></div>
          </div>
          <button type="button" className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg">{saveToCloud ? "Hide" : "Show"}</button>
        </div>
        {saveToCloud && (
          <div className="pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Test Case Name</label>
              <input value={caseName} onChange={(e) => setCaseName(e.target.value)} placeholder="e.g. Login Flow" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500" />
            </div>
            <div>
              <button onClick={handleSave} disabled={loading || !translation || !caseName} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-xl font-bold text-xs">
                {loading ? "Saving…" : "Save Test Case"}
              </button>
            </div>
            {message.text && <div className={`col-span-full p-3 rounded-xl text-xs font-semibold border ${message.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{message.text}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page shell with tab switcher ─────────────────────────────────────────────

type Tab = "live" | "converter";

function RecordPageContent() {
  const [activeTab, setActiveTab] = useState<Tab>("live");

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Recorder Studio</h1>
              <p className="text-xs text-zinc-500 mt-1">Record browser flows and convert them to bobtester code</p>
            </div>
            {/* Tab switcher */}
            <div className="bg-zinc-100 p-1 rounded-xl border border-zinc-200 inline-flex items-center gap-1 text-xs self-start sm:self-auto">
              <button
                onClick={() => setActiveTab("live")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === "live" ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/80" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                🔴 Live Recorder
              </button>
              <button
                onClick={() => setActiveTab("converter")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === "converter" ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/80" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                📥 JSON Converter
              </button>
            </div>
          </header>

          {activeTab === "live" ? <LiveRecorder /> : <JsonConverter />}

        </div>
      </main>
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-zinc-400"><div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <RecordPageContent />
    </Suspense>
  );
}
