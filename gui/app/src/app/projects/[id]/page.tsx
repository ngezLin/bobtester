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
      <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-10 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <div className="w-9 h-9 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs uppercase tracking-widest font-medium">Loading project details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-10 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center text-sm font-medium">
            Project not found.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <span>←</span>
              <span>Back to Projects</span>
            </Link>
          </div>

          <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-red-50 text-red-600 border border-red-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                📁
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
                  {project.name}
                </h1>
                <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
                  {project.description || "No description provided."}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch sm:items-end w-full sm:w-auto shrink-0">
              <button
                onClick={handleRunSuite}
                disabled={running || cases.length === 0}
                className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md shadow-red-500/25 active:scale-95 flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
              >
                {running ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Starting Suite...</span>
                  </>
                ) : (
                  <>
                    <span>▶</span>
                    <span>Run All Tests</span>
                  </>
                )}
              </button>
              {cases.length === 0 && (
                <span className="text-xs text-zinc-400 mt-2 text-center sm:text-right">
                  Add test cases first
                </span>
              )}
            </div>
          </div>

          {runResult && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center justify-between text-sm shadow-xs">
              <div className="flex items-center gap-2 font-medium">
                <span className="text-emerald-600">✓</span>
                <span>{runResult.message}</span>
              </div>
              <Link href="/runs" className="text-xs font-bold text-emerald-700 hover:underline">
                View Live Results →
              </Link>
            </div>
          )}

          <div className="flex justify-between items-center pb-2">
            <h2 className="text-xl font-bold text-zinc-900">
              Test Suite ({cases.length} Cases)
            </h2>
            <Link
              href={`/record?project_id=${id}`}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span>+</span>
              <span>Add Test Case</span>
            </Link>
          </div>

          {cases.length === 0 ? (
            <div className="bg-white border border-dashed border-zinc-300 rounded-3xl p-16 text-center shadow-xs">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-red-100">
                📄
              </div>
              <p className="text-zinc-500 mb-6 text-sm">No test cases in this project yet.</p>
              <Link
                href={`/record?project_id=${id}`}
                className="inline-block bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-red-500/20 text-sm active:scale-95"
              >
                Record First Case
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
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
                    <span className="text-base">📂</span>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      {folderName}
                    </h3>
                    <div className="flex-1 h-px bg-zinc-200 ml-3" />
                  </div>

                  <div className="space-y-3">
                    {folderCases.map((c: any) => (
                      <div
                        key={c.id}
                        className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group hover:border-red-300 hover:shadow-xs transition-all"
                      >
                        <div className="w-full sm:w-auto">
                          <span className="text-base font-bold text-zinc-900">
                            {c.name}
                          </span>
                          <div className="text-xs text-zinc-400 mt-1 truncate max-w-md font-mono">
                            {c.target_url}
                          </div>
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
