/**
 * Client Authentication API Service
 * ─────────────────────────────────
 * Communicates with backend authentication endpoints using server-side sessions.
 * All requests include HTTP-only session cookies via credentials: 'include'.
 */

const AUTH_BASE_URL = '/auth';

/**
 * Helper for authenticated JSON requests
 */
async function apiRequest(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include', // Ensures HTTP-only session cookies are passed
  };

  const response = await fetch(`${AUTH_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  /**
   * Redirects browser to Google OAuth 2.0 endpoint
   */
  loginWithGoogle() {
    window.location.href = `${AUTH_BASE_URL}/google`;
  },

  /**
   * Logs out the user and destroys the server-side session
   */
  async logout() {
    return await apiRequest('/logout', {
      method: 'POST',
    });
  },

  /**
   * Fetches the currently authenticated session user
   */
  async getCurrentUser() {
    return await apiRequest('/me', {
      method: 'GET',
    });
  },
};

export default authApi;
