"use client";

import { useState, useEffect, useMemo } from "react";

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
  onUpdateAsset?: (id: number, name: string, data: any, isNegative: boolean) => Promise<void> | void;
  onDeleteAsset: (id: number) => Promise<void> | void;
  suggestedKeys?: string[];
}

interface TableRow {
  id: number | string;
  name: string;
  is_negative: boolean;
  data: Record<string, string>;
  isNew?: boolean;
  isDirty?: boolean;
}

export default function AssetManager({
  assets,
  submittingAsset,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  suggestedKeys = [],
}: AssetManagerProps) {
  // Table state
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [newColInput, setNewColInput] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [rowSaving, setRowSaving] = useState<Record<string | number, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [viewMode, setViewMode] = useState<"excel" | "cards">("excel");

  // Collapsible Form / JSON Importer state
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [keyValuePairs, setKeyValuePairs] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [rawJson, setRawJson] = useState('{\n  "username": "admin",\n  "password": "password123"\n}');
  const [isNegative, setIsNegative] = useState(false);

  // Compute all unique variable columns across suggestedKeys, existing assets, and custom added columns
  const allColumns = useMemo(() => {
    const colSet = new Set<string>();
    suggestedKeys.forEach((k) => {
      const clean = k.trim().replace(/^\[+|\]+$/g, "");
      if (clean) colSet.add(clean);
    });
    assets.forEach((a) => {
      if (a.data && typeof a.data === "object" && !Array.isArray(a.data)) {
        Object.keys(a.data).forEach((k) => {
          const clean = k.trim();
          if (clean) colSet.add(clean);
        });
      }
    });
    customColumns.forEach((k) => {
      const clean = k.trim();
      if (clean) colSet.add(clean);
    });
    return Array.from(colSet);
  }, [suggestedKeys, assets, customColumns]);

  // Sync tableRows with assets prop, preserving any ongoing unsaved edits or newly added rows
  useEffect(() => {
    setTableRows((prevRows) => {
      const newUnsavedRows = prevRows.filter((r) => r.isNew);
      const updatedAssets: TableRow[] = assets.map((asset) => {
        const existingDirty = prevRows.find((r) => r.id === asset.id && r.isDirty);
        if (existingDirty) {
          return existingDirty;
        }
        const dataObj: Record<string, string> = {};
        if (asset.data && typeof asset.data === "object" && !Array.isArray(asset.data)) {
          Object.entries(asset.data).forEach(([k, v]) => {
            dataObj[k] = v !== null && v !== undefined ? String(v) : "";
          });
        }
        return {
          id: asset.id,
          name: asset.name,
          is_negative: asset.is_negative || false,
          data: dataObj,
          isDirty: false,
        };
      });
      return [...updatedAssets, ...newUnsavedRows];
    });
  }, [assets]);

  // Pre-populate visual form keys when suggestedKeys changes and not editing
  useEffect(() => {
    if (editingAssetId === null && suggestedKeys.length > 0) {
      const allEmpty = keyValuePairs.every((p) => p.value === "");
      if (allEmpty) {
        const initialPairs = suggestedKeys.map((key) => ({
          key: key.replace(/^\[+|\]+$/g, ""),
          value: "",
        }));
        setKeyValuePairs(initialPairs);
      }
    }
  }, [suggestedKeys, editingAssetId]);

  // Table Handlers
  const handleCellChange = (rowId: number | string, col: string, value: string) => {
    setTableRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            isDirty: true,
            data: {
              ...r.data,
              [col]: value,
            },
          };
        }
        return r;
      })
    );
  };

  const handleNameChange = (rowId: number | string, name: string) => {
    setTableRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, name, isDirty: true } : r))
    );
  };

  const handleToggleStatus = (rowId: number | string) => {
    setTableRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, is_negative: !r.is_negative, isDirty: true } : r
      )
    );
  };

  const handleAddTableRow = () => {
    const nextNum = tableRows.length + 1;
    const initialData: Record<string, string> = {};
    allColumns.forEach((col) => {
      initialData[col] = "";
    });
    const newRow: TableRow = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `set_${nextNum}`,
      is_negative: false,
      data: initialData,
      isNew: true,
      isDirty: true,
    };
    setTableRows((prev) => [...prev, newRow]);
  };

  const handleSaveRow = async (row: TableRow) => {
    if (!row.name.trim()) {
      alert("Please provide an asset name.");
      return;
    }

    const finalData: Record<string, any> = {};
    Object.entries(row.data).forEach(([k, v]) => {
      if (!k.trim()) return;
      const trimmedVal = typeof v === "string" ? v.trim() : "";
      if (trimmedVal === "true") finalData[k.trim()] = true;
      else if (trimmedVal === "false") finalData[k.trim()] = false;
      else if (!isNaN(Number(trimmedVal)) && trimmedVal !== "") {
        finalData[k.trim()] = Number(trimmedVal);
      } else {
        finalData[k.trim()] = v;
      }
    });

    setRowSaving((prev) => ({ ...prev, [row.id]: true }));
    try {
      if (row.isNew) {
        await onAddAsset(row.name, finalData, row.is_negative);
      } else if (onUpdateAsset) {
        await onUpdateAsset(row.id as number, row.name, finalData, row.is_negative);
      }
      setTableRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, isDirty: false, isNew: false } : r))
      );
    } catch (err: any) {
      alert(err.message || "Failed to save asset row");
    } finally {
      setRowSaving((prev) => ({ ...prev, [row.id]: false }));
    }
  };

  const handleSaveAll = async () => {
    const dirtyRows = tableRows.filter((r) => r.isDirty);
    if (dirtyRows.length === 0) return;

    setSavingAll(true);
    try {
      for (const row of dirtyRows) {
        await handleSaveRow(row);
      }
    } finally {
      setSavingAll(false);
    }
  };

  const handleDeleteTableRow = async (row: TableRow) => {
    if (row.isNew) {
      setTableRows((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }
    await onDeleteAsset(row.id as number);
  };

  const handleAddColumnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newColInput.trim().replace(/^\[+|\]+$/g, "");
    if (!clean) return;
    if (!customColumns.includes(clean) && !allColumns.includes(clean)) {
      setCustomColumns((prev) => [...prev, clean]);
    }
    setNewColInput("");
    setShowAddCol(false);
  };

  const handleSyncFlowVariables = () => {
    suggestedKeys.forEach((key) => {
      const clean = key.trim().replace(/^\[+|\]+$/g, "");
      if (clean && !customColumns.includes(clean) && !allColumns.includes(clean)) {
        setCustomColumns((prev) => [...prev, clean]);
      }
    });
  };

  // Form Editor Handlers
  const handleStartEdit = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setAssetName(asset.name);
    setIsNegative(asset.is_negative || false);

    if (asset.data && typeof asset.data === "object" && !Array.isArray(asset.data)) {
      const pairs = Object.entries(asset.data).map(([k, v]) => ({
        key: k,
        value: v !== null && v !== undefined ? String(v) : "",
      }));
      setKeyValuePairs(pairs.length > 0 ? pairs : [{ key: "", value: "" }]);
      setRawJson(JSON.stringify(asset.data, null, 2));
    } else {
      setKeyValuePairs([{ key: "", value: "" }]);
      setRawJson(typeof asset.data === "string" ? asset.data : JSON.stringify(asset.data || {}, null, 2));
    }

    setShowAdvancedForm(true);
    const formElement = document.getElementById("asset-form-container");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCancelFormEdit = () => {
    setEditingAssetId(null);
    setAssetName("");
    setKeyValuePairs(
      suggestedKeys.length > 0
        ? suggestedKeys.map((key) => ({ key: key.replace(/^\[+|\]+$/g, ""), value: "" }))
        : [{ key: "", value: "" }]
    );
    setRawJson('{\n  "username": "admin",\n  "password": "password123"\n}');
    setIsNegative(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalData: any = {};
    if (activeTab === "visual") {
      const activePairs = keyValuePairs.filter((p) => p.key.trim() !== "");
      if (activePairs.length === 0) {
        alert("Please add at least one valid key-value variable.");
        return;
      }
      activePairs.forEach((pair) => {
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
      if (editingAssetId !== null && onUpdateAsset) {
        await onUpdateAsset(editingAssetId, assetName, finalData, isNegative);
        setEditingAssetId(null);
      } else {
        await onAddAsset(assetName, finalData, isNegative);
      }

      handleCancelFormEdit();
      setShowAdvancedForm(false);
    } catch (err: any) {
      alert(err.message || "Failed to save data set");
    }
  };

  const dirtyCount = tableRows.filter((r) => r.isDirty).length;

  return (
    <section className="space-y-6">
      {/* EXCEL SPREADSHEET TABLE (MAIN COMPONENT) */}
      <div className="bg-white border border-zinc-200/90 rounded-3xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/40">
          <div className="flex items-center gap-2">
            {dirtyCount > 0 && (
              <span className="text-amber-700 font-semibold bg-amber-100/80 border border-amber-200 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{dirtyCount} unsaved row{dirtyCount === 1 ? "" : "s"}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dirtyCount > 0 && (
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={savingAll}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 transition-all shadow-sm shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5 animate-in fade-in"
              >
                {savingAll ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Save All ({dirtyCount})</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleAddTableRow}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 transition-all shadow-sm shadow-red-500/20 active:scale-95 flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Add Row</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddCol(!showAddCol)}
              className="rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200/80 text-zinc-700 text-xs font-semibold px-3 py-2 transition-all flex items-center gap-1"
            >
              <span>+</span>
              <span>Add Variable</span>
            </button>

            {suggestedKeys.length > 0 && (
              <button
                type="button"
                onClick={handleSyncFlowVariables}
                className="rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2 transition-all flex items-center gap-1"
                title="Add columns for all variables detected in Playwright script"
              >
                <span>🔄</span>
                <span>Sync Flow Vars</span>
              </button>
            )}

            {/* View Mode Switcher */}
            <div className="bg-zinc-100 p-0.5 rounded-xl border border-zinc-200 flex items-center">
              <button
                type="button"
                onClick={() => setViewMode("excel")}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "excel"
                    ? "bg-white text-red-600 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
                title="Spreadsheet Table View"
              >
                📊 Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "cards"
                    ? "bg-white text-red-600 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
                title="Cards / JSON View"
              >
                📋 Cards
              </button>
            </div>
          </div>
        </div>

        {/* Inline Add Column Form */}
        {showAddCol && (
          <form
            onSubmit={handleAddColumnSubmit}
            className="p-4 bg-red-50/40 border-b border-red-100 flex items-center gap-3 animate-in fade-in duration-150"
          >
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
              Add New Variable Column:
            </span>
            <input
              type="text"
              value={newColInput}
              onChange={(e) => setNewColInput(e.target.value)}
              placeholder="e.g., username, password, product_name"
              className="bg-white border border-red-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3 py-1.5 text-xs text-zinc-900 font-mono outline-none w-64"
              autoFocus
            />
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all"
            >
              Add Column
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddCol(false);
                setNewColInput("");
              }}
              className="text-zinc-400 hover:text-zinc-700 text-xs px-2 py-1"
            >
              Cancel
            </button>
          </form>
        )}

        {/* TABLE VIEW */}
        {viewMode === "excel" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-3 text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-wider text-center w-12 border-r border-zinc-200/80">
                    #
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-zinc-600 tracking-wider w-44 border-r border-zinc-200/80">
                    Asset
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-zinc-600 tracking-wider w-36 border-r border-zinc-200/80">
                    Status
                  </th>
                  {allColumns.length === 0 ? (
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-zinc-400 tracking-wider border-r border-zinc-200/80">
                      Variables (Click &quot;+ Add Variable&quot; or &quot;Sync Flow Vars&quot;)
                    </th>
                  ) : (
                    allColumns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-[10px] font-bold uppercase text-red-600 tracking-wider font-mono border-r border-zinc-200/80 min-w-[150px]"
                      >
                        <span className="flex items-center justify-between gap-1">
                          <span>🏷️ {col}</span>
                        </span>
                      </th>
                    ))
                  )}
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-zinc-500 tracking-wider text-right w-28">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80">
                {tableRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4 + Math.max(allColumns.length, 1)}
                      className="p-12 text-center text-zinc-400 text-xs"
                    >
                      <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 border border-red-100">
                        📊
                      </div>
                      <p className="font-bold text-zinc-900 text-sm mb-1">No data set rows yet</p>
                      <p className="text-zinc-500 mb-4">
                        Add rows to create parameterized datasets like in Excel.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddTableRow}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 shadow-xs transition-all"
                      >
                        <span>+</span>
                        <span>Add First Row</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row, idx) => {
                    const isSaving = !!rowSaving[row.id];

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-zinc-50/70 transition-colors group ${
                          row.isDirty ? "bg-amber-50/20" : ""
                        }`}
                      >
                        {/* Row Index */}
                        <td className="px-3 py-2.5 text-center text-xs font-mono text-zinc-400 font-bold border-r border-zinc-200/70 select-none bg-zinc-50/40">
                          {idx + 1}
                        </td>

                        {/* Asset Name */}
                        <td className="p-1.5 border-r border-zinc-200/70">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleNameChange(row.id, e.target.value)}
                            placeholder={`set_${idx + 1}`}
                            className="w-full bg-transparent hover:bg-zinc-100/60 focus:bg-white border border-transparent hover:border-zinc-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-900 outline-none transition-all"
                          />
                        </td>

                        {/* Status (Active / Not Active) */}
                        <td className="p-1.5 border-r border-zinc-200/70">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(row.id)}
                            className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-between border ${
                              !row.is_negative
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200"
                            }`}
                            title="Click to toggle Active / Not Active (Positive vs Negative test)"
                          >
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  !row.is_negative ? "bg-emerald-600" : "bg-zinc-400"
                                }`}
                              />
                              <span>{!row.is_negative ? "Active" : "Not Active"}</span>
                            </span>
                            <span className="text-[10px] opacity-60">⇄</span>
                          </button>
                        </td>

                        {/* Variable Columns */}
                        {allColumns.length === 0 ? (
                          <td className="p-2 border-r border-zinc-200/70 text-zinc-400 text-xs italic">
                            No variables added yet
                          </td>
                        ) : (
                          allColumns.map((col) => (
                            <td key={col} className="p-1.5 border-r border-zinc-200/70">
                              <input
                                type="text"
                                value={row.data[col] ?? ""}
                                onChange={(e) => handleCellChange(row.id, col, e.target.value)}
                                placeholder="Value"
                                className="w-full bg-transparent hover:bg-zinc-100/60 focus:bg-white border border-transparent hover:border-zinc-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-800 outline-none transition-all"
                              />
                            </td>
                          ))
                        )}

                        {/* Row Actions */}
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {row.isDirty ? (
                              <button
                                type="button"
                                onClick={() => handleSaveRow(row)}
                                disabled={isSaving}
                                className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-2.5 py-1 shadow-xs transition-all active:scale-95 flex items-center gap-1"
                              >
                                {isSaving ? (
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <span>Save</span>
                                )}
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-medium px-1 select-none">
                                ✓
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteTableRow(row)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Row"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARDS VIEW */
          <div className="p-5 sm:p-6 space-y-3">
            {assets.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs italic">
                No saved data sets yet.
              </div>
            ) : (
              assets.map((asset) => {
                const isEditing = editingAssetId === asset.id;
                return (
                  <div
                    key={asset.id}
                    className={`border rounded-2xl p-4 flex justify-between items-start transition-all shadow-xs ${
                      isEditing
                        ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/10"
                        : "border-zinc-200 hover:border-red-300 bg-white"
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xs font-bold text-zinc-900 truncate">{asset.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            asset.is_negative
                              ? "bg-zinc-100 text-zinc-600 border border-zinc-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {!asset.is_negative ? "Active" : "Not Active"}
                        </span>
                      </div>
                      <pre className="text-[11px] text-zinc-700 bg-zinc-50 p-3 rounded-xl font-mono overflow-auto max-h-36 border border-zinc-200 leading-relaxed">
                        {JSON.stringify(asset.data, null, 2)}
                      </pre>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(asset)}
                        className="rounded-xl px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 transition-all flex items-center gap-1"
                        title="Edit via Form"
                      >
                        <span>✏️</span>
                        <span>Form</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAsset(asset.id)}
                        className="text-zinc-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
                        title="Delete Data Set"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Table Bottom Action Bar */}
        <div className="p-3.5 bg-zinc-50/70 border-t border-zinc-200/80 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-3 font-medium">
            <span>Total: {tableRows.length} dataset{tableRows.length === 1 ? "" : "s"}</span>
            {dirtyCount > 0 && (
              <span className="text-amber-700 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-md text-[11px]">
                {dirtyCount} unsaved row{dirtyCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddTableRow}
            className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 hover:underline active:scale-95 transition-all"
          >
            <span>+ Add New Dataset Row</span>
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE ADVANCED FORM / JSON BUILDER */}
      <div className="bg-white border border-zinc-200/90 rounded-3xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowAdvancedForm(!showAdvancedForm)}
          className="w-full p-5 flex items-center justify-between hover:bg-zinc-50/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">📝</span>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Form Builder & Raw JSON Importer
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Paste raw JSON or use key-value builder to import larger datasets.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-red-600 px-3 py-1 bg-red-50 rounded-lg border border-red-200">
            {showAdvancedForm ? "Hide Form ▲" : "Open Form ▼"}
          </span>
        </button>

        {showAdvancedForm && (
          <div id="asset-form-container" className="p-6 border-t border-zinc-100 space-y-5 bg-zinc-50/20">
            <form onSubmit={handleFormSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-zinc-600 mb-2">
                  Data Set Name
                </label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 px-4 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none transition-all font-sans"
                  placeholder="e.g., set_1, Standard User Dataset"
                  required
                />
              </div>

              {/* Toggle Tab */}
              <div className="bg-zinc-100 p-1 rounded-xl border border-zinc-200 inline-flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("visual")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                    activeTab === "visual"
                      ? "bg-white text-red-600 font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Visual Builder
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("json")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                    activeTab === "json"
                      ? "bg-white text-red-600 font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Raw JSON
                </button>
              </div>

              {activeTab === "visual" ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-zinc-600">
                      Key-Value Pairs
                    </span>
                    <button
                      type="button"
                      onClick={() => setKeyValuePairs([...keyValuePairs, { key: "", value: "" }])}
                      className="rounded-xl px-3 py-1 text-[11px] font-semibold bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all shadow-2xs"
                    >
                      + Add Variable
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {keyValuePairs.map((pair, idx) => (
                      <div key={idx} className="flex gap-2 items-center group">
                        <input
                          type="text"
                          placeholder="Variable (Key)"
                          value={pair.key}
                          onChange={(e) => {
                            const newPairs = [...keyValuePairs];
                            newPairs[idx].key = e.target.value;
                            setKeyValuePairs(newPairs);
                          }}
                          className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3.5 py-2 text-xs text-zinc-900 outline-none font-mono"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={pair.value}
                          onChange={(e) => {
                            const newPairs = [...keyValuePairs];
                            newPairs[idx].value = e.target.value;
                            setKeyValuePairs(newPairs);
                          }}
                          className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3.5 py-2 text-xs text-zinc-900 outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newPairs = keyValuePairs.filter((_, i) => i !== idx);
                            setKeyValuePairs(newPairs.length ? newPairs : [{ key: "", value: "" }]);
                          }}
                          className="text-zinc-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-zinc-600 mb-1">
                    JSON Structure
                  </label>
                  <textarea
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    rows={5}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl px-4 py-3 text-zinc-800 font-mono text-xs outline-none resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* Status checkbox */}
              <div className="flex items-center gap-3 bg-red-50/50 border border-red-200/70 rounded-2xl p-4">
                <input
                  type="checkbox"
                  id="isNegative"
                  checked={isNegative}
                  onChange={(e) => setIsNegative(e.target.checked)}
                  className="w-4 h-4 rounded bg-white border-red-300 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                />
                <label htmlFor="isNegative" className="text-xs font-semibold text-zinc-900 cursor-pointer select-none">
                  Mark as Negative Testing (Not Active flow / Vulnerability payload)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {editingAssetId !== null && (
                  <button
                    type="button"
                    onClick={handleCancelFormEdit}
                    className="flex-1 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-200 font-semibold py-2.5 text-xs transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingAsset}
                  className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 text-xs transition-all shadow-md shadow-red-500/20 active:scale-95 disabled:opacity-50"
                >
                  {submittingAsset
                    ? "Saving..."
                    : editingAssetId !== null
                    ? "Update Dataset"
                    : "Add Dataset via Form"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
