/**
 * Utility functions for handling authentication and token refresh
 */

/**
 * Refresh the access token using the refresh token
 * @returns The new access token or null if refresh failed
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    
    if (!refreshToken) {
      return null;
    }

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid or expired
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.accessToken;

    // Update stored tokens
    localStorage.setItem("accessToken", newAccessToken);
    localStorage.setItem("token", newAccessToken); // For backward compatibility

    return newAccessToken;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}

/**
 * Make an authenticated API request with automatic token refresh
 * @param url The API endpoint URL
 * @param options Fetch options
 * @returns The fetch response
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get the current access token
  let token = localStorage.getItem("token") || localStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Not authenticated");
  }

  // Add authorization header
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  // Make the initial request
  let response = await fetch(url, { ...options, headers });

  // If we get a 401 or 400 error (likely token expired), try to refresh
  if (response.status === 401 || response.status === 400) {
    const errorData = await response.json();
    
    // Check if it's a JWT error
    if (
      errorData.error &&
      (errorData.error.includes("jwt") || 
       errorData.error.includes("token") ||
       errorData.error.includes("expired"))
    ) {
      // Try to refresh the token
      const newToken = await refreshAccessToken();

      if (newToken) {
        // Retry the request with the new token
        const newHeaders = {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        };

        response = await fetch(url, { ...options, headers: newHeaders });
      } else {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = "/auth/login";
        throw new Error("Session expired. Please login again.");
      }
    }
  }

  return response;
}

/**
 * Check if the user is authenticated
 * @returns True if authenticated, false otherwise
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
  return !!token;
}

/**
 * Logout the user by clearing all stored tokens
 */
export function logout(): void {
  localStorage.clear();
  window.location.href = "/auth/login";
}

// Made with Bob
