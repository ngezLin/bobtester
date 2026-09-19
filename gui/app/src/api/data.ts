import { api } from "./api";

export const dataService = {
  getFiles: async () => {
    return await api.get("/data");
  },
  getFile: async (filename: string) => {
    return await api.get(`/data/` + filename);
  },
  saveFile: async (filename: string, data: unknown) => {
    return await api.post(`/data/` + filename, { data });
  },
  renameFile: async (filename: string, newFilename: string) => {
    return await api.post(`/data/` + filename + `/rename`, { newFilename });
  },
  deleteFile: async (filename: string) => {
    return await api.delete(`/data/` + filename);
  },
};
