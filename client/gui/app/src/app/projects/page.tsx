"use client";

import { useEffect, useState } from "react";
import { projectService } from "@/api/projects";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/common/Sidebar";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [processing, setProcessing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await projectService.getProjects();
      setProjects(res.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProject(null);
    setFormData({ name: "", description: "" });
    setShowModal(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, project: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setFormData({ name: project.name, description: project.description || "" });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      if (editingProject) {
        await projectService.updateProject(editingProject.id, formData.name, formData.description);
      } else {
        await projectService.createProject(formData.name, formData.description);
      }
      setShowModal(false);
      fetchProjects();
    } catch (error) {
      console.error("Failed to save project", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteId === null) return;
    try {
      await projectService.deleteProject(confirmDeleteId);
      fetchProjects();
    } catch (error) {
      console.error("Failed to delete project", error);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-10 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <div className="w-9 h-9 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs uppercase tracking-widest font-medium">Loading projects...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Projects</h1>
            </div>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-red-500/20 active:scale-95"
            >
              <span>+</span>
              <span>Create Project</span>
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white border border-zinc-200/90 rounded-3xl p-16 text-center shadow-xs">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-red-100">
                📁
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">No projects yet</h3>
              <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                Create a project to group your test cases and run them as an automated test suite.
              </p>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="block group">
                  <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 hover:shadow-md hover:border-red-300 transition-all h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-11 h-11 bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                          📁
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900 mb-2 group-hover:text-red-600 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-xs text-zinc-500 line-clamp-3 mb-6">
                        {p.description || "No description provided."}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-zinc-100 flex justify-between items-center text-xs font-semibold">
                      <span className="text-red-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                        View Suite →
                      </span>
                      <div className="flex gap-1.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleOpenEdit(e, p)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                          title="Edit Project"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, p.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Project"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">
                      {editingProject ? "Edit Project" : "Create New Project"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
                      placeholder="e.g., Auth Service V2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm h-24 resize-none"
                      placeholder="Project description"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold py-2.5 rounded-xl transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing || !formData.name}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-red-500/20 text-sm"
                    >
                      {processing ? "Processing..." : editingProject ? "Update Project" : "Create Project"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="Delete Project"
        message="Are you sure? This will delete all test cases in this project. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDeleteId(null)}
        isDanger={true}
      />
    </div>
  );
}
