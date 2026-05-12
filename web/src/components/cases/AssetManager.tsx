"use client";

import { useState } from "react";

interface Asset {
  id: number;
  name: string;
  data: any;
  is_negative: boolean;
}

interface AssetManagerProps {
  assets: Asset[];
  submittingAsset: boolean;
  onAddAsset: (name: string, data: any, isNegative: boolean) => Promise<void>;
  onDeleteAsset: (id: number) => Promise<void>;
}

export default function AssetManager({ assets, submittingAsset, onAddAsset, onDeleteAsset }: AssetManagerProps) {
  const [assetName, setAssetName] = useState("");
  const [assetData, setAssetData] = useState('{\n  "username": "admin",\n  "password": "password123"\n}');
  const [isNegative, setIsNegative] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedData = JSON.parse(assetData);
      await onAddAsset(assetName, parsedData, isNegative);
      setAssetName("");
      setAssetData('{\n  "username": "admin",\n  "password": "password123"\n}');
      setIsNegative(false);
    } catch (err) {
      alert("Invalid JSON data");
    }
  };

  return (
    <section className="space-y-8">
      {/* Asset Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
        <h2 className="text-xl font-bold mb-6">Add Data Set (Asset)</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
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
          assets.map((asset) => (
            <div key={asset.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-bold">{asset.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${asset.is_negative ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                    {asset.is_negative ? "Negative" : "Positive"}
                  </span>
                </div>
                <pre className="text-[10px] text-gray-500 bg-gray-950 p-3 rounded-lg font-mono overflow-auto max-h-32">
                  {JSON.stringify(asset.data, null, 2)}
                </pre>
              </div>
              <button
                onClick={() => onDeleteAsset(asset.id)}
                className="ml-4 p-2 text-gray-600 hover:text-red-500 transition-colors"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
