"use client";

import { useState, useEffect, useMemo } from "react";
import { assetService } from "@/api/assets";

interface Asset {
  id: number;
  name: string;
  data: any;
  is_negative: boolean;
}

interface TableRow {
  id: number | string;
  name: string;
  is_negative: boolean;
  data: Record<string, string>;
  isNew?: boolean;
  isDirty?: boolean;
}

interface DatasetGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCase: {
    id: number;
    name: string;
    target_url: string;
    steps?: any;
    test_assets?: Asset[];
  } | null;
  onRefresh: () => Promise<void> | void;
}

export default function DatasetGridModal({
  isOpen,
  onClose,
  testCase,
  onRefresh,
}: DatasetGridModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [newColInput, setNewColInput] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [rowSaving, setRowSaving] = useState<Record<string | number, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"excel" | "cards">("excel");

  // Load assets when modal opens or testCase changes
  useEffect(() => {
    if (isOpen && testCase?.id) {
      loadAssets();
    }
  }, [isOpen, testCase?.id]);

  const loadAssets = async () => {
    if (!testCase?.id) return;
    setLoading(true);
    try {
      const res = await assetService.getAssetsByCase(testCase.id);
      if (res.success && Array.isArray(res.assets)) {
        setAssets(res.assets);
        populateRows(res.assets);
      } else if (testCase.test_assets) {
        setAssets(testCase.test_assets);
        populateRows(testCase.test_assets);
      }
    } catch (err) {
      console.error("Failed to load assets", err);
      if (testCase.test_assets) {
        setAssets(testCase.test_assets);
        populateRows(testCase.test_assets);
      }
    } finally {
      setLoading(false);
    }
  };

  const populateRows = (sourceAssets: Asset[]) => {
    const rows: TableRow[] = sourceAssets.map((asset) => {
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
    setTableRows(rows);
  };

  // Compute all unique variable columns across assets, test case steps, and custom added columns
  const allColumns = useMemo(() => {
    const colSet = new Set<string>();

    // Detect bracketed variables from test case steps if available
    if (testCase?.steps && Array.isArray(testCase.steps)) {
      testCase.steps.forEach((s: any) => {
        const val = s.value || s.selector || "";
        const matches = String(val).match(/\[([a-zA-Z0-9_-]+)\]/g);
        if (matches) {
          matches.forEach((m: string) => colSet.add(m.replace(/^\[+|\]+$/g, "")));
        }
      });
    }

    // Detect keys from all assets
    assets.forEach((a) => {
      if (a.data && typeof a.data === "object" && !Array.isArray(a.data)) {
        Object.keys(a.data).forEach((k) => {
          const clean = k.trim();
          if (clean) colSet.add(clean);
        });
      }
    });

    // Detect custom columns added during this session
    customColumns.forEach((k) => {
      const clean = k.trim();
      if (clean) colSet.add(clean);
    });

    return Array.from(colSet);
  }, [testCase, assets, customColumns]);

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
      is_negative: false, // Active by default
      data: initialData,
      isNew: true,
      isDirty: true,
    };
    setTableRows((prev) => [...prev, newRow]);
  };

  const handleSaveRow = async (row: TableRow) => {
    if (!testCase?.id) return;
    if (!row.name.trim()) {
      alert("Please provide a dataset name.");
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
        const res = await assetService.addAsset(testCase.id, {
          name: row.name.trim(),
          data: finalData,
          is_negative: row.is_negative,
        });
        if (!res.success) throw new Error(res.message || "Failed to add dataset");
      } else {
        const res = await assetService.updateAsset(row.id, {
          name: row.name.trim(),
          data: finalData,
          is_negative: row.is_negative,
        });
        if (!res.success) throw new Error(res.message || "Failed to update dataset");
      }

      // Reload assets from backend
      const updated = await assetService.getAssetsByCase(testCase.id);
      if (updated.success && Array.isArray(updated.assets)) {
        setAssets(updated.assets);
        setTableRows((prev) => {
          const unsavedOtherNewRows = prev.filter((r) => r.isNew && r.id !== row.id);
          const freshRows: TableRow[] = updated.assets.map((asset: any) => {
            const dataObj: Record<string, string> = {};
            if (asset.data && typeof asset.data === "object" && !Array.isArray(asset.data)) {
              Object.entries(asset.data).forEach(([k, v]) => {
                dataObj[k] = v !== null && v !== undefined ? String(v) : "";
              });
            }
            // Preserve dirty state if another row had unsaved changes
            const existingDirty = prev.find((r) => r.id === asset.id && r.isDirty && r.id !== row.id);
            if (existingDirty) return existingDirty;

            return {
              id: asset.id,
              name: asset.name,
              is_negative: asset.is_negative || false,
              data: dataObj,
              isDirty: false,
            };
          });
          return [...freshRows, ...unsavedOtherNewRows];
        });
      }
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to save dataset row");
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
    if (!confirm(`Are you sure you want to delete dataset "${row.name}"?`)) return;
    try {
      await assetService.deleteAsset(row.id);
      const updated = await assetService.getAssetsByCase(testCase!.id);
      if (updated.success && Array.isArray(updated.assets)) {
        setAssets(updated.assets);
        populateRows(updated.assets);
      }
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete dataset");
    }
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

  if (!isOpen || !testCase) return null;

  const dirtyCount = tableRows.filter((r) => r.isDirty).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h3 className="text-lg font-bold text-zinc-900">
                Data Sets: {testCase.name}
              </h3>
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">
                #{testCase.id}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate max-w-lg">
              {testCase.target_url}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-2 rounded-xl hover:bg-zinc-100 transition-colors text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Spreadsheet Grid
            </span>
            <span className="text-[11px] font-medium text-zinc-400">
              ({tableRows.length} dataset{tableRows.length === 1 ? "" : "s"})
            </span>
            {dirtyCount > 0 && (
              <span className="text-amber-700 font-semibold bg-amber-100/90 border border-amber-200 px-2.5 py-0.5 rounded-lg text-xs flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
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
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
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
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Add Row</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddCol(!showAddCol)}
              className="rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold px-3 py-2 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>+</span>
              <span>Add Variable</span>
            </button>

            {/* View Mode Switcher */}
            <div className="bg-zinc-200/70 p-0.5 rounded-xl border border-zinc-200 flex items-center">
              <button
                type="button"
                onClick={() => setViewMode("excel")}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
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
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-red-600 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
                title="Cards View"
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
            className="p-3.5 bg-red-50/50 border-b border-red-100 flex items-center gap-3 animate-in fade-in duration-150"
          >
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
              Add New Variable Column:
            </span>
            <input
              type="text"
              value={newColInput}
              onChange={(e) => setNewColInput(e.target.value)}
              placeholder="e.g., username, password, product_name"
              className="bg-white border border-red-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3 py-1.5 text-xs text-zinc-900 font-mono outline-none w-64 shadow-2xs"
              autoFocus
            />
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Add Column
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddCol(false);
                setNewColInput("");
              }}
              className="text-zinc-400 hover:text-zinc-700 text-xs px-2 py-1 cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Body Content */}
        <div className="overflow-auto flex-1 p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs uppercase tracking-wider font-semibold">Loading datasets...</p>
            </div>
          ) : viewMode === "excel" ? (
            <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-zinc-50/80 border-b border-zinc-200">
                      <th className="px-3 py-3 text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-wider text-center w-12 border-r border-zinc-200/80">
                        #
                      </th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase text-zinc-600 tracking-wider w-44 border-r border-zinc-200/80">
                        Asset / Dataset Name
                      </th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase text-zinc-600 tracking-wider w-36 border-r border-zinc-200/80">
                        Status
                      </th>
                      {allColumns.length === 0 ? (
                        <th className="px-4 py-3 text-[10px] font-bold uppercase text-zinc-400 tracking-wider border-r border-zinc-200/80">
                          Variables (Click &quot;+ Add Variable&quot; to add columns)
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
                          <p className="font-bold text-zinc-900 text-sm mb-1">
                            No dataset rows configured yet
                          </p>
                          <p className="text-zinc-500 mb-4">
                            Add rows to create parameterized datasets like in Excel.
                          </p>
                          <button
                            type="button"
                            onClick={handleAddTableRow}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 shadow-xs transition-all cursor-pointer"
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
                                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                                  !row.is_negative
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200"
                                }`}
                                title="Click to toggle Active / Not Active"
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
                                    className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-2.5 py-1 shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                  >
                                    {isSaving ? (
                                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <span>Save</span>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-xs text-emerald-600 font-bold px-1.5 select-none" title="Saved">
                                    ✓
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteTableRow(row)}
                                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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

              {/* Table Bottom Action Bar */}
              <div className="p-3 bg-zinc-50/70 border-t border-zinc-200/80 flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-3 font-medium">
                  <span>Total: {tableRows.length} dataset{tableRows.length === 1 ? "" : "s"}</span>
                  {dirtyCount > 0 && (
                    <span className="text-amber-700 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-md text-[11px]">
                      {dirtyCount} unsaved
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddTableRow}
                  className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>+ Add New Dataset Row</span>
                </button>
              </div>
            </div>
          ) : (
            /* Cards View */
            <div className="space-y-3">
              {assets.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-xs italic bg-white border border-zinc-200 rounded-2xl">
                  No saved datasets yet.
                </div>
              ) : (
                assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 font-mono">
                          🏷️ {asset.name}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                            !asset.is_negative
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-zinc-100 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          {!asset.is_negative ? "Active" : "Not Active"}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTableRow({ id: asset.id, name: asset.name, is_negative: asset.is_negative, data: {} })}
                        className="text-xs text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Delete dataset"
                      >
                        🗑️
                      </button>
                    </div>
                    <pre className="bg-zinc-950 text-emerald-400 font-mono text-xs p-3 rounded-xl overflow-x-auto border border-zinc-800">
                      {JSON.stringify(asset.data, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            Click any cell to edit directly • Click <b>Active</b> / <b>Not Active</b> to toggle status
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
