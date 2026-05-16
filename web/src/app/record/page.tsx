"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/common/Sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { caseService } from "@/api/cases";
import { projectService } from "@/api/projects";

export default function RecordPage() {
  const [url, setUrl] = useState("https://example.com");
  const [isRecording, setIsRecording] = useState(false);
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

  const handleStartRecording = async () => {
    setIsRecording(true);
    setMessage({ text: "Opening recorder on server...", type: "info" });
    try {
      await caseService.recordCase(url);
      setMessage({ text: "Recorder opened. Perform your actions, then copy the code here.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to start recorder", type: "error" });
      setIsRecording(false);
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
            else if (rawLocator.includes("TestId")) selector = `data-testid=${genericMatch[1]}`;
            else selector = genericMatch[1];
          }
        }
        // Handle raw locator or others
        else {
          const genericMatch = rawLocator.match(/(?:locator|locate)\(['"](.*?)['"]\)/);
          selector = genericMatch ? genericMatch[1] : rawLocator;
        }
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

    return steps;
  };

  const handleSave = async () => {
    if (!caseName || !rawCode) {
      setMessage({ text: "Please provide a name and paste the recorded code", type: "error" });
      return;
    }

    setLoading(true);
    const steps = parseSteps(rawCode);

    try {
      const data = await caseService.createCase({
        name: caseName,
        target_url: url,
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
            <p className="text-gray-400 mt-2">Use Playwright Codegen to record your browser interactions</p>
          </header>

          <div className="grid gap-8">
            {/* Step 1: Start Recording */}
            <section className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center font-bold">1</div>
                <h2 className="text-xl font-bold">Launch Recorder</h2>
              </div>
              
              <div className="flex gap-4">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://example.com"
                />
                <button
                  onClick={handleStartRecording}
                  disabled={isRecording}
                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  <span className={isRecording ? "animate-pulse" : ""}>⏺️</span>
                  {isRecording ? "Recording..." : "Start Recording"}
                </button>
              </div>
              
              {message.text && (
                <div className={`mt-4 p-4 rounded-xl text-sm ${
                  message.type === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" : 
                  message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                  "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                }`}>
                  {message.text}
                </div>
              )}
            </section>

            {/* Step 2: Paste and Save */}
            <section className={`bg-gray-900 border border-gray-800 rounded-3xl p-8 transition-opacity ${!isRecording && "opacity-50 pointer-events-none"}`}>
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
                    onChange={(e) => setRawCode(e.target.value)}
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
