import { api } from "./api";

export const assetService = {
  getAssetsByCase: (caseId: string | number) => api.get(`/assets/case/${caseId}`),
  addAsset: (caseId: string | number, data: any) => api.post(`/assets/case/${caseId}`, data),
  deleteAsset: (id: string | number) => api.delete(`/assets/${id}`),
};
