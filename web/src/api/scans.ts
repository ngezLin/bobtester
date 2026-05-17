import { api } from "./api";

export const scanService = {
  startScan: (payload: { name: string; url: string; checks: string[]; scanId?: string }) =>
    api.post("/scans", payload),
  getScanById: (scanId: string) => api.get(`/scans/${scanId}`),
  terminateScan: (scanId: string) => api.post(`/scans/${scanId}/terminate`, {}),
};
