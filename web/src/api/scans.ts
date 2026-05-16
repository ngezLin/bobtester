import { api } from "./api";

export const scanService = {
  startScan: (payload: { name: string; url: string; checks: string[] }) =>
    api.post("/scans", payload),
};
