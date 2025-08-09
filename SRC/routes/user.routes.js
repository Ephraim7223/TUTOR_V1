// user.routes.js
import express from 'express';
import {
  signup,
  signin,
  updatePassword,
  getMe,
  updateProfile,
  // Booking functions
  createBooking,
  getUserBookings,
  cancelBooking,
  // Rating functions
  rateTutor,
  getUserRatings,
  // Dashboard functions
  getUserDashboard,
  // Search functions
  searchTutors,
  // Wishlist functions
  addToWishlist,
  removeFromWishlist,
  getWishlist
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);

// Public search route (users can search tutors without being logged in)
router.get('/search-tutors', searchTutors);

// Protected routes (require authentication)
router.use(authenticateToken); // Apply middleware to all routes below

// Profile routes
router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);

// Dashboard route
router.get('/dashboard', getUserDashboard);

// Booking routes
router.post('/bookings', createBooking);
router.get('/bookings', getUserBookings);
router.put('/bookings/:bookingId/cancel', cancelBooking);

// Rating routes
router.post('/tutors/:tutorId/rate', rateTutor);
router.get('/ratings', getUserRatings);

// Wishlist routes
router.post('/wishlist/:tutorId', addToWishlist);
router.delete('/wishlist/:tutorId', removeFromWishlist);
router.get('/wishlist', getWishlist);

export default router;