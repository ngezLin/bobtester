"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import { dataService } from "@/api/data";

export default function DataSetsPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await dataService.getFiles();
      setFiles(res.files || []);
      if (res.files && res.files.length > 0 && !selectedFile) {
         loadFile(res.files[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (filename: string) => {
    try {
      setSelectedFile(filename);
      const res = await dataService.getFile(filename);
      setFileData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    try {
      await dataService.saveFile(selectedFile, fileData);
      alert("Saved successfully!");
    } catch (err) {
      alert("Failed to save.");
    }
  };

  const handleCreateFile = async () => {
    const name = prompt("Enter new file name (e.g. users.json):");
    if (!name) return;
    const filename = name.endsWith(".json") ? name : name + ".json";
    await dataService.saveFile(filename, {});
    fetchFiles();
    loadFile(filename);
  };
  
  const datasets = fileData ? Object.keys(fileData) : [];
  const columns = Array.from(new Set(
    datasets.flatMap(key => Object.keys(fileData[key] || {}))
  ));

  const updateCell = (datasetKey: string, column: string, value: string) => {
    setFileData((prev: any) => ({
      ...prev,
      [datasetKey]: {
        ...(prev[datasetKey] || {}),
        [column]: value
      }
    }));
  };

  const addDataset = () => {
    const name = prompt("Dataset name:");
    if (name && !fileData[name]) {
      setFileData((prev: any) => ({ ...prev, [name]: {} }));
    }
  };

  const addColumn = () => {
    const col = prompt("Column name:");
    if (col && datasets.length > 0) {
      setFileData((prev: any) => ({
        ...prev,
        [datasets[0]]: { ...prev[datasets[0]], [col]: "" }
      }));
    } else if (col) {
      alert("Add a row first!");
    }
  };

  const renameDatasetKey = (oldKey: string) => {
     const newKey = prompt("New dataset name:", oldKey);
     if (newKey && newKey !== oldKey && !fileData[newKey]) {
        setFileData((prev: any) => {
           const newData = { ...prev };
           newData[newKey] = newData[oldKey];
           delete newData[oldKey];
           return newData;
        });
     }
  };

  const deleteDataset = (key: string) => {
     if (confirm(Delete dataset ' + key + '?)) {
        setFileData((prev: any) => {
           const newData = { ...prev };
           delete newData[key];
           return newData;
        });
     }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Sets Editor</h1>
            <p className="text-sm text-gray-500 mt-1">Manage JSON files inside projects/data</p>
          </div>
          <div className="space-x-3">
             <button onClick={handleCreateFile} className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg border hover:bg-gray-200 transition-colors">
              + New File
            </button>
            <button onClick={handleSave} className="px-5 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm">
              Save Changes
            </button>
          </div>
        </header>
        
        <div className="p-8">
           <div className="flex gap-4 mb-6 border-b pb-4 overflow-x-auto">
             {files.map(f => (
               <button 
                 key={f}
                 onClick={() => loadFile(f)}
                 className={"px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap " + (selectedFile === f ? "bg-red-100 text-red-700 border-red-200 border" : "bg-white text-gray-600 border hover:bg-gray-50")}
               >
                 ?? {f}
               </button>
             ))}
           </div>

           {selectedFile && fileData && (
             <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
               <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                 <h2 className="font-semibold text-gray-700">Editing: {selectedFile}</h2>
                 <div className="space-x-2">
                   <button onClick={addDataset} className="text-sm px-3 py-1.5 bg-white border rounded hover:bg-gray-50 shadow-sm">+ Add Row</button>
                   <button onClick={addColumn} className="text-sm px-3 py-1.5 bg-white border rounded hover:bg-gray-50 shadow-sm">+ Add Column</button>
                 </div>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm border-collapse">
                   <thead>
                     <tr className="bg-gray-100 border-b text-gray-600">
                       <th className="p-3 font-medium border-r w-10 text-center">#</th>
                       <th className="p-3 font-medium border-r">Data Key (Click to Rename)</th>
                       {columns.map(col => (
                         <th key={col} className="p-3 font-medium border-r">{col}</th>
                       ))}
                       <th className="p-3 font-medium w-20 text-center">Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {datasets.length === 0 ? (
                        <tr><td colSpan={columns.length + 3} className="text-center p-8 text-gray-500">No data available. Add a row!</td></tr>
                     ) : datasets.map((key, index) => (
                       <tr key={key} className="border-b hover:bg-gray-50 transition-colors group">
                         <td className="p-3 text-center text-gray-400 border-r">{index + 1}</td>
                         <td className="p-0 border-r relative">
                           <div 
                             className="w-full h-full p-3 font-medium cursor-pointer hover:bg-gray-100 text-blue-600"
                             onClick={() => renameDatasetKey(key)}
                             title="Click to rename"
                           >
                             {key}
                           </div>
                         </td>
                         {columns.map(col => (
                           <td key={col} className="p-0 border-r">
                             <input 
                               value={fileData[key][col] || ""}
                               onChange={(e) => updateCell(key, col, e.target.value)}
                               className="w-full p-3 bg-transparent outline-none focus:bg-blue-50"
                               placeholder="-"
                             />
                           </td>
                         ))}
                         <td className="p-3 text-center">
                            <button onClick={() => deleteDataset(key)} className="text-red-500 hover:text-red-700 opacity-20 hover:opacity-100 transition-opacity" title="Delete row">
                              ???
                            </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
