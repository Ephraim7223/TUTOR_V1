import express from "express";

import userRoutes from './user.routes.js';
import tutorRoutes from './tutor.routes.js';
import bookingRoutes from './booking.routes.js';
import adminRoutes from './admin.routes.js';

const router = express.Router()

router.use('/users', userRoutes);
router.use('/tutors', tutorRoutes);
router.use('/bookings', bookingRoutes);
router.use('/admin', adminRoutes);

export default router;