import express from 'express';
import {
  signup,
  signin,
  updatePassword,
  getMe,
  updateProfile
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);

// Protected routes (require authentication)
router.use(authenticateToken); // Apply middleware to all routes below

router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);

export default router;