"use client";

import { useState, useEffect, Suspense } from "react";
import Sidebar from "@/components/common/Sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { caseService } from "@/api/cases";
import { projectService } from "@/api/projects";

function getBestSelector(selectors: any): string {
  if (!selectors || !Array.isArray(selectors) || selectors.length === 0) return "";
  
  // Try to find a standard CSS ID selector (starts with #) or class selector (starts with .)
  for (const sGroup of selectors) {
    if (Array.isArray(sGroup)) {
      const s = sGroup[0];
      if (s && (s.startsWith("#") || s.startsWith("."))) {
        return s;
      }
    }
  }

  // Fallback to finding any selector that does not contain a slash '/'
  for (const sGroup of selectors) {
    if (Array.isArray(sGroup)) {
      const s = sGroup[0];
      if (s && !s.includes("/")) {
        return s;
      }
    }
  }

  // Final fallback to the very first selector
  const first = selectors[0];
  return Array.isArray(first) ? first[0] || "" : String(first);
}

function translateJsonToPlaywright(jsonString: string): string {
  try {
    const data = JSON.parse(jsonString);
    if (!data || !Array.isArray(data.steps)) {
      return jsonString;
    }

    let code = `// Automatically translated from Chrome DevTools Recorder JSON\n`;
    
    // Optimize: Collapse consecutive 'change' steps on the same selector to keep only the final fully-typed value
    const steps = data.steps;
    const optimizedSteps: any[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      const current = steps[i];
      if (current.type === "change") {
        const currentSelector = getBestSelector(current.selectors) || current.selector;
        let nextIndex = i + 1;
        while (nextIndex < steps.length) {
          const next = steps[nextIndex];
          if (next.type === "change") {
            const nextSelector = getBestSelector(next.selectors) || next.selector;
            if (nextSelector === currentSelector) {
              i = nextIndex; // Fast-forward to the latest change step on this selector
              nextIndex++;
            } else {
              break;
            }
          } else if (next.type === "keyUp" || next.type === "keyDown") {
            // Skip intermediate keystroke noise
            nextIndex++;
          } else {
            break;
          }
        }
      }
      optimizedSteps.push(steps[i]);
    }
    
    for (const step of optimizedSteps) {
      const rawSelector = getBestSelector(step.selectors) || step.selector;
      const selector = rawSelector ? rawSelector.replace(/'/g, "\\'") : "";

      switch (step.type) {
        case "setViewport":
          code += `await page.setViewportSize({ width: ${step.width}, height: ${step.height} });\n`;
          break;
        case "navigate":
          code += `await page.goto('${step.url}');\n`;
          break;
        case "click": {
          if (selector) {
            code += `await page.locator('${selector}').click();\n`;
          }
          break;
        }
        case "change": {
          if (selector) {
            code += `await page.locator('${selector}').fill('${step.value.replace(/'/g, "\\'")}');\n`;
          }
          break;
        }
        case "waitForElement": {
          if (selector) {
            code += `await page.locator('${selector}').waitFor();\n`;
          }
          break;
        }
        case "doubleClick": {
          if (selector) {
            code += `await page.locator('${selector}').click();\n`;
          }
          break;
        }
        case "hover": {
          if (selector) {
            code += `await page.locator('${selector}').hover();\n`;
          }
          break;
        }
      }
    }
    
    return code;
  } catch (e) {
    return jsonString;
  }
}

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
        type: "success"
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
      
      // If project_id is in URL, use it; otherwise use the first project
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

    lines.forEach((line) => {
      // 1. Extract the locator part
      const locatorMatch = line.match(/page\.(.*?)\.(?:click|fill|goto|check|selectOption)/);
      
      let selector = "unknown";
      if (locatorMatch) {
        const rawLocator = locatorMatch[1];
        
        // Handle getByRole('button', { name: 'Submit' })
        if (rawLocator.includes("getByRole")) {
          const roleMatch = rawLocator.match(/getByRole\(['"](.*?)['"](?:,\s*{\s*name:\s*['"](.*?)['"]\s*})?\)/);
          if (roleMatch) {
            selector = roleMatch[2] 
              ? `internal:role=${roleMatch[1]}[name="${roleMatch[2]}"i]` 
              : `internal:role=${roleMatch[1]}`;
          }
        } 
        // Handle getByLabel, getByPlaceholder, getByText, etc.
        else if (rawLocator.includes("getBy")) {
          const genericMatch = rawLocator.match(/getBy.*?\(['"](.*?)['"]\)/);
          if (genericMatch) {
            if (rawLocator.includes("Placeholder")) selector = `[placeholder="${genericMatch[1]}"]`;
            else if (rawLocator.includes("Label")) selector = `label:has-text("${genericMatch[1]}")`;
            else if (rawLocator.includes("Text")) selector = `text="${genericMatch[1]}"`;
            else if (rawLocator.includes("TestId")) selector = genericMatch[1]; // simplified testId
            else selector = genericMatch[1];
          }
        }
        // Handle raw locator or others
        else {
          const genericMatch = rawLocator.match(/(?:locator|locate)\(['"](.*?)['"]\)/);
          selector = genericMatch ? genericMatch[1] : rawLocator;
        }
      }

      // Clean up escaped quotes in extracted selector
      if (selector) {
        selector = selector.replace(/\\'/g, "'").replace(/\\"/g, '"');
      }

      // 2. Extract action and value
      if (line.includes("goto(")) {
        const match = line.match(/goto\(['"](.*?)['"]\)/);
        if (match) steps.push({ action: "goto", value: match[1] });
      } else if (line.includes("fill(")) {
        const valueMatch = line.match(/fill\(['"](.*?)['"]\)/);
        if (valueMatch) {
          steps.push({ action: "fill", selector, value: valueMatch[1] });
        }
      } else if (line.includes("click()")) {
        steps.push({ action: "click", selector });
      }
    });

    // Optimize: Collapse consecutive 'fill' steps on the same selector to keep only the final fully-typed value
    const optimizedSteps: any[] = [];
    for (let i = 0; i < steps.length; i++) {
      const current = steps[i];
      if (current.action === "fill" && current.selector) {
        let nextIndex = i + 1;
        while (
          nextIndex < steps.length &&
          steps[nextIndex].action === "fill" &&
          steps[nextIndex].selector === current.selector
        ) {
          i = nextIndex; // Fast-forward to the latest fill action on this selector
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
    } //

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
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />

      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl font-bold">Record New Flow</h1>
            <p className="text-gray-400 mt-2">Record, translate, and configure QA test scenarios client-side</p>
          </header>

          <div className="grid gap-8">
            {/* Step 1: Record Guide */}
            <section className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center font-bold">1</div>
                <h2 className="text-xl font-bold">How to Record Tests (Built-in Chrome Recorder)</h2>
              </div>
              
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                You can record your browser flows completely client-side inside your own browser using your own computer's RAM, with absolutely zero setup or extensions required!
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 flex flex-col gap-3">
                  <div className="text-2xl">🛠️</div>
                  <h3 className="font-bold text-sm text-white">1. Open DevTools</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Open a new tab in Google Chrome, go to the website you want to test, and press <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px] text-gray-300 font-mono">F12</kbd> (or right-click and choose <strong>Inspect</strong>).
                  </p>
                </div>

                <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 flex flex-col gap-3">
                  <div className="text-2xl">⏺️</div>
                  <h3 className="font-bold text-sm text-white">2. Start Recording</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Click the double-arrows <span className="bg-gray-800 px-1 py-0.5 rounded text-[10px] text-gray-300 font-mono">»</span> at the top of DevTools, select <strong>Recorder</strong>, and click <strong>"Create a new recording"</strong> to record your flow!
                  </p>
                </div>

                <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 flex flex-col gap-3">
                  <div className="text-2xl">📋</div>
                  <h3 className="font-bold text-sm text-white">3. Export & Copy</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    When finished, click <strong>"End recording"</strong>. Click the <strong>Export icon</strong> (arrow pointing up) on the top bar, select <strong>JSON</strong>, and copy/paste that JSON below!
                  </p>
                </div>
              </div>

              {message.text && (
                <div className={`mt-6 p-4 rounded-xl text-sm ${
                  message.type === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" : 
                  message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                  "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                }`}>
                  {message.text}
                </div>
              )}
            </section>

            {/* Step 2: Paste and Save */}
            <section className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center font-bold">2</div>
                <h2 className="text-xl font-bold">Save Actions</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Assign to Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">None (Personal)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Folder / Category</label>
                    <input
                      type="text"
                      value={folder}
                      onChange={(e) => setFolder(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., Authentication"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Test Case Name</label>
                  <input
                    type="text"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Login Flow with Valid Credentials"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Paste Recorded Code (Playwright JS)</label>
                  <textarea
                    value={rawCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    rows={10}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="await page.goto('...')..."
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={loading || !rawCode || !caseName}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/20"
                >
                  {loading ? "Saving..." : "Create Test Case"}
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
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>}>
      <RecordPageContent />
    </Suspense>
  );
}
