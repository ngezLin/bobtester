"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import { dataService } from "@/api/data";
import DataGridModal from "@/components/data/DataGridModal";

export default function DataSetsPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [inputModal, setInputModal] = useState<{ isOpen: boolean; title: string; label: string; onSubmit: (val: string) => void } | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await dataService.getFiles();
      setFiles(res.files || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const promptInput = (title: string, label: string, onSubmit: (val: string) => void) => {
    setInputModal({ isOpen: true, title, label, onSubmit });
  };

  const handleCreateFile = async () => {
    promptInput("Create New JSON File", "File Name (e.g. users.json):", async (name) => {
      if (!name) return;
      const filename = name.endsWith(".json") ? name : name + ".json";
      await dataService.saveFile(filename, {});
      await fetchFiles();
      setEditingFile(filename);
    });
  };

  const handleDeleteFile = async (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    if (confirm("Delete file '" + filename + "'?")) {
      await dataService.deleteFile(filename);
      fetchFiles();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b px-8 py-6 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Sets Editor</h1>
            <p className="text-sm text-gray-500 mt-1">Manage JSON files located in D:\\projects\\bobtester\\projects\\data</p>
          </div>
          <button onClick={handleCreateFile} className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm">
            + New Data File
          </button>
        </header>
        
        <div className="p-8 max-w-5xl">
           {loading ? (
             <div className="text-gray-500">Loading files...</div>
           ) : files.length === 0 ? (
             <div className="p-10 border-2 border-dashed border-gray-300 rounded-2xl text-center">
               <p className="text-gray-500 mb-4">No data files found.</p>
               <button onClick={handleCreateFile} className="text-red-600 font-medium hover:underline">Create one now</button>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {files.map(f => (
                  <div 
                    key={f}
                    onClick={() => setEditingFile(f)}
                    className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-red-50 p-3 rounded-xl text-red-600 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <button onClick={(e) => handleDeleteFile(e, f)} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2 -m-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{f}</h3>
                    <p className="text-xs text-gray-500 mt-2">Click to edit data grid</p>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>

      {/* Grid Modal */}
      {editingFile && (
        <DataGridModal 
          filename={editingFile} 
          onClose={() => { setEditingFile(null); fetchFiles(); }} 
        />
      )}

      {/* Input Modal for New File */}
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
