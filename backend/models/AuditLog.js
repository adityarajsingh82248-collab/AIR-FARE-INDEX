import { query } from '../config/database.js';

export const AuditLog = {
  /**
   * Creates an audit log entry
   * @param {Object} entry
   * @param {number|string|null} [entry.userId]
   * @param {string} entry.action
   * @param {Object} [entry.details]
   * @param {string} [entry.ipAddress]
   * @param {string} [entry.userAgent]
   */
  async create({ userId = null, action, details = {}, ipAddress = null, userAgent = null }) {
    // Sanitization: Ensure passwords, secrets, or tokens never enter audit logs
    const safeDetails = { ...details };
    delete safeDetails.password;
    delete safeDetails.password_hash;
    delete safeDetails.token;
    delete safeDetails.jwt;
    delete safeDetails.access_key;

    const text = `
      INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING id, user_id, action, details, ip_address, created_at;
    `;
    const res = await query(text, [
      userId,
      action,
      JSON.stringify(safeDetails),
      ipAddress,
      userAgent,
    ]);
    return res.rows[0];
  },

  /**
   * Retrieves recent audit logs
   * @param {number} [limit=50]
   */
  async getRecent(limit = 50) {
    const text = `
      SELECT a.id, a.user_id, u.email AS user_email, u.name AS user_name, a.action, a.details, a.ip_address, a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT $1;
    `;
    const res = await query(text, [Math.min(limit, 100)]);
    return res.rows;
  },
};

export default AuditLog;
