// booking.routes.js (Optional - for shared booking operations)
import express from 'express';
import {
  getBookingById,
  updateBookingStatus,
  rescheduleBooking,
  addMeetingLink,
  addTutorFeedback
} from '../controllers/booking.controller.js';
import { authenticateToken, authorizeBookingAccess } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/:bookingId', authorizeBookingAccess, getBookingById);
router.put('/:bookingId/status', authorizeBookingAccess, updateBookingStatus);
router.put('/:bookingId/reschedule', authorizeBookingAccess, rescheduleBooking);

router.put('/:bookingId/meeting-link', authorizeBookingAccess, addMeetingLink);
router.put('/:bookingId/feedback', authorizeBookingAccess, addTutorFeedback);

export default router;
