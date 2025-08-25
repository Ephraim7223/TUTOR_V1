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
  getEarningsReport,
  // Course completion functions
  markLessonCompleted,
  getCompletableLessons,
  getCompletedLessons,
  updateLessonNotes
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
router.get('/bookings/all', getBookingHistory);

// Course/Lesson completion routes
router.post('/lessons/:bookingId/complete', markLessonCompleted);
router.get('/lessons/completable', getCompletableLessons);
router.get('/lessons/completed', getCompletedLessons);
router.put('/lessons/:bookingId/notes', updateLessonNotes);

// Availability management
router.put('/availability/update', updateAvailability);

// Reports
router.get('/reports/earnings', getEarningsReport);

export default router;