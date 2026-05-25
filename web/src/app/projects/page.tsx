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
        const res = await projectService.createProject(formData.name, formData.description);
        if (!editingProject) {
           // fetchProjects(); // handled below
        }
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
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-950 text-white">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-10 flex items-center justify-center">
          <div className="p-8 text-gray-400 flex items-center gap-3"><span className="animate-spin">⏳</span> Loading projects...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Your Projects</h1>
          <p className="text-gray-400">Organize your test cases into executable test suites.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/20"
        >
          + Create Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">📁</div>
          <h3 className="text-xl font-bold text-white mb-2">No projects yet</h3>
          <p className="text-gray-400 mb-6">Create a project to group your test cases and run them as a suite.</p>
          <button
            onClick={handleOpenCreate}
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-all"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="block group">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 hover:bg-gray-800/50 transition-all h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-xl">
                    📁
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {p.name}
                </h3>
                <p className="text-gray-400 text-sm flex-1">
                  {p.description || "No description provided."}
                </p>
                <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between items-center text-sm font-medium">
                  <span className="text-blue-400">View Suite →</span>
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleOpenEdit(e, p)}
                      className="text-gray-400 hover:text-white"
                      title="Edit Project"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={(e) => handleDeleteClick(e, p.id)}
                      className="text-gray-400 hover:text-red-500"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{editingProject ? "Edit Project" : "Create New Project"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Auth Service V2"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 h-24"
                  placeholder="What are we testing?"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !formData.name}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                >
                  {processing ? "Processing..." : (editingProject ? "Update Project" : "Create Project")}
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
