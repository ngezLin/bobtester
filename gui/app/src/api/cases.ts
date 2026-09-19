import { api } from "./api";

export const caseService = {
  getCases: () => api.get("/cases"),
  getCaseById: (id: string | number) => api.get(`/cases/${id}`),
  createCase: (data: any) => api.post("/cases", data),
  updateCase: (id: string | number, data: any) => api.put(`/cases/${id}`, data),
  deleteCase: (id: string | number) => api.delete(`/cases/${id}`),
  recordCase: (url: string, mode?: string) => api.post("/cases/record", { url, mode }),
};
