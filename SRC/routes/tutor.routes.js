import express from 'express';
import {
  signup,
  signin,
  updatePassword,
  getMe,
  updateProfile,
  getAllTutors,
  getTutorById
} from '../controllers/tutor.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);
router.get('/', getAllTutors); // Get all tutors with optional filters
router.get('/:id', getTutorById); // Get specific tutor by ID

// Protected routes (require authentication)
router.use(authenticateToken); // Apply middleware to all routes below

router.get('/profile/me', getMe);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);

export default router;