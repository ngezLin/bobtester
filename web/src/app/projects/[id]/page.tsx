"use client";

import { useEffect, useState, use } from "react";
import { projectService } from "@/api/projects";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/common/Sidebar";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const res = await projectService.getProjectById(id);
      setProject(res.project);
      setCases(res.cases || []);
    } catch (error) {
      console.error("Failed to fetch project details", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSuite = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await projectService.runSuite(id);
      setRunResult(res);
    } catch (error: any) {
      console.error("Failed to run suite", error);
      setAlertMessage(error.response?.data?.message || "Failed to start batch run");
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950 text-white">
        <Sidebar />
        <main className="flex-1 p-10 flex items-center justify-center">
          <div className="p-8 text-gray-400 flex items-center gap-3"><span className="animate-spin">⏳</span> Loading project details...</div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen bg-gray-950 text-white">
        <Sidebar />
        <main className="flex-1 p-10 flex items-center justify-center">
          <div className="p-8 text-red-400">Project not found.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
        <Link href="/projects" className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-2">
          ← Back to Projects
        </Link>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📁</span>
            <h1 className="text-3xl font-bold text-white tracking-tight">{project.name}</h1>
          </div>
          <p className="text-gray-400 max-w-2xl">{project.description || "No description provided."}</p>
        </div>
        
        <div className="flex flex-col items-end">
          <button
            onClick={handleRunSuite}
            disabled={running || cases.length === 0}
            className="bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center gap-2 text-lg"
          >
            {running ? "🚀 Starting Suite..." : "▶️ Run Suite"}
          </button>
          {cases.length === 0 && (
            <span className="text-xs text-gray-500 mt-2">Add test cases first</span>
          )}
        </div>
      </div>

      {runResult && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-xl mb-8 flex items-center justify-between">
          <span>{runResult.message}</span>
          <Link href="/runs" className="text-sm font-bold hover:underline">
            View Live Results →
          </Link>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Test Suite ({cases.length} Cases)</h2>
        <Link
          href={`/record?project_id=${id}`}
          className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
        >
          <span>+</span> Add Test Case
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 mb-6">No test cases in this project yet.</p>
          <Link
            href={`/record?project_id=${id}`}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            Record First Case
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(
            cases.reduce((acc: any, c: any) => {
              const f = c.folder || "General";
              if (!acc[f]) acc[f] = [];
              acc[f].push(c);
              return acc;
            }, {})
          ).map(([folderName, folderCases]: [string, any]) => (
            <div key={folderName}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-blue-500 text-lg">📂</span>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{folderName}</h3>
                <div className="flex-1 h-px bg-gray-800 ml-4"></div>
              </div>
              
              <div className="space-y-3">
                {folderCases.map((c: any) => (
                  <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between group hover:border-gray-700 transition-colors">
                    <div>
                      <Link href={`/cases/${c.id}/config`} className="text-lg font-bold text-white hover:text-blue-400 transition-colors">
                        {c.name}
                      </Link>
                      <div className="text-sm text-gray-500 mt-1 truncate max-w-md font-mono">
                        {c.target_url}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Link 
                        href={`/cases/${c.id}/config`}
                        className="text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded text-sm transition-colors"
                      >
                        Edit / Configure
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </main>

      <ConfirmModal
        isOpen={alertMessage !== null}
        title="Execution Error"
        message={alertMessage || ""}
        confirmText="OK"
        onConfirm={() => setAlertMessage(null)}
        onClose={() => setAlertMessage(null)}
        isDanger={true}
      />
    </div>
  );
}
