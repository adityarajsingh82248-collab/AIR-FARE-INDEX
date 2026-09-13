/**
 * Session-based Authentication Middleware
 * ───────────────────────────────────────
 * Checks whether the incoming request has a valid, active authenticated session.
 * Replaces previous JWT verification with server-side session authentication.
 */
export function authenticate(req, res, next) {
  // 1. Check if user is authenticated via express-session / passport
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
    });
  }

  // 2. Check active status
  if (!req.user.is_active) {
    return res.status(403).json({
      success: false,
      message: 'Account has been deactivated. Please contact an administrator.',
    });
  }

  // Session is valid and user is active
  next();
}

export default authenticate;
