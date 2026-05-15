import { api } from "./api";

export const runService = {
  getRuns: () => api.get("/runs"),
  executeRun: (caseId: number, assetId: number | null) => api.post("/runs", { caseId, assetId }),
  deleteRun: (id: string | number) => api.delete(`/runs/${id}`),
  aiRun: (url: string, goal: string, name?: string, steps?: any[]) => api.post("/runs/ai", { url, goal, name, steps }),
};

