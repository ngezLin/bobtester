import { api } from "./api";

export const caseService = {
  getCases: () => api.get("/cases"),
  getCaseById: (id: string | number) => api.get(`/cases/${id}`),
  createCase: (data: any) => api.post("/cases", data),
  updateCase: (id: string | number, data: any) => api.put(`/cases/${id}`, data),
  deleteCase: (id: string | number) => api.delete(`/cases/${id}`),
  recordCase: async (url: string) => {
    // If we are on the production site, try to trigger the recorder on the user's local machine
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      try {
        console.log("🌐 [Bridge] Attempting to trigger local recorder...");
        const response = await fetch("http://localhost:4000/api/cases/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        console.warn("🌐 [Bridge] Local recorder not found. Falling back to prod API (which will show a helpful error).");
      }
    }
    
    // Default behavior: hit the configured BASE_URL
    return api.post("/cases/record", { url });
  },
};
