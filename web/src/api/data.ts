import { api } from './api';

export const dataService = {
  getFiles: async () => {
    const res = await api.get('/data');
    return res.data;
  },
  getFile: async (filename: string) => {
    const res = await api.get(/data/ + filename);
    return res.data;
  },
  saveFile: async (filename: string, data: any) => {
    const res = await api.post(/data/ + filename, { data });
    return res.data;
  },
  deleteFile: async (filename: string) => {
    const res = await api.delete(/data/ + filename);
    return res.data;
  }
};
