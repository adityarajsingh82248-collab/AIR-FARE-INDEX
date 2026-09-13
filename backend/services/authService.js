import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { hashPassword, comparePassword } from '../utils/password.js';

export const authService = {
  /**
   * Registers a local user account. Role is strictly locked to 'USER'.
   */
  async register({ name, email, password, ipAddress, userAgent }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is already in use
    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    // Hash password securely
    const passwordHash = await hashPassword(password);

    // Create user in PostgreSQL (role is strictly 'USER')
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'USER',
    });

    // Record audit log
    await AuditLog.create({
      userId: newUser.id,
      action: 'USER_REGISTERED',
      details: { email: newUser.email, role: newUser.role },
      ipAddress,
      userAgent,
    });

    return newUser;
  },

  /**
   * Authenticates user with credentials
   */
  async login({ email, password, ipAddress, userAgent }) {
    const normalizedEmail = email.trim().toLowerCase();

    const userWithHash = await User.findByEmailWithHash(normalizedEmail);
    if (!userWithHash || !userWithHash.password_hash) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }

    if (!userWithHash.is_active) {
      const error = new Error('Account has been deactivated. Please contact an administrator.');
      error.statusCode = 403;
      error.isOperational = true;
      throw error;
    }

    const isMatch = await comparePassword(password, userWithHash.password_hash);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }

    const updatedUser = await User.updateLastLogin(userWithHash.id);

    await AuditLog.create({
      userId: updatedUser.id,
      action: 'USER_LOGIN',
      details: { email: updatedUser.email, role: updatedUser.role },
      ipAddress,
      userAgent,
    });

    return {
      user: updatedUser,
    };
  },

  /**
   * Logs out user and records audit log
   */
  async logout({ userId, ipAddress, userAgent }) {
    if (userId) {
      await AuditLog.create({
        userId,
        action: 'USER_LOGOUT',
        details: {},
        ipAddress,
        userAgent,
      });
    }
    return { success: true };
  },
};

export default authService;
