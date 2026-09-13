import express from 'express';
import authController from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Google OAuth 2.0 endpoints
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Session status & logout
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authController.logout);

export default router;
