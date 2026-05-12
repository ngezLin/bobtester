"use client";

import { useEffect, useState, use } from "react";
import Sidebar from "@/components/common/Sidebar";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { caseService } from "@/api/cases";
import { assetService } from "@/api/assets";
import StepList from "@/components/cases/StepList";
import AssetManager from "@/components/cases/AssetManager";

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
  const [savingSteps, setSavingSteps] = useState(false);

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
        const parsedSteps = typeof caseData.case.steps === "string" 
          ? JSON.parse(caseData.case.steps) 
          : caseData.case.steps;
        setSteps(parsedSteps);
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

  const handleUpdateStep = (index: number, field: string, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleSaveSteps = async () => {
    setSavingSteps(true);
    try {
      const res = await caseService.updateCase(id, {
        name: caseDetails.name,
        target_url: caseDetails.target_url,
        steps: steps,
      });
      if (res.success) {
        alert("Steps updated successfully!");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save steps");
    } finally {
      setSavingSteps(false);
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await assetService.deleteAsset(assetId);
      fetchCaseAndAssets();
    } catch (err: any) {
      alert(err.message || "Failed to delete asset");
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />

      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <Link href="/cases" className="text-blue-500 hover:text-blue-400 mb-6 inline-block font-medium">
            ← Back to All Cases
          </Link>

          <header className="mb-10">
            <h1 className="text-3xl font-bold">Flow Configuration</h1>
            <p className="text-gray-400 mt-2">
              Managing: <span className="text-white font-semibold">{caseDetails?.name}</span>
            </p>
          </header>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8">
              {error}
            </div>
          )}

          <div className="grid lg:grid-cols-12 gap-8">
            <section className="lg:col-span-7">
              <StepList 
                steps={steps} 
                savingSteps={savingSteps} 
                onSave={handleSaveSteps} 
                onUpdateStep={handleUpdateStep} 
              />
            </section>

            <section className="lg:col-span-5">
              <AssetManager 
                assets={assets} 
                submittingAsset={submittingAsset} 
                onAddAsset={handleAddAsset} 
                onDeleteAsset={handleDeleteAsset} 
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
