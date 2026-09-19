import { api } from "./api";

export const projectService = {
  getProjects: () => api.get("/projects"),
  getProjectById: (id: string | number) => api.get(`/projects/${id}`),
  createProject: (name: string, description?: string) => api.post("/projects", { name, description }),
  updateProject: (id: string | number, name: string, description?: string) => api.put(`/projects/${id}`, { name, description }),
  deleteProject: (id: string | number) => api.delete(`/projects/${id}`),
  runSuite: (id: string | number) => api.post(`/projects/${id}/run`, {}),
};
