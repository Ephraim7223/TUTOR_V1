import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import User from '../models/user.model.js';
import Tutor from '../models/tutor.model.js';
import { Booking } from '../models/booking.model.js';
import { Rating } from '../models/rating.model.js';
import dotenv from 'dotenv';
dotenv.config();

export const signup = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, location } = req.body;

    if (!fullName || !email || !password || !confirmPassword || !location) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Passwords do not match',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email',
      });
    }

    const hashedPassword = await argon2.hash(password);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      location,
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: newUser,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while signing up',
      error: error.message,
    });
  }
};

export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated. Please contact support.',
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      status: 'success',
      message: 'Signin successful',
      data: {
        user,
        token
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while signing in',
      error: error.message,
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { id } = req.user;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Old and new passwords are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const isMatch = await argon2.verify(user.password, oldPassword);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Old password is incorrect',
      });
    }

    const hashedNewPassword = await argon2.hash(newPassword);

    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the password',
      error: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const { id } = req.user;
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving profile',
      error: error.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { fullName, email, location } = req.body;

    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already exists',
        });
      }
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.location = location || user.location;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating profile',
      error: error.message,
    });
  }
};

// NEW BOOKING FUNCTIONS

export const createBooking = async (req, res) => {
  try {
    const { id } = req.user;
    const {
      tutorId,
      subject,
      scheduledDate,
      duration,
      notes,
      meetingPreference
    } = req.body;

    if (!tutorId || !subject || !scheduledDate || !duration) {
      return res.status(400).json({
        status: 'error',
        message: 'Tutor ID, subject, scheduled date, and duration are required',
      });
    }

    // Validate tutor exists and is active
    const tutor = await Tutor.findById(tutorId);
    if (!tutor || !tutor.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Tutor not found or not available',
      });
    }

    // Check if tutor teaches the requested subject
    if (!tutor.subjects.includes(subject)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tutor does not teach this subject',
      });
    }

    // Calculate total amount and time slots
    const totalAmount = tutor.hourlyRate * duration;
    const startTime = new Date(scheduledDate);
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    // Check for booking conflicts
    const conflictingBooking = await Booking.findOne({
      tutorId,
      $or: [
        {
          // New booking starts during existing booking
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ],
      status: { $in: ['pending', 'confirmed'] }
    });

    if (conflictingBooking) {
      return res.status(400).json({
        status: 'error',
        message: 'Tutor is not available at the requested time',
      });
    }

    const newBooking = new Booking({
      studentId: id,
      tutorId,
      subject,
      scheduledDate: startTime,
      startTime: startTime,
      endTime: endTime,
      duration,
      hourlyRate: tutor.hourlyRate,
      totalAmount,
      notes,
      meetingPreference,
      status: 'pending'
    });

    await newBooking.save();

    // Populate tutor details for response
    await newBooking.populate('tutorId', 'fullName email subjects hourlyRate');

    res.status(201).json({
      status: 'success',
      message: 'Booking created successfully. Waiting for tutor confirmation.',
      data: newBooking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the booking',
      error: error.message,
    });
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const { id } = req.user;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    const query = { studentId: id };

    // Add filters
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    const bookings = await Booking.find(query)
      .populate('tutorId', 'fullName email subjects hourlyRate location')
      .sort({ scheduledDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        bookings,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving bookings',
      error: error.message,
    });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.user;
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, studentId: id });
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found',
      });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot cancel this booking',
      });
    }

    // Check cancellation policy (e.g., 24 hours before)
    const hoursBefore = (new Date(booking.scheduledDate) - new Date()) / (1000 * 60 * 60);
    if (hoursBefore < 24) {
      return res.status(400).json({
        status: 'error',
        message: 'Bookings can only be cancelled 24 hours before the scheduled time',
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledBy = 'student';
    booking.cancelledAt = new Date();

    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while cancelling the booking',
      error: error.message,
    });
  }
};

// RATING FUNCTIONS

export const rateTutor = async (req, res) => {
  try {
    const { id } = req.user;
    const { tutorId } = req.params;
    const { rating, comment, bookingId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be between 1 and 5',
      });
    }

    // Verify the booking exists and is completed
    const booking = await Booking.findOne({
      _id: bookingId,
      studentId: id,
      tutorId,
      status: 'completed'
    });

    if (!booking) {
      return res.status(400).json({
        status: 'error',
        message: 'You can only rate tutors after completing a lesson',
      });
    }

    // Check if already rated
    const existingRating = await Rating.findOne({
      studentId: id,
      tutorId,
      bookingId
    });

    if (existingRating) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already rated this tutor for this lesson',
      });
    }

    const newRating = new Rating({
      studentId: id,
      tutorId,
      bookingId,
      rating,
      comment
    });

    await newRating.save();

    // Update tutor's average rating
    const tutorRatings = await Rating.find({ tutorId });
    const averageRating = tutorRatings.reduce((sum, r) => sum + r.rating, 0) / tutorRatings.length;
    
    await Tutor.findByIdAndUpdate(tutorId, {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalRatings: tutorRatings.length
    });

    await newRating.populate('tutorId', 'fullName');

    res.status(201).json({
      status: 'success',
      message: 'Rating submitted successfully',
      data: newRating
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while submitting the rating',
      error: error.message,
    });
  }
};

export const getUserRatings = async (req, res) => {
  try {
    const { id } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const ratings = await Rating.find({ studentId: id })
      .populate('tutorId', 'fullName subjects')
      .populate('bookingId', 'subject scheduledDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Rating.countDocuments({ studentId: id });

    res.status(200).json({
      status: 'success',
      data: {
        ratings,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving ratings',
      error: error.message,
    });
  }
};

// DASHBOARD FUNCTIONS

export const getUserDashboard = async (req, res) => {
  try {
    const { id } = req.user;

    // Get total bookings
    const totalBookings = await Booking.countDocuments({ studentId: id });

    // Get completed lessons
    const completedLessons = await Booking.countDocuments({ 
      studentId: id, 
      status: 'completed' 
    });

    // Get total spent
    const completedBookings = await Booking.find({ 
      studentId: id, 
      status: 'completed' 
    });
    const totalSpent = completedBookings.reduce((sum, booking) => {
      return sum + (booking.totalAmount || 0);
    }, 0);

    // Get favorite tutors (most booked)
    const tutorBookings = await Booking.aggregate([
      { $match: { studentId: id, status: { $in: ['completed', 'confirmed'] } } },
      { $group: { _id: '$tutorId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const favoriteTutorIds = tutorBookings.map(tb => tb._id);
    const favoriteTutors = await Tutor.find({ _id: { $in: favoriteTutorIds } })
      .select('fullName subjects averageRating');

    // Get upcoming lessons
    const upcomingLessons = await Booking.find({
      studentId: id,
      status: 'confirmed',
      scheduledDate: { $gte: new Date() }
    })
    .populate('tutorId', 'fullName subjects')
    .sort({ scheduledDate: 1 })
    .limit(5);

    // Get recent activity
    const recentBookings = await Booking.find({ studentId: id })
      .populate('tutorId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentRatings = await Rating.find({ studentId: id })
      .populate('tutorId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentActivity = [
      ...recentBookings.map(booking => ({
        type: 'booking',
        action: `Booked lesson with ${booking.tutorId?.fullName || 'Unknown'}`,
        date: booking.createdAt,
        status: booking.status
      })),
      ...recentRatings.map(rating => ({
        type: 'rating',
        action: `Rated ${rating.tutorId?.fullName || 'Unknown'} ${rating.rating} stars`,
        date: rating.createdAt
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalBookings,
          completedLessons,
          totalSpent: totalSpent.toFixed(2),
          favoriteTutorsCount: favoriteTutors.length
        },
        upcomingLessons,
        favoriteTutors,
        recentActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving dashboard data',
      error: error.message,
    });
  }
};

// SEARCH AND DISCOVERY

export const searchTutors = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      subject, 
      location, 
      minRate, 
      maxRate, 
      minRating,
      sortBy = 'averageRating',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };

    // Add filters
    if (subject) {
      query.subjects = { $in: [new RegExp(subject, 'i')] };
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    if (minRate || maxRate) {
      query.hourlyRate = {};
      if (minRate) query.hourlyRate.$gte = parseFloat(minRate);
      if (maxRate) query.hourlyRate.$lte = parseFloat(maxRate);
    }
    if (minRating) {
      query.averageRating = { $gte: parseFloat(minRating) };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const tutors = await Tutor.find(query)
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Tutor.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        tutors,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while searching tutors',
      error: error.message,
    });
  }
};

// WISHLIST FUNCTIONS

export const addToWishlist = async (req, res) => {
  try {
    const { id } = req.user;
    const { tutorId } = req.params;

    // Verify tutor exists
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      return res.status(404).json({
        status: 'error',
        message: 'Tutor not found',
      });
    }

    const user = await User.findById(id);
    if (!user.wishlist) {
      user.wishlist = [];
    }

    if (user.wishlist.includes(tutorId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tutor already in wishlist',
      });
    }

    user.wishlist.push(tutorId);
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Tutor added to wishlist',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while adding to wishlist',
      error: error.message,
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.user;
    const { tutorId } = req.params;

    const user = await User.findById(id);
    if (!user.wishlist || !user.wishlist.includes(tutorId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tutor not in wishlist',
      });
    }

    user.wishlist = user.wishlist.filter(tId => tId.toString() !== tutorId);
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Tutor removed from wishlist',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while removing from wishlist',
      error: error.message,
    });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const { id } = req.user;

    const user = await User.findById(id).populate({
      path: 'wishlist',
      select: 'fullName subjects hourlyRate averageRating totalRatings location',
      match: { isActive: true }
    });

    res.status(200).json({
      status: 'success',
      data: user.wishlist || []
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving wishlist',
      error: error.message,
    });
  }
};