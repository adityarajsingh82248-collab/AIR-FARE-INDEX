/**
 * Client Admin API Service
 * ────────────────────────
 * Communicates with backend admin endpoints (/api/admin/*).
 * Strictly requires ADMIN role authenticated via HTTP-only cookie.
 */

const ADMIN_BASE_URL = '/api/admin';

async function adminRequest(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
  };

  const response = await fetch(`${ADMIN_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Admin request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const adminApi = {
  /**
   * Fetches real database statistics and recent activity
   */
  async getDashboardStats() {
    return await adminRequest('/dashboard', { method: 'GET' });
  },

  /**
   * Fetches paginated user list from database
   */
  async getUsers({ page = 1, limit = 20, search = '' } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set('search', search);

    return await adminRequest(`/users?${params.toString()}`, { method: 'GET' });
  },

  /**
   * Fetches details of a single user
   */
  async getUser(id) {
    return await adminRequest(`/users/${id}`, { method: 'GET' });
  },

  /**
   * Updates user activation status (activate / deactivate)
   */
  async updateUserStatus(id, isActive) {
    return await adminRequest(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  /**
   * Updates user role (USER / ADMIN)
   */
  async updateUserRole(id, role) {
    return await adminRequest(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  /**
   * Deletes a user record
   */
  async deleteUser(id) {
    return await adminRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

export default adminApi;
