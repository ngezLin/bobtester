import React, { useState, useEffect } from "react";
import { dataService } from "@/api/data";

interface Props {
  filename: string;
  onClose: () => void;
}

export default function DataGridModal({ filename, onClose }: Props) {
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Custom Input Modal state
  const [inputModal, setInputModal] = useState<{ isOpen: boolean; title: string; label: string; onSubmit: (val: string) => void } | null>(null);

  useEffect(() => {
    fetchData();
  }, [filename]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await dataService.getFile(filename);
      setFileData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await dataService.saveFile(filename, fileData);
      onClose();
    } catch (err) {
      alert("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const datasets = fileData ? Object.keys(fileData) : [];
  const columns = Array.from(
    new Set(datasets.flatMap((key) => Object.keys(fileData[key] || {})))
  );

  const updateCell = (datasetKey: string, column: string, value: string) => {
    setFileData((prev: any) => ({
      ...prev,
      [datasetKey]: {
        ...(prev[datasetKey] || {}),
        [column]: value,
      },
    }));
  };

  const promptInput = (title: string, label: string, onSubmit: (val: string) => void) => {
    setInputModal({ isOpen: true, title, label, onSubmit });
  };

  const addDataset = () => {
    promptInput("Add New Row (Dataset)", "Dataset Key (e.g. standard_user)", (name) => {
      if (name && !fileData[name]) {
        setFileData((prev: any) => ({ ...prev, [name]: {} }));
      }
    });
  };

  const addColumn = () => {
    promptInput("Add New Column", "Column Name (e.g. password)", (col) => {
      if (col) {
        if (datasets.length > 0) {
          setFileData((prev: any) => ({
            ...prev,
            [datasets[0]]: { ...prev[datasets[0]], [col]: "" },
          }));
        } else {
          // If no datasets exist, we can't easily add a column in this flat structure until a row exists.
          alert("Add a row first!"); 
        }
      }
    });
  };

  const renameDatasetKey = (oldKey: string) => {
    promptInput("Rename Dataset Key", "New Key Name:", (newKey) => {
      if (newKey && newKey !== oldKey && !fileData[newKey]) {
        setFileData((prev: any) => {
          const newData = { ...prev };
          newData[newKey] = newData[oldKey];
          delete newData[oldKey];
          return newData;
        });
      }
    });
  };

  const deleteDataset = (key: string) => {
    if (confirm("Delete dataset '" + key + "'?")) {
      setFileData((prev: any) => {
        const newData = { ...prev };
        delete newData[key];
        return newData;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Editing {filename}</h2>
            <p className="text-xs text-gray-500">Add rows for new users/datasets, add columns for properties.</p>
          </div>
          <div className="flex gap-2">
             <button onClick={addDataset} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 shadow-sm">+ Add Row</button>
             <button onClick={addColumn} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 shadow-sm">+ Add Column</button>
             <button onClick={handleSave} disabled={saving} className="ml-4 px-5 py-1.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-sm disabled:opacity-50">
               {saving ? "Saving..." : "Save Changes"}
             </button>
             <button onClick={onClose} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Close</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {loading ? (
             <div className="text-center p-10 text-gray-500">Loading...</div>
          ) : (
             <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b text-gray-600">
                      <th className="p-3 font-medium border-r w-12 text-center">#</th>
                      <th className="p-3 font-medium border-r">Data Key (Click to Rename)</th>
                      {columns.map((col) => (
                        <th key={col} className="p-3 font-medium border-r">{col}</th>
                      ))}
                      <th className="p-3 font-medium w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.length === 0 ? (
                      <tr><td colSpan={columns.length + 3} className="text-center p-8 text-gray-500">No data available. Add a row!</td></tr>
                    ) : (
                      datasets.map((key, index) => (
                        <tr key={key} className="border-b hover:bg-gray-50 transition-colors group">
                          <td className="p-3 text-center text-gray-400 border-r">{index + 1}</td>
                          <td className="p-0 border-r relative bg-gray-50/50">
                            <div 
                              className="w-full h-full p-3 font-medium cursor-pointer hover:bg-gray-200 text-blue-700 transition-colors"
                              onClick={() => renameDatasetKey(key)}
                              title="Click to rename"
                            >
                              {key}
                            </div>
                          </td>
                          {columns.map((col) => (
                            <td key={col} className="p-0 border-r">
                              <input 
                                value={fileData[key][col] || ""}
                                onChange={(e) => updateCell(key, col, e.target.value)}
                                className="w-full h-full p-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-inset focus:ring-2 focus:ring-blue-500"
                                placeholder="-"
                              />
                            </td>
                          ))}
                          <td className="p-3 text-center">
                             <button onClick={() => deleteDataset(key)} className="text-red-500 hover:text-red-700 opacity-20 hover:opacity-100 transition-opacity" title="Delete row">
                               Trash
                             </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
          )}
        </div>
      </div>

      {/* Custom Input Modal */}
      {inputModal && inputModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="px-5 py-4 border-b bg-gray-50">
                <h3 className="font-bold text-gray-800">{inputModal.title}</h3>
             </div>
             <form onSubmit={(e) => {
               e.preventDefault();
               const val = new FormData(e.currentTarget).get("inputValue") as string;
               inputModal.onSubmit(val);
               setInputModal(null);
             }} className="p-5">
                <label className="block text-sm text-gray-600 mb-2">{inputModal.label}</label>
                <input 
                  name="inputValue" 
                  autoFocus 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  autoComplete="off"
                />
                <div className="mt-6 flex justify-end gap-2">
                   <button type="button" onClick={() => setInputModal(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
                   <button type="submit" className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg">Confirm</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
