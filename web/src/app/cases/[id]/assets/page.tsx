"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function AssetsPage() {
  const { id } = useParams();
  const [caseDetails, setCaseDetails] = useState<any>(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Form state for Assets
  const [assetName, setAssetName] = useState("");
  const [assetData, setAssetData] = useState('{\n  "username": "admin",\n  "password": "password123"\n}');
  const [isNegative, setIsNegative] = useState(false);
  const [submittingAsset, setSubmittingAsset] = useState(false);

  // State for Editing Steps
  const [steps, setSteps] = useState<any[]>([]);
  const [savingSteps, setSavingSteps] = useState(false);

  useEffect(() => {
    fetchCaseAndAssets();
  }, [id]);

  const fetchCaseAndAssets = async () => {
    const token = localStorage.getItem("token");
    try {
      const [caseRes, assetsRes] = await Promise.all([
        fetch(`http://localhost:4000/api/cases/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:4000/api/assets/case/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const caseData = await caseRes.json();
      const assetsData = await assetsRes.json();

      if (caseData.success) {
        setCaseDetails(caseData.case);
        // Parse steps if they are stringified
        const parsedSteps = typeof caseData.case.steps === "string" 
          ? JSON.parse(caseData.case.steps) 
          : caseData.case.steps;
        setSteps(parsedSteps);
      }
      if (assetsData.success) setAssets(assetsData.assets);
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAsset(true);
    const token = localStorage.getItem("token");

    try {
      const parsedData = JSON.parse(assetData);
      const response = await fetch(`http://localhost:4000/api/assets/case/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: assetName,
          data: parsedData,
          is_negative: isNegative,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAssetName("");
        setAssetData('{\n  "username": "admin",\n  "password": "password123"\n}');
        setIsNegative(false);
        fetchCaseAndAssets();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Invalid JSON data or server error");
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
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`http://localhost:4000/api/cases/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: caseDetails.name,
          target_url: caseDetails.target_url,
          steps: steps,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert("Steps updated successfully!");
      }
    } catch (err) {
      alert("Failed to save steps");
    } finally {
      setSavingSteps(false);
    }
  };

  const parameterizeValue = (index: number) => {
    const varName = prompt("Enter variable name (e.g., username):", "");
    if (varName) {
      handleUpdateStep(index, "value", `[${varName}]`);
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`http://localhost:4000/api/assets/${assetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCaseAndAssets();
    } catch (err) {
      alert("Failed to delete asset");
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

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left: Test Steps (6 cols) */}
            <section className="lg:col-span-7">
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Edit Test Steps</h2>
                  <button
                    onClick={handleSaveSteps}
                    disabled={savingSteps}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all"
                  >
                    {savingSteps ? "Saving..." : "Save Changes"}
                  </button>
                </div>
                
                <p className="text-sm text-gray-500 mb-8 bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl">
                  💡 Use <code className="text-blue-400">[variable_name]</code> to parameterize values. 
                  Then add Assets with matching JSON keys to run multiple data sets.
                </p>

                <div className="space-y-4">
                  {steps.map((step, idx) => (
                    <div key={idx} className="bg-gray-800/50 border border-gray-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase">Step {idx + 1}: {step.action}</span>
                        {step.action === "fill" && (
                          <button 
                            onClick={() => parameterizeValue(idx)}
                            className="text-[10px] text-blue-500 hover:underline font-bold"
                          >
                            ⚡ Parameterize
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase mb-1">Selector</label>
                          <input
                            type="text"
                            value={step.selector || ""}
                            onChange={(e) => handleUpdateStep(idx, "selector", e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-300"
                          />
                        </div>
                        {step.value !== undefined && (
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Value</label>
                            <input
                              type="text"
                              value={step.value}
                              onChange={(e) => handleUpdateStep(idx, "value", e.target.value)}
                              className={`w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono ${step.value.toString().startsWith("[") ? "text-blue-400 font-bold" : "text-gray-300"}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Right: Assets & History (5 cols) */}
            <section className="lg:col-span-5 space-y-8">
              {/* Asset Form */}
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
                <h2 className="text-xl font-bold mb-6">Add Data Set (Asset)</h2>
                <form onSubmit={handleAddAsset} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Asset Name</label>
                    <input
                      type="text"
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Valid Admin User"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Data (JSON)</label>
                    <textarea
                      value={assetData}
                      onChange={(e) => setAssetData(e.target.value)}
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isNegative"
                      checked={isNegative}
                      onChange={(e) => setIsNegative(e.target.checked)}
                      className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isNegative" className="text-sm font-medium text-gray-400">
                      Negative/Vulnerability set
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingAsset}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                  >
                    {submittingAsset ? "Adding..." : "Add Data Set"}
                  </button>
                </form>
              </div>

              {/* Asset List */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold px-2">Saved Assets</h2>
                {assets.length === 0 ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 text-center text-gray-500 text-sm italic">
                    No assets yet.
                  </div>
                ) : (
                  assets.map((asset: any) => (
                    <div key={asset.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-bold">{asset.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${asset.is_negative ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                            {asset.is_negative ? "Negative" : "Positive"}
                          </span>
                        </div>
                        <pre className="text-[10px] text-gray-500 bg-gray-950 p-3 rounded-lg font-mono">
                          {JSON.stringify(asset.data)}
                        </pre>
                      </div>
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="ml-4 p-2 text-gray-600 hover:text-red-500 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
