import express from 'express';
import userController from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// User profile route
router.get('/profile', authenticate, userController.getProfile);

export default router;
