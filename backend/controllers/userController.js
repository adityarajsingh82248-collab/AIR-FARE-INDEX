import userService from '../services/userService.js';

export const userController = {
  /**
   * GET /api/users/profile
   */
  async getProfile(req, res, next) {
    try {
      const user = await userService.getUserById(req.user.id);
      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default userController;
