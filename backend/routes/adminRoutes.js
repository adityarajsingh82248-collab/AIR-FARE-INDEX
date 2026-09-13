import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { validateStatusUpdate, validateRoleUpdate } from '../validators/authValidator.js';

const router = express.Router();

// Enforce authentication + ADMIN role for ALL /api/admin/* endpoints
router.use(authenticate, requireAdmin);

// Admin dashboard statistics
router.get('/dashboard', adminController.getDashboard);

// User management endpoints
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', validate(validateStatusUpdate), adminController.updateStatus);
router.patch('/users/:id/role', validate(validateRoleUpdate), adminController.updateRole);
router.delete('/users/:id', adminController.deleteUser);

// Dataset stats (airfare_observations table)
router.get('/dataset-stats', adminController.getDatasetStats);

// Infrastructure and pipeline monitoring
router.get('/monitoring', adminController.getMonitoringStats);

export default router;
