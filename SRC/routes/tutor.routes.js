import express from 'express';
import {
  signup,
  signin,
  updatePassword,
  getMe,
  updateProfile,
  getAllTutors,
  getTutorById,
  // Dashboard functions
  getDashboardStats,
  getRecentActivity,
  getUpcomingLessons,
  getBookingHistory,
  updateAvailability,
  getEarningsReport
} from '../controllers/tutor.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);
router.get('/', getAllTutors);
router.get('/:id', getTutorById);

// Protected routes (require authentication)
router.use(authenticateToken); // Apply middleware to all routes below

// Profile routes
router.get('/profile/me', getMe);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/activity', getRecentActivity);
router.get('/dashboard/upcoming', getUpcomingLessons);

// Booking management routes
router.get('/bookings', getBookingHistory);

// Availability management
router.put('/availability', updateAvailability);

// Reports
router.get('/reports/earnings', getEarningsReport);

export default router;