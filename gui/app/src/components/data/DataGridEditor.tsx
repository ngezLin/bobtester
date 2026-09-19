import React, { useEffect, useState } from "react";
import { dataService } from "@/api/data";

interface Props {
  filename: string;
  onClose: () => void;
  onSaved: (filename: string) => void;
}

export default function DataGridEditor({ filename, onClose, onSaved }: Props) {
  const [fileData, setFileData] = useState<Record<
    string,
    Record<string, string>
  > | null>(null);
  const [currentFilename, setCurrentFilename] = useState(filename);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dataService
      .getFile(filename)
      .then((res) => setFileData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filename]);

  const datasets = fileData ? Object.keys(fileData) : [];
  const columns = Array.from(
    new Set(datasets.flatMap((key) => Object.keys(fileData?.[key] || {}))),
  );

  const updateCell = (datasetKey: string, column: string, value: string) => {
    setFileData((prev) =>
      prev
        ? { ...prev, [datasetKey]: { ...prev[datasetKey], [column]: value } }
        : prev,
    );
  };

  const updateDatasetKey = (oldKey: string, newKey: string) => {
    if (!fileData || !newKey || (newKey !== oldKey && fileData[newKey])) return;
    const next = { ...fileData };
    next[newKey] = next[oldKey];
    if (newKey !== oldKey) delete next[oldKey];
    setFileData(next);
  };

  const addDataset = () =>
    setFileData((prev) => ({ ...(prev || {}), new_dataset: {} }));
  const addColumn = () => {
    const column = `column_${columns.length + 1}`;
    setFileData((prev) =>
      prev
        ? { ...prev, [datasets[0]]: { ...prev[datasets[0]], [column]: "" } }
        : prev,
    );
  };
  const deleteDataset = (key: string) =>
    setFileData((prev) => {
      if (!prev || !confirm(`Delete dataset '${key}'?`)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = async () => {
    if (!fileData || !currentFilename.trim()) return;
    try {
      setSaving(true);
      const newFilename = currentFilename.endsWith(".json")
        ? currentFilename
        : `${currentFilename}.json`;
      if (newFilename !== filename)
        await dataService.renameFile(filename, newFilename);
      await dataService.saveFile(newFilename, fileData);
      onSaved(newFilename);
    } catch {
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="bg-white border-b px-4 sm:px-8 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4 min-w-0 flex-1 w-full">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-sm"
          >
            Back
          </button>
          <input
            value={currentFilename}
            onChange={(e) => setCurrentFilename(e.target.value)}
            className="text-xl font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-red-500 outline-none min-w-0 w-full sm:flex-1"
            aria-label="JSON file name"
            title={currentFilename}
          />
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={addDataset}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            + Add Row
          </button>
          <button
            onClick={addColumn}
            disabled={datasets.length === 0}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            + Add Column
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>
      <div className="p-8 bg-gray-50 min-h-[calc(100vh-81px)]">
        {loading ? (
          <div className="text-center p-10 text-gray-500">Loading...</div>
        ) : (
          <div className="bg-white border rounded-xl shadow-sm overflow-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b text-gray-600">
                  <th className="p-3 border-r w-12 text-center">#</th>
                  <th className="p-3 border-r min-w-56">Data Key</th>
                  {columns.map((col) => (
                    <th key={col} className="p-3 border-r min-w-40">
                      {col}
                    </th>
                  ))}
                  <th className="p-3 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {datasets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 3}
                      className="text-center p-8 text-gray-500"
                    >
                      No data available. Add a row.
                    </td>
                  </tr>
                ) : (
                  datasets.map((key, index) => (
                    <tr key={key} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-center text-gray-400 border-r">
                        {index + 1}
                      </td>
                      <td className="p-0 border-r">
                        <input
                          value={key}
                          onChange={(e) =>
                            updateDatasetKey(key, e.target.value)
                          }
                          className="w-full h-full p-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-inset focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col} className="p-0 border-r">
                          <input
                            value={fileData?.[key]?.[col] ?? ""}
                            onChange={(e) =>
                              updateCell(key, col, e.target.value)
                            }
                            className="w-full h-full p-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-inset focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      ))}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => deleteDataset(key)}
                          className="text-red-500 hover:text-red-700"
                          aria-label={`Delete ${key}`}
                        >
                          Delete
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
    </>
  );
}
