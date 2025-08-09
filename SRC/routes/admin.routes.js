import express from 'express';
import {
  getAllUsers,
  getAllBookings,
  getUserStats,
  getTutorStats,
  getSystemStats,
  deactivateUser,
  activateUser,
  handleDispute
} from '../controllers/admin.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/users', getAllUsers);
router.put('/users/:userId/deactivate', deactivateUser);
router.put('/users/:userId/activate', activateUser);

router.get('/bookings', getAllBookings);
router.put('/bookings/:bookingId/dispute', handleDispute);

router.get('/stats/users', getUserStats);
router.get('/stats/tutors', getTutorStats);
router.get('/stats/system', getSystemStats);

export default router;