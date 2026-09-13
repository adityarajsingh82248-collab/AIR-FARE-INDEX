import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

export const userService = {
  /**
   * Retrieves user by ID
   */
  async getUserById(id) {
    const user = await User.findById(id);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    return user;
  },

  /**
   * Retrieves paginated user list with database pagination
   */
  async getUsersPaginated({ page = 1, limit = 20, search = '' }) {
    return await User.findPaginated({ page, limit, search });
  },

  /**
   * Updates user activation status
   */
  async updateUserStatus({ targetUserId, isActive, adminUserId, ipAddress, userAgent }) {
    // Prevent admin from deactivating themselves
    if (String(targetUserId) === String(adminUserId) && !isActive) {
      const error = new Error('Administrators cannot deactivate their own account.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const updatedUser = await User.updateStatus(targetUserId, isActive);
    if (!updatedUser) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    await AuditLog.create({
      userId: adminUserId,
      action: isActive ? 'ADMIN_USER_ACTIVATED' : 'ADMIN_USER_DEACTIVATED',
      details: { targetUserId, targetEmail: updatedUser.email, isActive },
      ipAddress,
      userAgent,
    });

    return updatedUser;
  },

  /**
   * Updates user role
   */
  async updateUserRole({ targetUserId, role, adminUserId, ipAddress, userAgent }) {
    if (String(targetUserId) === String(adminUserId) && role !== 'ADMIN') {
      const error = new Error('Administrators cannot demote their own account.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const updatedUser = await User.updateRole(targetUserId, role);
    if (!updatedUser) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    await AuditLog.create({
      userId: adminUserId,
      action: 'ADMIN_USER_ROLE_CHANGED',
      details: { targetUserId, targetEmail: updatedUser.email, newRole: role },
      ipAddress,
      userAgent,
    });

    return updatedUser;
  },

  /**
   * Deletes a user
   */
  async deleteUser({ targetUserId, adminUserId, ipAddress, userAgent }) {
    if (String(targetUserId) === String(adminUserId)) {
      const error = new Error('Administrators cannot delete their own account.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const deletedUser = await User.delete(targetUserId);
    if (!deletedUser) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    await AuditLog.create({
      userId: adminUserId,
      action: 'ADMIN_USER_DELETED',
      details: { targetUserId, targetEmail: deletedUser.email },
      ipAddress,
      userAgent,
    });

    return { success: true, id: targetUserId };
  },

  /**
   * Aggregates real database statistics for the admin dashboard
   */
  async getDashboardStats() {
    const counts = await User.getAdminStats();
    const recentActivity = await AuditLog.getRecent(10);

    return {
      stats: counts,
      recentActivity,
    };
  },
};

export default userService;
