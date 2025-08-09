import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Booking } from '../models/booking.model.js';
import User from '../models/user.model.js';
import Tutor from '../models/tutor.model.js';
import dotenv from 'dotenv';
dotenv.config();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access token is required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  });
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

export const requireAdmin = authorizeRoles('admin');

export const requireTutor = authorizeRoles('tutor');

export const requireUser = authorizeRoles('user');

export const requireUserOrTutor = authorizeRoles('user', 'tutor');

export const authorizeBookingAccess = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid booking ID format'
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    let hasAccess = false;

    if (userRole === 'admin') {
      // Admins can access all bookings
      hasAccess = true;
    } else if (userRole === 'user' && booking.studentId.toString() === userId) {
      // Students can access their own bookings
      hasAccess = true;
    } else if (userRole === 'tutor' && booking.tutorId.toString() === userId) {
      // Tutors can access bookings they're assigned to
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only access your own bookings.'
      });
    }

    req.booking = booking;
    next();
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error checking booking access',
      error: error.message
    });
  }
};