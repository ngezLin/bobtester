const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function request(endpoint: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (!window.location.pathname.startsWith("/login")) {
        window.location.replace("/login");
      }
    }

    throw new Error(
      data?.message || `Request failed with status ${response.status}`,
    );
  }

  if (!data) {
    throw new Error("The API returned an invalid response.");
  }

  return data;
}

export const api = {
  get: (endpoint: string, options?: RequestInit) =>
    request(endpoint, { ...options, method: "GET" }),
  post: (endpoint: string, body: any, options?: RequestInit) =>
    request(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: (endpoint: string, body: any, options?: RequestInit) =>
    request(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (endpoint: string, options?: RequestInit) =>
    request(endpoint, { ...options, method: "DELETE" }),
};
