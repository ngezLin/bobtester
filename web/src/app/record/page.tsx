"use client";

import { useState, useEffect, Suspense } from "react";
import Sidebar from "@/components/common/Sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { caseService } from "@/api/cases";
import { projectService } from "@/api/projects";

import { translateJsonToPlaywright } from "@/utils/recorderTranslator";

function RecordPageContent() {
  const [caseName, setCaseName] = useState("");
  const [rawCode, setRawCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [folder, setFolder] = useState("General");
  const [message, setMessage] = useState({ text: "", type: "" });
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get("project_id");

  const handleCodeChange = (value: string) => {
    if (value.trim().startsWith("{") && value.includes('"steps"')) {
      const translated = translateJsonToPlaywright(value);
      setRawCode(translated);
      setMessage({
        text: "⚡ Successfully translated Chrome DevTools Recorder JSON to Playwright JS!",
        type: "success",
      });
    } else {
      setRawCode(value);
    }
  };

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
    } catch (error) {
      console.error("Failed to fetch projects", error);
    }
  };

  const parseSteps = (code: string) => {
    const steps: any[] = [];
    const lines = code.split("\n");

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.includes("await page.goto(")) {
        const match = line.match(/await page\.goto\(['"]([^'"]+)['"]\)/);
        if (match) {
          steps.push({ action: "goto", target: "", value: match[1] });
        }
      } else if (line.includes(".click(")) {
        const match = line.match(/await page\.locator\((.*?)\)\.click\(\)/);
        if (match) {
          let sel = match[1].trim();
          if ((sel.startsWith('"') && sel.endsWith('"')) || (sel.startsWith("'") && sel.endsWith("'"))) {
            sel = sel.slice(1, -1);
          }
          steps.push({ action: "click", target: sel, value: "" });
        }
      } else if (line.includes(".fill(")) {
        const match = line.match(/await page\.locator\((.*?)\)\.fill\(['"](.*?)['"]\)/);
        if (match) {
          let sel = match[1].trim();
          if ((sel.startsWith('"') && sel.endsWith('"')) || (sel.startsWith("'") && sel.endsWith("'"))) {
            sel = sel.slice(1, -1);
          }
          steps.push({ action: "fill", target: sel, value: match[2] });
        }
      }
    }

    const optimizedSteps: any[] = [];
    for (let i = 0; i < steps.length; i++) {
      if (
        steps[i].action === "click" &&
        i + 1 < steps.length &&
        steps[i + 1].action === "fill" &&
        steps[i + 1].target === steps[i].target
      ) {
        continue;
      }

      if (steps[i].action === "fill") {
        let nextIndex = i + 1;
        while (
          nextIndex < steps.length &&
          steps[nextIndex].action === "fill" &&
          steps[nextIndex].target === steps[i].target
        ) {
          i = nextIndex;
          nextIndex++;
        }
      }
      optimizedSteps.push(steps[i]);
    }

    return optimizedSteps;
  };

  const handleSave = async () => {
    if (!caseName || !rawCode) {
      setMessage({ text: "Please provide a name and paste the recorded code", type: "error" });
      return;
    }

    setLoading(true);
    const steps = parseSteps(rawCode);
    const gotoStep = steps.find((s) => s.action === "goto");
    const targetUrl = gotoStep && typeof gotoStep.value === "string" ? gotoStep.value : "https://example.com";

    try {
      const data = await caseService.createCase({
        name: caseName,
        target_url: targetUrl,
        steps: steps,
        project_id: selectedProjectId ? parseInt(selectedProjectId) : null,
        folder: folder || "General",
      });

      if (data.success) {
        router.push("/cases");
      } else {
        setMessage({ text: data.message, type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save test case", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="pb-6 border-b border-zinc-200">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Record Test Case</h1>
          </header>

          <div className="grid gap-8">
            {/* Step 1: Record Guide */}
            <section className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 bg-red-50 text-red-600 border border-red-100 rounded-2xl flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    Record with Chrome DevTools
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Record browser interactions in Chrome DevTools Recorder and paste the exported JSON or script below.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200/80 flex flex-col gap-2">
                  <div className="text-2xl">🛠️</div>
                  <h3 className="font-bold text-sm text-zinc-900">1. Open DevTools</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Open a tab in Chrome, go to your target site, and press{" "}
                    <kbd className="bg-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
                      F12
                    </kbd>{" "}
                    (or right-click and choose <strong>Inspect</strong>).
                  </p>
                </div>

                <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200/80 flex flex-col gap-2">
                  <div className="text-2xl">⏺️</div>
                  <h3 className="font-bold text-sm text-zinc-900">2. Start Recording</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Click the double-arrows{" "}
                    <span className="bg-zinc-200 text-zinc-800 px-1 py-0.5 rounded text-[10px] font-mono">
                      »
                    </span>{" "}
                    at the top of DevTools, select <strong>Recorder</strong>, and click{" "}
                    <strong>Create a new recording</strong>.
                  </p>
                </div>

                <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200/80 flex flex-col gap-2">
                  <div className="text-2xl">📋</div>
                  <h3 className="font-bold text-sm text-zinc-900">3. Export & Copy</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    When finished, click <strong>End recording</strong>. Click the <strong>Export icon</strong>, select{" "}
                    <strong>JSON</strong>, and paste it below!
                  </p>
                </div>
              </div>

              {message.text && (
                <div
                  className={`p-4 rounded-2xl text-xs font-semibold border ${
                    message.type === "error"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </section>

            {/* Step 2: Paste and Save */}
            <section className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 bg-red-50 text-red-600 border border-red-100 rounded-2xl flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">Test Case Details</h2>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                      Assign to Project
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-zinc-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm"
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
                    <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                      Folder / Category
                    </label>
                    <input
                      type="text"
                      value={folder}
                      onChange={(e) => setFolder(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-zinc-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm"
                      placeholder="e.g., Authentication"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                    Test Case Name
                  </label>
                  <input
                    type="text"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-zinc-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm"
                    placeholder="e.g., Login Flow with Valid Credentials"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                    Paste Recorded Code (Playwright JS or Chrome Recorder JSON)
                  </label>
                  <textarea
                    value={rawCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    rows={10}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 font-mono text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none leading-relaxed"
                    placeholder="await page.goto('...')... or paste raw Chrome DevTools JSON directly here!"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={loading || !rawCode || !caseName}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Test Case...</span>
                    </>
                  ) : (
                    <span>Save Test Case</span>
                  )}
                </button>
              </div>
            </section>
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
          <div className="w-9 h-9 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        </div>
      }
    >
      <RecordPageContent />
    </Suspense>
  );
}
