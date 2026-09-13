/**
 * Role-based authorization middleware
 * @param {string|string[]} roles - Allowed role or array of allowed roles (e.g. 'ADMIN')
 */
export function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient administrative privileges.',
      });
    }

    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export default requireRole;
