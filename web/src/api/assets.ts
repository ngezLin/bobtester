import { api } from "./api";

export const assetService = {
  getAssetsByCase: (caseId: string | number) => api.get(`/assets/case/${caseId}`),
  addAsset: (caseId: string | number, data: any) => api.post(`/assets/case/${caseId}`, data),
  updateAsset: (id: string | number, data: any) => api.put(`/assets/${id}`, data),
  deleteAsset: (id: string | number) => api.delete(`/assets/${id}`),
};
