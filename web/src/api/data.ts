import { api } from './api';

export const dataService = {
  getFiles: async () => {
    return await api.get('/data');
  },
  getFile: async (filename: string) => {
    return await api.get(`/data/` + filename);
  },
  saveFile: async (filename: string, data: any) => {
    return await api.post(`/data/` + filename, { data });
  },
  deleteFile: async (filename: string) => {
    return await api.delete(`/data/` + filename);
  }
};
