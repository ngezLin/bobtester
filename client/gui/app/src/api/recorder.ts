const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const recorderService = {
  /** Start a new recording session. Returns { sessionId, viewport } */
  start: async (url: string): Promise<{ sessionId: string; viewport: { width: number; height: number } }> => {
    const res = await fetch(`${BASE_URL}/recorder/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to start recorder");
    return data;
  },

  /** Proxy a user action into the Browserless page. Returns { action, selector?, step? } */
  action: async (
    sessionId: string,
    payload: {
      action: "click" | "fill" | "screenshot" | "assert" | "wait";
      x?: number;
      y?: number;
      selector?: string;
      value?: string | number;
    }
  ): Promise<any> => {
    const res = await fetch(`${BASE_URL}/recorder/${sessionId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  /** Remove a step by index */
  removeStep: async (sessionId: string, index: number): Promise<void> => {
    await fetch(`${BASE_URL}/recorder/${sessionId}/step`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index }),
    });
  },

  /** Stop the session. Returns { code, steps } */
  stop: async (sessionId: string): Promise<{ code: string; steps: string[] }> => {
    const res = await fetch(`${BASE_URL}/recorder/${sessionId}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to stop recorder");
    return data;
  },

  /** URL for the live screenshot img src — append a timestamp to bust cache */
  screenshotUrl: (sessionId: string, ts: number): string =>
    `${BASE_URL}/recorder/${sessionId}/screenshot?t=${ts}`,

  /** Create an EventSource for the SSE step stream */
  createEventSource: (sessionId: string): EventSource =>
    new EventSource(`${BASE_URL}/recorder/${sessionId}/stream`),
};
