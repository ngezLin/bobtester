"use client";

import { useState, useEffect, Suspense } from "react";
import Sidebar from "@/components/common/Sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { caseService } from "@/api/cases";
import { projectService } from "@/api/projects";

// Extension ID - will be set after extension is published
const EXTENSION_ID = "YOUR_EXTENSION_ID_HERE"; // Replace with actual ID after publishing

function RecordPageContent() {
  const [url, setUrl] = useState("https://example.com");
  const [isRecording, setIsRecording] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [rawCode, setRawCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [folder, setFolder] = useState("General");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [recordingMethod, setRecordingMethod] = useState<"extension" | "manual">("extension");
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get("project_id");

  useEffect(() => {
    fetchProjects();
    checkExtension();
  }, []);

  const checkExtension = () => {
    // Check if extension is installed by trying to send a message
    if (typeof window !== 'undefined' && window.chrome?.runtime?.sendMessage) {
      try {
        window.chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: 'GET_STATUS' },
          (response: any) => {
            if (window.chrome?.runtime?.lastError) {
              setExtensionInstalled(false);
              setRecordingMethod("manual");
              setMessage({
                text: "🔌 Extension not detected. Install the BobTester Recorder extension for automated recording, or use manual mode below.",
                type: "info"
              });
            } else {
              setExtensionInstalled(true);
              setRecordingMethod("extension");
              setMessage({
                text: "✅ BobTester Recorder extension detected! Click 'Start Recording' to begin.",
                type: "success"
              });
            }
          }
        );
      } catch (e) {
        setExtensionInstalled(false);
        setRecordingMethod("manual");
        setMessage({
          text: "💻 Manual Recording Mode: Follow the instructions below to record your test using Playwright on your device.",
          type: "info"
        });
      }
    } else {
      setExtensionInstalled(false);
      setRecordingMethod("manual");
      setMessage({
        text: "💻 Manual Recording Mode: Follow the instructions below to record your test using Playwright on your device.",
        type: "info"
      });
    }
  };

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
    if (recordingMethod === "extension" && extensionInstalled) {
      startExtensionRecording();
    } else {
      startManualRecording();
    }
  };

  const startExtensionRecording = () => {
    setIsRecording(true);
    setMessage({ text: "Starting extension recorder...", type: "info" });

    try {
      window.chrome?.runtime?.sendMessage(
        EXTENSION_ID,
        { type: 'START_RECORDING', url: url },
        (response: any) => {
          if (window.chrome?.runtime?.lastError || !response?.success) {
            setMessage({
              text: "Failed to start extension recorder. Try manual mode instead.",
              type: "error"
            });
            setIsRecording(false);
            setRecordingMethod("manual");
          } else {
            setMessage({
              text: "🎬 Extension recorder started! Perform your actions in the opened tab. Click 'Get Code' when done.",
              type: "success"
            });
          }
        }
      );
    } catch (error: any) {
      setMessage({
        text: "Extension communication failed. Switching to manual mode.",
        type: "error"
      });
      setIsRecording(false);
      setRecordingMethod("manual");
    }
  };

  const startManualRecording = () => {
    setIsRecording(true);
    setMessage({
      text: "📋 Instructions displayed below. Follow the steps to record your test locally using Playwright.",
      type: "success"
    });
  };

  const handleGetCodeFromExtension = () => {
    if (!extensionInstalled) return;

    setMessage({ text: "Fetching recorded code from extension...", type: "info" });

    window.chrome?.runtime?.sendMessage(
      EXTENSION_ID,
      { type: 'GET_RECORDED_CODE' },
      (response: any) => {
        if (window.chrome?.runtime?.lastError || !response?.code) {
          setMessage({
            text: "Failed to get code from extension. Make sure you've recorded some actions.",
            type: "error"
          });
        } else {
          setRawCode(response.code);
          setMessage({
            text: `✅ Successfully imported ${response.actions?.length || 0} actions from extension!`,
            type: "success"
          });
        }
      }
    );
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
                <h2 className="text-xl font-bold">Record on Your Device</h2>
              </div>
              
              <div className="space-y-4">
                {/* Recording Method Selector */}
                {!isRecording && (
                  <div className="flex gap-2 p-1 bg-gray-800 rounded-xl">
                    <button
                      onClick={() => setRecordingMethod("extension")}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                        recordingMethod === "extension"
                          ? "bg-rose-600 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      🔌 Extension {extensionInstalled && "✓"}
                    </button>
                    <button
                      onClick={() => setRecordingMethod("manual")}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                        recordingMethod === "manual"
                          ? "bg-rose-600 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      💻 Manual
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Target URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://example.com"
                  />
                </div>

                {recordingMethod === "extension" && !extensionInstalled && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-400">
                    ⚠️ Extension not detected. <a href="#extension-install" className="underline font-bold">Install the extension</a> or switch to Manual mode.
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleStartRecording}
                    disabled={isRecording || (recordingMethod === "extension" && !extensionInstalled)}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <span className={isRecording ? "animate-pulse" : ""}>
                      {recordingMethod === "extension" ? "🎬" : "📋"}
                    </span>
                    {isRecording
                      ? (recordingMethod === "extension" ? "Recording..." : "Instructions Ready")
                      : (recordingMethod === "extension" ? "Start Extension Recorder" : "Show Manual Instructions")
                    }
                  </button>
                  
                  {isRecording && recordingMethod === "extension" && (
                    <button
                      onClick={handleGetCodeFromExtension}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
                    >
                      📥 Get Code
                    </button>
                  )}
                </div>
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

              {isRecording && (
                <div className="mt-6 space-y-4">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-4 text-emerald-400">🎯 Option 1: Use Playwright Codegen (Recommended)</h3>
                    <div className="space-y-3">
                      <p className="text-gray-300 text-sm">Run this command in your terminal to launch Playwright's recorder:</p>
                      <div className="bg-gray-950 border border-gray-700 rounded-lg p-4 font-mono text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-500">Terminal Command:</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`npx playwright codegen ${url}`);
                              setMessage({ text: "Command copied to clipboard!", type: "success" });
                            }}
                            className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
                          >
                            📋 Copy
                          </button>
                        </div>
                        <code className="text-emerald-400">npx playwright codegen {url}</code>
                      </div>
                      <div className="text-sm text-gray-400 space-y-2 mt-4">
                        <p><strong className="text-white">Step 1:</strong> Open your terminal/command prompt</p>
                        <p><strong className="text-white">Step 2:</strong> Paste and run the command above</p>
                        <p><strong className="text-white">Step 3:</strong> A browser window will open - perform your actions</p>
                        <p><strong className="text-white">Step 4:</strong> Copy the generated code from the Playwright Inspector</p>
                        <p><strong className="text-white">Step 5:</strong> Paste the code in the textarea below</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-4 text-blue-400">🌐 Option 2: Use Browser DevTools</h3>
                    <div className="space-y-3 text-sm text-gray-400">
                      <p><strong className="text-white">Step 1:</strong> Open your browser's DevTools (F12)</p>
                      <p><strong className="text-white">Step 2:</strong> Go to the "Recorder" tab (Chrome) or "Network" tab</p>
                      <p><strong className="text-white">Step 3:</strong> Record your actions manually</p>
                      <p><strong className="text-white">Step 4:</strong> Write the Playwright code manually based on your actions</p>
                      <p className="text-yellow-400 mt-3">⚠️ This requires knowledge of Playwright syntax</p>
                    </div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-4 text-purple-400">🔧 Option 3: Install Playwright Locally</h3>
                    <div className="space-y-3">
                      <p className="text-gray-300 text-sm">If you don't have Playwright installed, run these commands:</p>
                      <div className="bg-gray-950 border border-gray-700 rounded-lg p-4 font-mono text-sm space-y-2">
                        <div>
                          <span className="text-gray-500">Install Playwright:</span>
                          <div className="flex items-center justify-between mt-1">
                            <code className="text-purple-400">npm install -D @playwright/test</code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText('npm install -D @playwright/test');
                                setMessage({ text: "Command copied!", type: "success" });
                              }}
                              className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded ml-2"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Install browsers:</span>
                          <div className="flex items-center justify-between mt-1">
                            <code className="text-purple-400">npx playwright install</code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText('npx playwright install');
                                setMessage({ text: "Command copied!", type: "success" });
                              }}
                              className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded ml-2"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-3 text-emerald-400">💡 Pro Tips</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>✅ Playwright Codegen generates clean, production-ready code</li>
                      <li>✅ Works on Windows, Mac, and Linux</li>
                      <li>✅ No API keys or cloud services required</li>
                      <li>✅ Records clicks, typing, navigation, and more</li>
                      <li>✅ Supports multiple browsers (Chrome, Firefox, Safari)</li>
                    </ul>
                  </div>
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

            {/* Extension Installation Guide */}
            <section id="extension-install" className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-3xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center font-bold text-xl">🔌</div>
                <h2 className="text-xl font-bold">Install BobTester Recorder Extension</h2>
              </div>

              <p className="text-gray-300 mb-6">
                Get the browser extension for automated, one-click recording without any manual setup!
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <span className="text-2xl">🌐</span> Chrome / Edge
                  </h3>
                  <ol className="space-y-2 text-sm text-gray-300 mb-4">
                    <li><strong className="text-white">1.</strong> Download the extension folder from the repository</li>
                    <li><strong className="text-white">2.</strong> Open <code className="bg-gray-800 px-2 py-1 rounded">chrome://extensions/</code></li>
                    <li><strong className="text-white">3.</strong> Enable "Developer mode" (top-right toggle)</li>
                    <li><strong className="text-white">4.</strong> Click "Load unpacked" and select the extension folder</li>
                    <li><strong className="text-white">5.</strong> Pin the extension to your toolbar</li>
                  </ol>
                  <a
                    href="/api/extension/download"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                  >
                    📥 Download Extension ZIP
                  </a>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <span className="text-2xl">🦊</span> Firefox
                  </h3>
                  <ol className="space-y-2 text-sm text-gray-300 mb-4">
                    <li><strong className="text-white">1.</strong> Download the extension folder from the repository</li>
                    <li><strong className="text-white">2.</strong> Open <code className="bg-gray-800 px-2 py-1 rounded">about:debugging#/runtime/this-firefox</code></li>
                    <li><strong className="text-white">3.</strong> Click "Load Temporary Add-on"</li>
                    <li><strong className="text-white">4.</strong> Select manifest.json from the extension folder</li>
                    <li><strong className="text-white">5.</strong> Extension will be loaded (temporary)</li>
                  </ol>
                  <a
                    href="/api/extension/download"
                    className="inline-block bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                  >
                    📥 Download Extension ZIP
                  </a>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <h4 className="font-bold text-emerald-400 mb-2">✨ Extension Benefits</h4>
                <ul className="grid md:grid-cols-2 gap-2 text-sm text-gray-300">
                  <li>✅ One-click recording start</li>
                  <li>✅ Automatic code generation</li>
                  <li>✅ Smart selector detection</li>
                  <li>✅ Real-time action capture</li>
                  <li>✅ Visual recording indicator</li>
                  <li>✅ Direct integration with BobTester</li>
                </ul>
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
