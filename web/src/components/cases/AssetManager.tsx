"use client";

import { useState, useEffect } from "react";

interface Asset {
  id: number;
  name: string;
  data: any;
  is_negative: boolean;
}

interface AssetManagerProps {
  assets: Asset[];
  submittingAsset: boolean;
  onAddAsset: (name: string, data: any, isNegative: boolean) => Promise<void> | void;
  onDeleteAsset: (id: number) => Promise<void> | void;
  suggestedKeys?: string[];
}

export default function AssetManager({
  assets,
  submittingAsset,
  onAddAsset,
  onDeleteAsset,
  suggestedKeys = [],
}: AssetManagerProps) {
  const [assetName, setAssetName] = useState("");
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");

  // Visual Editor State
  const [keyValuePairs, setKeyValuePairs] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);

  // JSON Editor State
  const [rawJson, setRawJson] = useState('{\n  "username": "admin",\n  "password": "password123"\n}');
  const [isNegative, setIsNegative] = useState(false);

  // Pre-populate visual keys when suggestedKeys changes
  useEffect(() => {
    if (suggestedKeys.length > 0 && keyValuePairs.length === 1 && keyValuePairs[0].key === "") {
      const initialPairs = suggestedKeys.map((key) => ({ key, value: "" }));
      setKeyValuePairs(initialPairs);
    }
  }, [suggestedKeys]);

  const handleAddRow = () => {
    setKeyValuePairs([...keyValuePairs, { key: "", value: "" }]);
  };

  const handleRemoveRow = (index: number) => {
    const newPairs = [...keyValuePairs];
    newPairs.splice(index, 1);
    // Keep at least one row
    if (newPairs.length === 0) {
      newPairs.push({ key: "", value: "" });
    }
    setKeyValuePairs(newPairs);
  };

  const handleRowChange = (index: number, field: "key" | "value", value: string) => {
    const newPairs = [...keyValuePairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    setKeyValuePairs(newPairs);
  };

  const handleAddSuggestedKey = (key: string) => {
    // Check if key already exists
    const exists = keyValuePairs.some((p) => p.key.trim() === key);
    if (exists) return;

    // Replace first empty row or append
    if (keyValuePairs.length === 1 && keyValuePairs[0].key === "") {
      setKeyValuePairs([{ key, value: "" }]);
    } else {
      setKeyValuePairs([...keyValuePairs, { key, value: "" }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalData: any = {};

    if (activeTab === "visual") {
      const activePairs = keyValuePairs.filter((p) => p.key.trim() !== "");
      if (activePairs.length === 0) {
        alert("Please add at least one valid key-value variable.");
        return;
      }
      activePairs.forEach((pair) => {
        // Try parsing numbers or booleans automatically for cleaner JSON, otherwise store as string
        const trimmedVal = pair.value.trim();
        if (trimmedVal === "true") finalData[pair.key.trim()] = true;
        else if (trimmedVal === "false") finalData[pair.key.trim()] = false;
        else if (!isNaN(Number(trimmedVal)) && trimmedVal !== "") {
          finalData[pair.key.trim()] = Number(trimmedVal);
        } else {
          finalData[pair.key.trim()] = pair.value;
        }
      });
    } else {
      try {
        finalData = JSON.parse(rawJson);
      } catch (err) {
        alert("Invalid JSON format in the Advanced Editor.");
        return;
      }
    }

    try {
      await onAddAsset(assetName, finalData, isNegative);
      // Reset form
      setAssetName("");
      setKeyValuePairs(suggestedKeys.length > 0 
        ? suggestedKeys.map((key) => ({ key, value: "" }))
        : [{ key: "", value: "" }]
      );
      setRawJson('{\n  "username": "admin",\n  "password": "password123"\n}');
      setIsNegative(false);
    } catch (err: any) {
      alert(err.message || "Failed to create data set");
    }
  };

  return (
    <section className="space-y-8">
      {/* Form Container */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
        <header className="mb-6">
          <h2 className="text-xl font-bold">Add Data Set (Asset)</h2>
          <p className="text-xs text-gray-400 mt-1">Provide custom values for parameterized test runs</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Name input */}
          <div>
            <label className="block text-xs uppercase font-black text-gray-500 tracking-wider mb-2">Asset Name</label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all font-sans"
              placeholder="e.g., Happy Path User, SQL Injection Test"
              required
            />
          </div>

          {/* Suggested keys section */}
          {suggestedKeys.length > 0 && (
            <div className="space-y-2">
              <span className="block text-[10px] uppercase font-black text-gray-500 tracking-wider">
                Variable Suggestions from Flow:
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestedKeys.map((key) => {
                  const isAlreadyAdded = keyValuePairs.some((p) => p.key.trim() === key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleAddSuggestedKey(key)}
                      disabled={isAlreadyAdded}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                        isAlreadyAdded
                          ? "bg-gray-950/40 border-gray-900 text-gray-600 cursor-not-allowed"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/30"
                      }`}
                    >
                      🏷️ {key}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toggle Tab header */}
          <div className="border-b border-gray-800 flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("visual")}
              className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition-all ${
                activeTab === "visual" ? "text-blue-400" : "text-gray-500 hover:text-gray-400"
              }`}
            >
              Visual Builder
              {activeTab === "visual" && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("json")}
              className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition-all ${
                activeTab === "json" ? "text-blue-400" : "text-gray-500 hover:text-gray-400"
              }`}
            >
              Raw JSON
              {activeTab === "json" && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "visual" ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Variables</span>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                >
                  ➕ Add Variable
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {keyValuePairs.map((pair, idx) => (
                  <div key={idx} className="flex gap-3 items-center group">
                    <input
                      type="text"
                      placeholder="Variable (Key)"
                      value={pair.key}
                      onChange={(e) => handleRowChange(idx, "key", e.target.value)}
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={pair.value}
                      onChange={(e) => handleRowChange(idx, "value", e.target.value)}
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="text-gray-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Remove Row"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs uppercase font-black text-gray-500 tracking-wider mb-2">JSON Structure</label>
              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                rows={5}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white font-mono text-xs outline-none focus:border-blue-500 resize-none focus:ring-0"
              />
            </div>
          )}

          {/* Negative / Vulnerability checkbox */}
          <div className="flex items-center gap-3 bg-gray-950/40 p-4 border border-gray-850 rounded-2xl">
            <input
              type="checkbox"
              id="isNegative"
              checked={isNegative}
              onChange={(e) => setIsNegative(e.target.checked)}
              className="w-4.5 h-4.5 rounded bg-gray-950 border-gray-800 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isNegative" className="text-xs font-semibold text-gray-400 cursor-pointer select-none">
              Negative / Vulnerability Payload Data Set
              <span className="block text-[10px] text-gray-500 font-normal mt-0.5">Check this if you want to test logic bypass or SQL injections.</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submittingAsset}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] text-sm"
          >
            {submittingAsset ? "Adding..." : "Add Data Set"}
          </button>
        </form>
      </div>

      {/* Asset List */}
      <div className="space-y-4">
        <h2 className="text-sm uppercase font-black text-gray-500 tracking-wider px-2">Saved Data Sets ({assets.length})</h2>
        {assets.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center text-gray-500 text-sm italic">
            No custom data sets saved yet. Create one above!
          </div>
        ) : (
          <div className="space-y-4">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex justify-between items-start hover:border-gray-700 transition-all shadow-md">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-sm font-bold tracking-tight text-white">{asset.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        asset.is_negative
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      }`}
                    >
                      {asset.is_negative ? "Negative" : "Positive"}
                    </span>
                  </div>
                  <pre className="text-[10px] text-gray-400 bg-gray-950 p-4 rounded-2xl font-mono overflow-auto max-h-36 border border-gray-900">
                    {JSON.stringify(asset.data, null, 2)}
                  </pre>
                </div>
                <button
                  onClick={() => onDeleteAsset(asset.id)}
                  className="ml-4 p-2 text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-all"
                  title="Delete Data Set"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
