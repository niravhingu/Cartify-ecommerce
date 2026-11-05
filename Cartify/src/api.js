// One place for every request to the backend.
// Set VITE_API_URL in Cartify/.env when the API is not on localhost:5000.

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// These endpoints answer 401 for "wrong password"/"not logged in" – that is
// normal there and must not be treated as an expired session.
const AUTH_ENDPOINTS = ["/users/login", "/users/register", "/users/profile", "/users/logout"];

/**
 * api("/products?q=shoe")
 * api("/cart", { method: "POST", body: { productId: 1 } })
 * Resolves with parsed JSON, throws ApiError (with .status and .message) otherwise.
 */
export async function api(path, { method = "GET", body, signal } = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      signal,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Unable to reach the server. Check your connection and try again.", 0);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // empty / non-JSON body
  }

  if (!response.ok) {
    if (response.status === 401 && !AUTH_ENDPOINTS.some((p) => path.startsWith(p))) {
      window.dispatchEvent(new Event("cartify:unauthorized"));
    }
    throw new ApiError(data?.message || `Request failed (${response.status})`, response.status, data);
  }

  return data;
}

export const isAbort = (error) => error?.name === "AbortError";
