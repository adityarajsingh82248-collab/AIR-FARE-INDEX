import passport from 'passport';
import authService from '../services/authService.js';
import { env } from '../config/env.js';

export const authController = {
  /**
   * GET /auth/google
   * Initiates Google OAuth 2.0 flow
   */
  googleAuth(req, res, next) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Google OAuth is not configured. Please supply GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env',
      });
    }

    return passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account',
    })(req, res, next);
  },

  /**
   * GET /auth/google/callback
   * Handles Google OAuth response and establishes server-side session
   */
  googleCallback(req, res, next) {
    passport.authenticate('google', (err, user, info) => {
      if (err) {
        console.error('Google Auth Callback Error:', err.message);
        return res.redirect(`${env.FRONTEND_URL}/?error=${encodeURIComponent(err.message)}`);
      }

      if (!user) {
        const message = info?.message || 'Google authentication failed.';
        return res.redirect(`${env.FRONTEND_URL}/?error=${encodeURIComponent(message)}`);
      }

      // Establish express session
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Session Login Error:', loginErr.message);
          return res.redirect(`${env.FRONTEND_URL}/?error=session_error`);
        }

        // Redirect based on role
        if (user.role === 'ADMIN') {
          return res.redirect(`${env.FRONTEND_URL}/admin/dashboard`);
        }
        return res.redirect(`${env.FRONTEND_URL}/`);
      });
    })(req, res, next);
  },

  /**
   * POST /auth/logout or /api/auth/logout
   * Destroys server-side session and clears cookie
   */
  async logout(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const ipAddress = req.ip || req.connection?.remoteAddress;
      const userAgent = req.headers['user-agent'];

      await authService.logout({ userId, ipAddress, userAgent });

      // Passport session logout
      req.logout((err) => {
        if (err) {
          console.error('Logout error:', err);
        }

        if (req.session) {
          req.session.destroy((destroyErr) => {
            if (destroyErr) {
              console.error('Session destroy error:', destroyErr);
            }
            res.clearCookie('connect.sid', { path: '/' });
            return res.status(200).json({
              success: true,
              message: 'Logged out successfully.',
            });
          });
        } else {
          res.clearCookie('connect.sid', { path: '/' });
          return res.status(200).json({
            success: true,
            message: 'Logged out successfully.',
          });
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /auth/me or /api/auth/me
   * Returns current authenticated user
   */
  getCurrentUser(req, res) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No active session.',
      });
    }

    return res.status(200).json({
      success: true,
      user: req.user,
    });
  },
};

export default authController;
