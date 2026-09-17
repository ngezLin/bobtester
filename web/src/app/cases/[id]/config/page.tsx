"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { caseService } from "@/api/cases";
import { assetService } from "@/api/assets";
import StepList, { generateFullScript, parseSteps, PlaywrightCodeGuide } from "@/components/cases/StepList";
import AssetManager from "@/components/cases/AssetManager";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function ConfigPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  const [caseDetails, setCaseDetails] = useState<any>(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [submittingAsset, setSubmittingAsset] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);
  const [scriptCode, setScriptCode] = useState("");
  const [rightTab, setRightTab] = useState<"assets" | "guide">("assets");
  const [savingSteps, setSavingSteps] = useState(false);
  const [confirmDeleteType, setConfirmDeleteType] = useState<"step" | "asset" | null>(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchCaseAndAssets();
  }, [id]);

  const fetchCaseAndAssets = async () => {
    try {
      const [caseData, assetsData] = await Promise.all([
        caseService.getCaseById(id),
        assetService.getAssetsByCase(id)
      ]);

      if (caseData.success) {
        setCaseDetails(caseData.case);
        let parsedSteps = typeof caseData.case.steps === "string" 
          ? JSON.parse(caseData.case.steps) 
          : (caseData.case.steps || []);
        if (caseData.case.target_url && (parsedSteps.length === 0 || parsedSteps[0].action !== "goto")) {
          parsedSteps = [{ action: "goto", value: caseData.case.target_url }, ...parsedSteps];
        }
        setSteps(parsedSteps);
        setScriptCode(generateFullScript(parsedSteps));
      }
      if (assetsData.success) setAssets(assetsData.assets);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (name: string, data: any, isNegative: boolean) => {
    setSubmittingAsset(true);
    try {
      const res = await assetService.addAsset(id, {
        name,
        data,
        is_negative: isNegative,
      });
      if (res.success) {
        fetchCaseAndAssets();
      }
    } catch (err: any) {
      alert(err.message || "Failed to add asset");
    } finally {
      setSubmittingAsset(false);
    }
  };

  const handleUpdateAsset = async (assetId: number, name: string, data: any, isNegative: boolean) => {
    setSubmittingAsset(true);
    try {
      const res = await assetService.updateAsset(assetId, {
        name,
        data,
        is_negative: isNegative,
      });
      if (res.success) {
        fetchCaseAndAssets();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update asset");
    } finally {
      setSubmittingAsset(false);
    }
  };

  const handleUpdateStep = (index: number, field: string, value: string) => {
    setSteps((prevSteps) => {
      const newSteps = [...prevSteps];
      newSteps[index] = { ...newSteps[index], [field]: value };
      return newSteps;
    });
  };

  const handleDeleteStep = (index: number) => {
    setConfirmDeleteType("step");
    setConfirmDeleteIndex(index);
  };

  const handleSaveSteps = async (stepsToSave?: any[]) => {
    setSavingSteps(true);
    try {
      let finalSteps = stepsToSave || parseSteps(scriptCode);
      if (caseDetails?.target_url && (finalSteps.length === 0 || finalSteps[0].action !== "goto")) {
        finalSteps = [{ action: "goto", value: caseDetails.target_url }, ...finalSteps];
      }
      const res = await caseService.updateCase(id, {
        name: caseDetails.name,
        target_url: caseDetails.target_url,
        steps: finalSteps,
      });
      if (res.success) {
        setSteps(finalSteps);
        setScriptCode(generateFullScript(finalSteps));
        alert("Steps updated successfully!");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save steps");
    } finally {
      setSavingSteps(false);
    }
  };

  const handleDeleteAsset = (assetId: number) => {
    setConfirmDeleteType("asset");
    setConfirmDeleteIndex(assetId);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteIndex === null || !confirmDeleteType) return;
    
    if (confirmDeleteType === "step") {
      const newSteps = [...steps];
      newSteps.splice(confirmDeleteIndex, 1);
      setSteps(newSteps);
      setScriptCode(generateFullScript(newSteps));
    } else if (confirmDeleteType === "asset") {
      try {
        await assetService.deleteAsset(confirmDeleteIndex);
        fetchCaseAndAssets();
      } catch (err: any) {
        alert(err.message || "Failed to delete asset");
      }
    }
    
    setConfirmDeleteType(null);
    setConfirmDeleteIndex(null);
  };

  const handleInsertGuideCode = (code: string) => {
    setScriptCode((prev) => (prev ? `${prev.trimEnd()}\n${code}\n` : `${code}\n`));
  };

  // Real-time suggested keys derivation strictly from active script editor
  const getSuggestedKeys = (): string[] => {
    const keys = new Set<string>();
    if (scriptCode && scriptCode.trim()) {
      const matches = scriptCode.match(/\[([a-zA-Z0-9_\-]+)\]/g);
      if (matches) {
        matches.forEach((m: string) => {
          const keyName = m.slice(1, -1).trim();
          if (keyName) keys.add(keyName);
        });
      }
      return Array.from(keys);
    }
    steps.forEach((step: any) => {
      if (step.value && typeof step.value === "string") {
        const matches = step.value.match(/\[(.*?)\]/g);
        if (matches) {
          matches.forEach((m: string) => {
            const keyName = m.slice(1, -1).trim();
            if (keyName) keys.add(keyName);
          });
        }
      }
    });
    return Array.from(keys);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-zinc-500 text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-spin mr-3" />
        Loading configuration...
      </div>
    );
  }

  const suggestedKeys = getSuggestedKeys();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top navigation */}
          <div>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 px-4 py-1.5 shadow-xs transition-all"
            >
              <span>←</span>
              <span>Back to All Cases</span>
            </Link>
          </div>

          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-zinc-200">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                {caseDetails?.name || "Flow Configuration"}
              </h1>
              {caseDetails?.target_url && (
                <p className="text-xs text-zinc-500 mt-1 font-mono">
                  Target: <span className="text-zinc-700 font-semibold">{caseDetails.target_url}</span>
                </p>
              )}
            </div>

            {/* Quick stats indicator */}
            <div className="flex items-center gap-2 text-xs text-zinc-500 self-start sm:self-auto">
              <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full font-mono text-[11px]">
                {steps.length} steps
              </span>
              <span className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full font-mono text-[11px] font-medium">
                {assets.length} data sets
              </span>
            </div>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs">
              {error}
            </div>
          )}

          {/* Top Section: Flow Script Editor (Full Width) */}
          <div className="w-full">
            <StepList 
              steps={steps} 
              savingSteps={savingSteps} 
              onSave={handleSaveSteps} 
              onUpdateStep={handleUpdateStep} 
              onDeleteStep={handleDeleteStep}
              onUpdateAllSteps={setSteps}
              scriptCode={scriptCode}
              onScriptChange={setScriptCode}
              onOpenGuide={() => {
                setRightTab("guide");
                const el = document.getElementById("data-grid-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>

          {/* Bottom Section: Data Sets (Excel Grid) & Playwright Guide (Full Width) */}
          <div id="data-grid-section" className="w-full space-y-4 pt-6 border-t border-zinc-200">
            {/* Panel Switcher Tabs */}
            <div className="flex items-center justify-between">
              <div className="bg-zinc-100 p-1 rounded-full border border-zinc-200 inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRightTab("assets")}
                  className={`rounded-full px-5 py-2 text-xs font-semibold transition-all flex items-center gap-2 ${
                    rightTab === "assets"
                      ? "bg-red-600 text-white shadow-sm shadow-red-600/20"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>🏷️ Data Sets</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      rightTab === "assets"
                        ? "bg-red-700 text-white"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {assets.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRightTab("guide")}
                  className={`rounded-full px-5 py-2 text-xs font-semibold transition-all flex items-center gap-2 ${
                    rightTab === "guide"
                      ? "bg-red-600 text-white shadow-sm shadow-red-600/20"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>📖 Playwright Guide</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {rightTab === "assets" ? (
              <AssetManager 
                assets={assets} 
                submittingAsset={submittingAsset} 
                onAddAsset={handleAddAsset} 
                onUpdateAsset={handleUpdateAsset}
                onDeleteAsset={handleDeleteAsset} 
                suggestedKeys={suggestedKeys}
              />
            ) : (
              <PlaywrightCodeGuide onInsertCode={handleInsertGuideCode} />
            )}
          </div>
        </div>
      </main>

      <ConfirmModal
        isOpen={confirmDeleteType !== null}
        title={confirmDeleteType === "step" ? "Delete Step" : "Delete Asset"}
        message={
          confirmDeleteType === "step"
            ? `Are you sure you want to delete Step ${(confirmDeleteIndex ?? 0) + 1}?`
            : "Are you sure you want to delete this asset? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setConfirmDeleteType(null);
          setConfirmDeleteIndex(null);
        }}
        isDanger={true}
      />
    </div>
  );
}
