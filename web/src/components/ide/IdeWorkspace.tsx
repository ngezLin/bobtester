"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { runService } from "@/api/runs";
import { PlaywrightCodeGuide } from "@/components/cases/StepList";
import AssetManager from "@/components/cases/AssetManager";

// Dynamically import Monaco Editor to avoid SSR errors
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface IdeWorkspaceProps {
  caseId: string | number;
  caseDetails: any;
  assets: any[];
  onSaveBundle: (bundle: { type: "script"; entry: string; files: Record<string, string> }) => Promise<void>;
  onAddAsset: (name: string, data: any, isNegative: boolean) => Promise<void>;
  onUpdateAsset: (assetId: number, name: string, data: any, isNegative: boolean) => Promise<void>;
  onDeleteAsset: (assetId: number) => Promise<void>;
}

const DEFAULT_MAIN_JS = `// ------------------------------------------------------------------
// Main Test Flow Entrypoint (Page Object Model / DRY Automation)
// ------------------------------------------------------------------

// 1. Authenticate using the shared COMMON module
await COMMON.login();

// 2. Perform business actions with your custom feature modules
await transactionMenu.CreateItem({
  name: asset.itemName || "Sauce Labs Backpack",
  price: asset.itemPrice || 29.99
});

// 3. Take step screenshot for reporting
await page.screenshot();

// 4. Log out cleanly
await COMMON.logout();
`;

const DEFAULT_COMMON_JS = `// ------------------------------------------------------------------
// Shared Module: COMMON
// Encapsulates Authentication, Session, and Navigation logic
// ------------------------------------------------------------------

export class COMMON {
  static async login() {
    const target = this.asset.targetUrl || this.asset.baseUrl || 'https://www.saucedemo.com';
    await this.page.goto(target);
    await this.page.fill('[data-test="username"]', this.asset.username || 'standard_user');
    await this.page.fill('[data-test="password"]', this.asset.password || 'secret_sauce');
    await this.page.click('[data-test="login-button"]');
    await this.page.waitForTimeout(500);
  }

  static async logout() {
    await this.page.click('#react-burger-menu-btn');
    await this.page.waitForTimeout(400);
    await this.page.click('#logout_sidebar_link');
  }
}
`;

const DEFAULT_TRANSACTION_MENU_JS = `// ------------------------------------------------------------------
// Page Object: transactionMenu
// Encapsulates catalog actions, item creation, and cart operations
// ------------------------------------------------------------------

export class transactionMenu {
  static async CreateItem(item = {}) {
    // Locate and click Add to Cart
    await this.page.click('#add-to-cart-sauce-labs-backpack');
    await this.page.waitForTimeout(300);
  }
}
`;

export default function IdeWorkspace({
  caseId,
  caseDetails,
  assets,
  onSaveBundle,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
}: IdeWorkspaceProps) {
  // --- Filesystem State ---
  const [files, setFiles] = useState<Record<string, string>>({
    "main.js": DEFAULT_MAIN_JS,
    "modules/COMMON.js": DEFAULT_COMMON_JS,
    "modules/transactionMenu.js": DEFAULT_TRANSACTION_MENU_JS,
  });
  const [openTabs, setOpenTabs] = useState<string[]>([
    "main.js",
    "modules/COMMON.js",
    "modules/transactionMenu.js",
  ]);
  const [activeTab, setActiveTab] = useState<string>("main.js");
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // --- UI Panels State ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<"files" | "guide">("files");
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"terminal" | "screenshots" | "security" | "assets">("terminal");
  const [editorTheme, setEditorTheme] = useState<"vs-light" | "vs-dark">("vs-light");

  // --- New File Modal State ---
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState<"page-object" | "helper" | "empty">("page-object");

  // --- Execution State ---
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionRun, setExecutionRun] = useState<any>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Initialize files from caseDetails if present
  useEffect(() => {
    if (caseDetails?.steps) {
      let parsed = caseDetails.steps;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch (_) {}
      }

      if (parsed && typeof parsed === "object" && parsed.files) {
        setFiles(parsed.files);
        const fileKeys = Object.keys(parsed.files);
        if (fileKeys.length > 0) {
          setOpenTabs(fileKeys);
          setActiveTab(parsed.entry || fileKeys[0]);
        }
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        // Convert legacy steps array to a clean main.js script
        const lines: string[] = ["// Auto-migrated from recorded steps", ""];
        for (const s of parsed) {
          if (s.action === "goto") lines.push(`await page.goto('${s.value}');`);
          else if (s.action === "click") lines.push(`await page.click('${s.selector}');`);
          else if (s.action === "fill") lines.push(`await page.fill('${s.selector}', '${s.value}');`);
          else if (s.action === "screenshot") lines.push(`await page.screenshot();`);
          else if (s.action === "sleep") lines.push(`await page.waitForTimeout(${s.value || 2000});`);
          else if (s.action === "assert") lines.push(`await page.waitForSelector('${s.selector}', { state: 'visible' });`);
        }
        const generated = lines.join("\n");
        setFiles((prev) => ({
          ...prev,
          "main.js": generated,
        }));
      }
    }
  }, [caseDetails]);

  // Set default asset if available
  useEffect(() => {
    if (assets.length > 0 && selectedAssetId === null) {
      setSelectedAssetId(assets[0].id);
    }
  }, [assets]);

  // Handle Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [files]);

  // Configure Monaco IntelliSense on mount
  const handleEditorWillMount = (monaco: any) => {
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTextFiles: false,
      checkJs: false,
    });

    const playwrightLib = `
      declare const page: {
        goto(url: string, options?: any): Promise<any>;
        click(selector: string, options?: any): Promise<any>;
        fill(selector: string, value: string, options?: any): Promise<any>;
        screenshot(options?: any): Promise<any>;
        waitForTimeout(ms: number): Promise<any>;
        waitForSelector(selector: string, options?: any): Promise<any>;
        locator(selector: string): any;
        url(): string;
      };
      declare const asset: Record<string, any>;
      declare function addLog(message: string, level?: string): void;
      declare function screenshot(name?: string): Promise<string>;
      declare function sleep(ms: number): Promise<void>;
      declare class COMMON {
        static page: typeof page;
        static asset: typeof asset;
        static login(): Promise<void>;
        static logout(): Promise<void>;
      }
      declare class transactionMenu {
        static page: typeof page;
        static asset: typeof asset;
        static CreateItem(item?: any): Promise<void>;
      }
    `;
    monaco.languages.typescript.javascriptDefaults.addExtraLib(playwrightLib, "ts:playwright.d.ts");
  };

  const handleFileChange = (value: string | undefined) => {
    if (value === undefined) return;
    setFiles((prev) => ({ ...prev, [activeTab]: value }));
    setDirtyFiles((prev) => new Set(prev).add(activeTab));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveBundle({
        type: "script",
        entry: "main.js",
        files,
      });
      setDirtyFiles(new Set());
    } catch (e: any) {
      alert("Failed to save: " + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    let path = newFileName.trim();
    if (!path.endsWith(".js") && !path.endsWith(".ts")) path += ".js";
    if (!path.startsWith("modules/") && path !== "main.js") {
      path = `modules/${path}`;
    }

    const className = path
      .replace("modules/", "")
      .replace(/\.(js|ts)$/, "")
      .replace(/[^a-zA-Z0-9_]/g, "");

    let initialCode = "";
    if (newFileType === "page-object") {
      initialCode = `// Page Object: ${className}\n\nexport class ${className} {\n  static async execute() {\n    // Write your actions using this.page and this.asset\n  }\n}\n`;
    } else if (newFileType === "helper") {
      initialCode = `// Helper Utility: ${className}\n\nexport const ${className} = {\n  async run() {\n    // Utility logic\n  }\n};\n`;
    }

    setFiles((prev) => ({ ...prev, [path]: initialCode }));
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveTab(path);
    setDirtyFiles((prev) => new Set(prev).add(path));
    setShowNewFileModal(false);
    setNewFileName("");
  };

  const handleDeleteFile = (fileName: string) => {
    if (fileName === "main.js") {
      alert("Cannot delete root entrypoint main.js");
      return;
    }
    if (!confirm(`Delete ${fileName}?`)) return;

    setFiles((prev) => {
      const copy = { ...prev };
      delete copy[fileName];
      return copy;
    });
    setOpenTabs((prev) => prev.filter((t) => t !== fileName));
    if (activeTab === fileName) {
      setActiveTab("main.js");
    }
    setDirtyFiles((prev) => {
      const copy = new Set(prev);
      copy.delete(fileName);
      return copy;
    });
  };

  const handleCloseTab = (fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t !== fileName);
    setOpenTabs(newTabs);
    if (activeTab === fileName && newTabs.length > 0) {
      setActiveTab(newTabs[newTabs.length - 1]);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setBottomPanelOpen(true);
    setBottomTab("terminal");
    try {
      // First save all current files
      await onSaveBundle({
        type: "script",
        entry: "main.js",
        files,
      });
      setDirtyFiles(new Set());

      const res = await runService.executeRun(Number(caseId), selectedAssetId);
      if (res.success && res.testRunId) {
        // Fetch complete run record for logs, status, and screenshot
        const runData = await runService.getRunById(res.testRunId);
        if (runData?.run) {
          setExecutionRun(runData.run);
        } else {
          setExecutionRun({
            id: res.testRunId,
            status: res.status,
            logs: [{ level: "info", message: "Test run completed", timestamp: new Date().toISOString() }],
          });
        }
      }
    } catch (err: any) {
      setExecutionRun({
        status: "failed",
        logs: [{ level: "error", message: `Execution failed: ${err.message || err}`, timestamp: new Date().toISOString() }],
      });
    } finally {
      setIsRunning(false);
    }
  };

  const parsedLogs = executionRun?.logs
    ? typeof executionRun.logs === "string"
      ? JSON.parse(executionRun.logs)
      : executionRun.logs
    : [];

  const parsedVulnerabilities = executionRun?.vulnerabilities
    ? typeof executionRun.vulnerabilities === "string"
      ? JSON.parse(executionRun.vulnerabilities)
      : executionRun.vulnerabilities
    : [];

  const screenshotsFromLogs = parsedLogs.filter((l: any) => l.level === "screenshot");
  const resultScreenshot = executionRun?.screenshot_path || (screenshotsFromLogs.length > 0 ? screenshotsFromLogs[screenshotsFromLogs.length - 1].message : null);

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] md:h-screen w-full bg-zinc-900 text-zinc-200 overflow-hidden font-sans select-none">
      {/* Top VS Code Header Bar */}
      <header className="h-11 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-3 shrink-0">
        {/* Left: Project & Case Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-sm shadow-red-500/30">
            B
          </div>
          <span className="text-xs font-semibold text-zinc-300 truncate max-w-[200px] sm:max-w-xs">
            {caseDetails?.name || "Automation Script Studio"}
          </span>
          <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700 hidden sm:inline-block">
            Page Object Model IDE
          </span>
        </div>

        {/* Center: Active File Breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
          <span>workspace</span>
          <span>/</span>
          <span className="text-zinc-200 font-semibold">{activeTab}</span>
          {dirtyFiles.has(activeTab) && <span className="text-red-400 font-bold ml-1">• (unsaved)</span>}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Data Set Selector */}
          {assets.length > 0 && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs">
              <span className="text-[10px] text-zinc-500 font-mono">DATA:</span>
              <select
                value={selectedAssetId || ""}
                onChange={(e) => setSelectedAssetId(Number(e.target.value))}
                className="bg-transparent text-zinc-300 text-xs font-medium outline-none cursor-pointer"
              >
                {assets.map((a: any) => (
                  <option key={a.id} value={a.id} className="bg-zinc-900 text-zinc-200">
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setEditorTheme((t) => (t === "vs-light" ? "vs-dark" : "vs-light"))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-xs"
            title={`Switch to ${editorTheme === "vs-light" ? "Dark" : "Light"} Theme`}
          >
            {editorTheme === "vs-light" ? "🌙" : "☀️"}
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              dirtyFiles.size > 0
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {isSaving ? "Saving..." : dirtyFiles.size > 0 ? "Save *" : "Saved"}
          </button>

          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-3.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 active:scale-95 disabled:opacity-50 transition-all"
          >
            {isRunning ? (
              <>
                <span className="w-2.5 h-2.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <span>▶</span>
                <span>Run</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Area (Activity Bar + Sidebar + Editor) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar (44px left strip) */}
        <aside className="w-11 bg-zinc-950 border-r border-zinc-800/80 flex flex-col items-center py-2.5 gap-3 shrink-0">
          <button
            onClick={() => {
              if (sidebarView === "files" && sidebarOpen) setSidebarOpen(false);
              else {
                setSidebarView("files");
                setSidebarOpen(true);
              }
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
              sidebarOpen && sidebarView === "files"
                ? "bg-zinc-800 text-white border-l-2 border-red-500"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
            title="Explorer (Files & Modules)"
          >
            📁
          </button>
          <button
            onClick={() => {
              if (sidebarView === "guide" && sidebarOpen) setSidebarOpen(false);
              else {
                setSidebarView("guide");
                setSidebarOpen(true);
              }
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
              sidebarOpen && sidebarView === "guide"
                ? "bg-zinc-800 text-white border-l-2 border-red-500"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
            title="Playwright Code Guide"
          >
            📖
          </button>
          <button
            onClick={() => {
              setBottomTab("assets");
              setBottomPanelOpen(true);
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
              bottomPanelOpen && bottomTab === "assets"
                ? "bg-zinc-800 text-white border-l-2 border-red-500"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
            title="Data Sets (Assets)"
          >
            📊
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all ${
              bottomPanelOpen
                ? "bg-zinc-800 text-red-400"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
            title="Toggle Bottom Terminal"
          >
            📟
          </button>
        </aside>

        {/* Collapsible Sidebar (Files or Code Snippets) */}
        {sidebarOpen && (
          <aside className="w-56 bg-zinc-900/95 border-r border-zinc-800 flex flex-col shrink-0 overflow-hidden">
            {sidebarView === "files" ? (
              <>
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Explorer
                  </span>
                  <button
                    onClick={() => setShowNewFileModal(true)}
                    className="text-xs px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
                    title="Add Module File"
                  >
                    + File
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs font-mono">
                  {/* Root Script */}
                  <div
                    onClick={() => {
                      if (!openTabs.includes("main.js")) setOpenTabs([...openTabs, "main.js"]);
                      setActiveTab("main.js");
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                      activeTab === "main.js"
                        ? "bg-red-600/15 text-red-400 font-semibold border-l-2 border-red-500"
                        : "hover:bg-zinc-800/60 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-amber-400 text-xs">JS</span>
                      <span className="truncate">main.js</span>
                    </div>
                    {dirtyFiles.has("main.js") && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                  </div>

                  {/* Modules Folder Header */}
                  <div className="pt-2 pb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <span>▼</span>
                    <span>modules/</span>
                  </div>

                  {/* Module Files */}
                  {Object.keys(files)
                    .filter((f) => f !== "main.js")
                    .map((fileName) => {
                      const isActive = activeTab === fileName;
                      const shortName = fileName.replace("modules/", "");
                      return (
                        <div
                          key={fileName}
                          onClick={() => {
                            if (!openTabs.includes(fileName)) setOpenTabs([...openTabs, fileName]);
                            setActiveTab(fileName);
                          }}
                          className={`group flex items-center justify-between px-2.5 py-1.5 pl-4 rounded-md cursor-pointer transition-colors ${
                            isActive
                              ? "bg-red-600/15 text-red-400 font-semibold border-l-2 border-red-500"
                              : "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-blue-400 text-xs">M</span>
                            <span className="truncate">{shortName}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {dirtyFiles.has(fileName) && <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1" />}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(fileName);
                              }}
                              className="text-zinc-500 hover:text-red-400 text-xs px-1"
                              title="Delete File"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 text-xs">
                <PlaywrightCodeGuide
                  onInsertCode={(code) => {
                    const currentCode = files[activeTab] || "";
                    handleFileChange(currentCode + "\n" + code);
                  }}
                />
              </div>
            )}
          </aside>
        )}

        {/* Central Editor Area */}
        <main className="flex-1 flex flex-col bg-zinc-950 overflow-hidden relative">
          {/* Editor Tabs Bar */}
          <div className="h-9 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center overflow-x-auto px-1 gap-1 shrink-0">
            {openTabs.map((tab) => {
              const isActive = activeTab === tab;
              const isDirty = dirtyFiles.has(tab);
              const displayName = tab.replace("modules/", "");
              return (
                <div
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`group flex items-center gap-2 px-3 py-1 rounded-t-md text-xs font-mono cursor-pointer transition-colors border-t-2 ${
                    isActive
                      ? "bg-zinc-950 text-zinc-100 border-red-500 font-semibold shadow-xs"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border-transparent"
                  }`}
                >
                  <span>{displayName}</span>
                  {isDirty ? (
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                  ) : (
                    <button
                      onClick={(e) => handleCloseTab(tab, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-zinc-100 text-[10px] rounded p-0.5 transition-opacity"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 w-full h-full relative">
            <Editor
              height="100%"
              path={activeTab}
              defaultLanguage="javascript"
              language="javascript"
              value={files[activeTab] || ""}
              onChange={handleFileChange}
              beforeMount={handleEditorWillMount}
              theme={editorTheme}
              options={{
                fontSize: 13,
                fontFamily: "var(--font-mono), 'JetBrains Mono', 'Fira Code', Menlo, monospace",
                lineNumbers: "on",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                bracketPairColorization: { enabled: true },
                formatOnPaste: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* Docked Bottom Panel */}
          {bottomPanelOpen && (
            <div className="h-64 border-t border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
              {/* Bottom Tabs Header */}
              <div className="h-8 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-3 shrink-0">
                <div className="flex items-center gap-3 text-xs">
                  <button
                    onClick={() => setBottomTab("terminal")}
                    className={`font-semibold pb-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                      bottomTab === "terminal" ? "text-red-400 border-red-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                  >
                    <span>Terminal & Logs</span>
                    {parsedLogs.length > 0 && (
                      <span className="text-[10px] bg-zinc-800 px-1.5 py-0.2 rounded-full text-zinc-400">
                        {parsedLogs.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setBottomTab("screenshots")}
                    className={`font-semibold pb-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                      bottomTab === "screenshots" ? "text-red-400 border-red-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                  >
                    <span>Screenshots</span>
                    {screenshotsFromLogs.length > 0 && (
                      <span className="text-[10px] bg-zinc-800 px-1.5 py-0.2 rounded-full text-zinc-400">
                        {screenshotsFromLogs.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setBottomTab("security")}
                    className={`font-semibold pb-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                      bottomTab === "security" ? "text-red-400 border-red-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                  >
                    <span>Security Probes</span>
                    {parsedVulnerabilities.length > 0 && (
                      <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.2 rounded-full font-bold">
                        {parsedVulnerabilities.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setBottomTab("assets")}
                    className={`font-semibold pb-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                      bottomTab === "assets" ? "text-red-400 border-red-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                  >
                    <span>Data Sets</span>
                  </button>
                </div>

                <button
                  onClick={() => setBottomPanelOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs p-1"
                  title="Close Panel"
                >
                  ✕
                </button>
              </div>

              {/* Bottom Tab Content */}
              <div className="flex-1 overflow-auto p-3 text-xs font-mono">
                {bottomTab === "terminal" && (
                  <div className="space-y-1.5">
                    {parsedLogs.length === 0 ? (
                      <div className="text-zinc-500 italic py-6 text-center">
                        No logs yet. Click "▶ Run" to execute this modular test flow.
                      </div>
                    ) : (
                      parsedLogs.map((log: any, i: number) =>
                        log.level === "screenshot" ? (
                          <div key={i} className="my-1.5 bg-zinc-950 p-2 rounded-lg border border-zinc-800 max-w-sm">
                            <span className="text-[10px] text-zinc-400 block mb-1">📸 Step Screenshot</span>
                            <img
                              src={log.message}
                              onClick={() => setZoomImage(log.message)}
                              alt="Captured step"
                              className="w-full h-auto rounded cursor-zoom-in hover:scale-[1.01] transition-transform"
                            />
                          </div>
                        ) : (
                          <div key={i} className="flex gap-2 leading-relaxed">
                            <span className="text-zinc-500 shrink-0">
                              [{new Date(log.timestamp).toLocaleTimeString()}]
                            </span>
                            <span
                              className={`font-bold shrink-0 ${
                                log.level === "error"
                                  ? "text-red-400"
                                  : log.level === "warn"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {log.level.toUpperCase()}
                            </span>
                            <span className="text-zinc-300 break-all">{log.message}</span>
                          </div>
                        )
                      )
                    )}
                  </div>
                )}

                {bottomTab === "screenshots" && (
                  <div className="space-y-4">
                    {resultScreenshot ? (
                      <div>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                          Result Screenshot
                        </h4>
                        <img
                          src={resultScreenshot}
                          onClick={() => setZoomImage(resultScreenshot)}
                          alt="Result Screenshot"
                          className="max-h-48 rounded-lg border border-zinc-700 cursor-zoom-in hover:scale-[1.01] transition-all"
                        />
                      </div>
                    ) : (
                      <div className="text-zinc-500 italic py-6 text-center">
                        No screenshots captured for this run yet.
                      </div>
                    )}
                  </div>
                )}

                {bottomTab === "security" && (
                  <div className="space-y-2">
                    {parsedVulnerabilities.length === 0 ? (
                      <div className="text-emerald-400 py-6 text-center font-medium">
                        🛡️ 0 Vulnerabilities Detected. Test execution passed clean and safe.
                      </div>
                    ) : (
                      parsedVulnerabilities.map((v: any, i: number) => (
                        <div key={i} className="bg-red-950/40 border border-red-800/60 p-3 rounded-xl">
                          <div className="flex justify-between font-bold text-xs text-red-400 mb-1">
                            <span>{v.type}</span>
                            <span>{v.severity}</span>
                          </div>
                          <p className="text-zinc-300 text-xs">{v.evidence}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {bottomTab === "assets" && (
                  <div className="bg-white rounded-xl p-3 text-zinc-900 font-sans">
                    <AssetManager
                      assets={assets}
                      submittingAsset={false}
                      onAddAsset={onAddAsset}
                      onUpdateAsset={onUpdateAsset}
                      onDeleteAsset={onDeleteAsset}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Module Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-zinc-200">
            <h3 className="text-base font-bold text-white">Create New Module</h3>
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">File Name (e.g. cartPage.js, authHelper.js)</label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="cartPage.js"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Module Template</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "page-object", label: "Page Object Class" },
                  { id: "helper", label: "Utility Helper" },
                  { id: "empty", label: "Blank File" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setNewFileType(t.id as any)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      newFileType === t.id
                        ? "bg-red-600/20 text-red-400 border-red-500"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={zoomImage}
            alt="Enlarged screenshot"
            className="max-w-full max-h-[90vh] object-contain rounded-xl border border-zinc-700 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
