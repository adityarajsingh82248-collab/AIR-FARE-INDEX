import { query } from '../config/database.js';

/**
 * Strips sensitive fields like password_hash from user object
 * @param {Object} row
 * @returns {Object|null}
 */
export function sanitizeUser(row) {
  if (!row) return null;
  const { password_hash, ...safeUser } = row;
  return safeUser;
}

export const User = {
  /**
   * Finds user by email (includes password_hash for internal auth verification only)
   * @param {string} email
   */
  async findByEmailWithHash(email) {
    const text = `
      SELECT id, name, email, password_hash, role, is_active, google_id, provider, profile_picture, created_at, updated_at, last_login
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
    `;
    const res = await query(text, [email.trim()]);
    return res.rows[0] || null;
  },

  /**
   * Finds safe user by email
   * @param {string} email
   */
  async findByEmail(email) {
    const user = await this.findByEmailWithHash(email);
    return sanitizeUser(user);
  },

  /**
   * Finds safe user by ID
   * @param {number|string} id
   */
  async findById(id) {
    const text = `
      SELECT id, name, email, role, is_active, google_id, provider, profile_picture, created_at, updated_at, last_login
      FROM users
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await query(text, [id]);
    return res.rows[0] || null;
  },

  /**
   * Finds safe user by Google ID
   * @param {string} googleId
   */
  async findByGoogleId(googleId) {
    const text = `
      SELECT id, name, email, role, is_active, google_id, provider, profile_picture, created_at, updated_at, last_login
      FROM users
      WHERE google_id = $1
      LIMIT 1;
    `;
    const res = await query(text, [googleId]);
    return res.rows[0] || null;
  },

  /**
   * Finds or creates a user from verified Google OAuth profile
   * - If user with google_id exists: updates name, picture, and last_login.
   * - If user with matching email exists: links google_id, updates name, picture, preserves existing role (e.g. ADMIN).
   * - If new user: creates with role = 'USER', provider = 'google'.
   * @param {Object} profileData
   * @param {string} profileData.googleId
   * @param {string} profileData.email
   * @param {string} profileData.name
   * @param {string} [profileData.profilePicture]
   */
  async findOrCreateGoogleUser({ googleId, email, name, profilePicture = null }) {
    const normalizedEmail = (email || '').trim().toLowerCase();

    // 1. Check if user already exists by google_id
    let existingUser = await this.findByGoogleId(googleId);

    if (existingUser) {
      // Update last login, name, and profile picture
      const updateText = `
        UPDATE users
        SET name = COALESCE($1, name),
            profile_picture = COALESCE($2, profile_picture),
            last_login = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE google_id = $3
        RETURNING id, name, email, role, is_active, google_id, provider, profile_picture, created_at, updated_at, last_login;
      `;
      const res = await query(updateText, [name, profilePicture, googleId]);
      return sanitizeUser(res.rows[0]);
    }

    // 2. Check if user exists with the same email (e.g. seeded admin)
    existingUser = await this.findByEmail(normalizedEmail);

    if (existingUser) {
      // Link Google account to existing user, preserving their role (e.g. ADMIN remains ADMIN)
      const linkText = `
        UPDATE users
        SET google_id = $1,
            provider = 'google',
            profile_picture = COALESCE($2, profile_picture),
            last_login = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, name, email, role, is_active, google_id, provider, profile_picture, created_at, updated_at, last_login;
      `;
      const res = await query(linkText, [googleId, profilePicture, existingUser.id]);
      return sanitizeUser(res.rows[0]);
    }

    // 3. Create a brand new Google user (strictly default role = 'USER')
    const insertText = `
      INSERT INTO users (name, email, google_id, provider, profile_picture, role, is_active, created_at, updated_at, last_login)
      VALUES ($1, $2, $3, 'google', $4, 'USER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, email, role, is_active, google_id, provider, profile_picture, created_at, updated_at, last_login;
    `;
    const res = await query(insertText, [name || normalizedEmail, normalizedEmail, googleId, profilePicture]);
    return sanitizeUser(res.rows[0]);
  },

  /**
   * Creates a new user record. Role defaults to 'USER'.
   * @param {Object} data
   * @param {string} data.name
   * @param {string} data.email
   * @param {string} [data.passwordHash]
   * @param {string} [data.role='USER']
   */
  async create({ name, email, passwordHash = null, role = 'USER' }) {
    const text = `
      INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
      VALUES ($1, LOWER($2), $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, email, role, is_active, created_at, updated_at;
    `;
    const res = await query(text, [name.trim(), email.trim(), passwordHash, role]);
    return sanitizeUser(res.rows[0]);
  },

  /**
   * Updates last_login timestamp
   * @param {number|string} id
   */
  async updateLastLogin(id) {
    const text = `
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email, role, is_active, last_login;
    `;
    const res = await query(text, [id]);
    return sanitizeUser(res.rows[0]);
  },

  /**
   * Updates user active status
   * @param {number|string} id
   * @param {boolean} isActive
   */
  async updateStatus(id, isActive) {
    const text = `
      UPDATE users
      SET is_active = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email, role, is_active, updated_at;
    `;
    const res = await query(text, [id, Boolean(isActive)]);
    return sanitizeUser(res.rows[0]);
  },

  /**
   * Updates user role
   * @param {number|string} id
   * @param {'USER'|'ADMIN'} role
   */
  async updateRole(id, role) {
    if (!['USER', 'ADMIN'].includes(role)) {
      throw new Error('Invalid role specified. Must be USER or ADMIN.');
    }
    const text = `
      UPDATE users
      SET role = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email, role, is_active, updated_at;
    `;
    const res = await query(text, [id, role]);
    return sanitizeUser(res.rows[0]);
  },

  /**
   * Deletes a user by ID
   * @param {number|string} id
   */
  async delete(id) {
    const text = `
      DELETE FROM users
      WHERE id = $1
      RETURNING id, email;
    `;
    const res = await query(text, [id]);
    return res.rows[0] || null;
  },

  /**
   * Paginated user list with optional search
   * @param {Object} options
   * @param {number} [options.page=1]
   * @param {number} [options.limit=20]
   * @param {string} [options.search='']
   */
  async findPaginated({ page = 1, limit = 20, search = '' }) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    let countQuery = `SELECT COUNT(*) AS total FROM users`;
    let dataQuery = `
      SELECT id, name, email, role, is_active, google_id, provider, profile_picture, created_at, updated_at, last_login
      FROM users
    `;
    const queryParams = [];

    if (search && search.trim()) {
      countQuery += ` WHERE name ILIKE $1 OR email ILIKE $1`;
      dataQuery += ` WHERE name ILIKE $1 OR email ILIKE $1`;
      queryParams.push(`%${search.trim()}%`);
    }

    const countRes = await query(countQuery, queryParams);
    const total = parseInt(countRes.rows[0].total, 10);

    dataQuery += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    const dataParams = [...queryParams, safeLimit, offset];
    const dataRes = await query(dataQuery, dataParams);

    return {
      data: dataRes.rows,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 0,
      },
    };
  },

  /**
   * Aggregates real database statistics for admin dashboard
   */
  async getAdminStats() {
    const statsQuery = `
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE is_active = true) AS active_users,
        COUNT(*) FILTER (WHERE role = 'ADMIN') AS admin_count,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_30d
      FROM users;
    `;
    const res = await query(statsQuery);
    const row = res.rows[0] || {};
    return {
      totalUsers: parseInt(row.total_users || 0, 10),
      activeUsers: parseInt(row.active_users || 0, 10),
      adminCount: parseInt(row.admin_count || 0, 10),
      newUsers30d: parseInt(row.new_users_30d || 0, 10),
    };
  },
};

export default User;
