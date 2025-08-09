import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import Tutor from '../models/tutor.model.js';
import dotenv from 'dotenv';
dotenv.config();

export const signup = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      location,
      bio,
      education,
      experience,
      hourlyRate,
      languages,
      subjects
    } = req.body;

    if (!fullName || !email || !password || !confirmPassword || !location || 
        !bio || !education || experience === undefined || hourlyRate === undefined || 
        !languages || !subjects) {
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

    if (experience < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Experience must be a positive number',
      });
    }

    if (hourlyRate < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Hourly rate must be a positive number',
      });
    }

    const existingTutor = await Tutor.findOne({ email });
    if (existingTutor) {
      return res.status(400).json({
        status: 'error',
        message: 'Tutor already exists with this email',
      });
    }

    const hashedPassword = await argon2.hash(password);

    const newTutor = new Tutor({
      fullName,
      email,
      password: hashedPassword,
      location,
      bio,
      education,
      experience: parseInt(experience),
      hourlyRate: parseFloat(hourlyRate),
      languages: Array.isArray(languages) ? languages : [languages],
      subjects: Array.isArray(subjects) ? subjects : [subjects],
    });

    await newTutor.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: newTutor._id, role: newTutor.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      status: 'success',
      message: 'Tutor registered successfully. Your account is pending verification.',
      data: {
        tutor: newTutor,
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

    const tutor = await Tutor.findOne({ email });
    if (!tutor) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    const isMatch = await argon2.verify(tutor.password, password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    if (!tutor.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated. Please contact support.',
      });
    }

    const token = jwt.sign(
      { id: tutor._id, role: tutor.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      status: 'success',
      message: 'Signin successful',
      data: {
        tutor,
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

    const tutor = await Tutor.findById(id);
    if (!tutor) {
      return res.status(404).json({
        status: 'error',
        message: 'Tutor not found',
      });
    }

    const isMatch = await argon2.verify(tutor.password, oldPassword);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Old password is incorrect',
      });
    }

    const hashedNewPassword = await argon2.hash(newPassword);

    tutor.password = hashedNewPassword;
    await tutor.save();

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
    const tutor = await Tutor.findById(id).select('-password');
    if (!tutor) {
      return res.status(404).json({
        status: 'error',
        message: 'Tutor not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: tutor,
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
    const {
      fullName,
      email,
      location,
      bio,
      education,
      experience,
      hourlyRate,
      languages,
      subjects
    } = req.body;

    if (email) {
      const existingTutor = await Tutor.findOne({ email, _id: { $ne: id } });
      if (existingTutor) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already exists',
        });
      }
    }

    const tutor = await Tutor.findById(id);
    if (!tutor) {
      return res.status(404).json({
        status: 'error',
        message: 'Tutor not found',
      });
    }

    // Update fields if provided
    tutor.fullName = fullName || tutor.fullName;
    tutor.email = email || tutor.email;
    tutor.location = location || tutor.location;
    tutor.bio = bio || tutor.bio;
    tutor.education = education || tutor.education;
    
    if (experience !== undefined) {
      if (experience < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Experience must be a positive number',
        });
      }
      tutor.experience = parseInt(experience);
    }
    
    if (hourlyRate !== undefined) {
      if (hourlyRate < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Hourly rate must be a positive number',
        });
      }
      tutor.hourlyRate = parseFloat(hourlyRate);
    }
    
    if (languages) {
      tutor.languages = Array.isArray(languages) ? languages : [languages];
    }
    
    if (subjects) {
      tutor.subjects = Array.isArray(subjects) ? subjects : [subjects];
    }

    await tutor.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: tutor,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating profile',
      error: error.message,
    });
  }
};

export const getAllTutors = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, location, minRate, maxRate } = req.query;

    const query = { isActive: true };

    // Add filters if provided
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

    const tutors = await Tutor.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Tutor.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        tutors,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving tutors',
      error: error.message,
    });
  }
};

export const getTutorById = async (req, res) => {
  try {
    const { id } = req.params;
    const tutor = await Tutor.findById(id).select('-password');
    
    if (!tutor) {
      return res.status(404).json({
        status: 'error',
        message: 'Tutor not found',
      });
    }

    if (!tutor.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Tutor is not available',
      });
    }

    res.status(200).json({
      status: 'success',
      data: tutor,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving tutor',
      error: error.message,
    });
  }
};

// NEW DASHBOARD FUNCTIONS

export const getDashboardStats = async (req, res) => {
  try {
    const { id } = req.user;
    
    // You'll need to import these models or create them
    // import Booking from '../models/booking.model.js';
    // import Rating from '../models/rating.model.js';
    
    // Get total bookings count
    const totalBookings = await Booking.countDocuments({ 
      tutorId: id,
      status: { $in: ['confirmed', 'completed'] }
    });

    // Get unique students count
    const uniqueStudents = await Booking.distinct('studentId', { 
      tutorId: id,
      status: { $in: ['confirmed', 'completed'] }
    });

    // Calculate total earnings
    const completedBookings = await Booking.find({ 
      tutorId: id, 
      status: 'completed' 
    });
    const totalEarnings = completedBookings.reduce((sum, booking) => {
      return sum + (booking.totalAmount || 0);
    }, 0);

    // Get average rating
    const ratings = await Rating.find({ tutorId: id });
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        totalBookings,
        totalStudents: uniqueStudents.length,
        totalEarnings: totalEarnings.toFixed(2),
        averageRating: averageRating.toFixed(1),
        totalRatings: ratings.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving dashboard stats',
      error: error.message,
    });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const { id } = req.user;
    const { limit = 10 } = req.query;

    // Get recent bookings with student details
    const recentBookings = await Booking.find({ tutorId: id })
      .populate('studentId', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Get recent ratings
    const recentRatings = await Rating.find({ tutorId: id })
      .populate('studentId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Combine and sort by date
    const activities = [
      ...recentBookings.map(booking => ({
        type: 'booking',
        action: `New booking from ${booking.studentId?.fullName || 'Unknown'}`,
        date: booking.createdAt,
        status: booking.status,
        amount: booking.totalAmount
      })),
      ...recentRatings.map(rating => ({
        type: 'rating',
        action: `Received ${rating.rating}-star rating from ${rating.studentId?.fullName || 'Unknown'}`,
        date: rating.createdAt,
        rating: rating.rating,
        comment: rating.comment
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving recent activity',
      error: error.message,
    });
  }
};

export const getUpcomingLessons = async (req, res) => {
  try {
    const { id } = req.user;
    const { limit = 10 } = req.query;

    const now = new Date();
    const upcomingLessons = await Booking.find({
      tutorId: id,
      status: 'confirmed',
      scheduledDate: { $gte: now }
    })
    .populate('studentId', 'fullName email')
    .sort({ scheduledDate: 1 })
    .limit(parseInt(limit));

    const formattedLessons = upcomingLessons.map(lesson => ({
      id: lesson._id,
      student: lesson.studentId?.fullName || 'Unknown',
      studentEmail: lesson.studentId?.email,
      subject: lesson.subject,
      date: lesson.scheduledDate,
      duration: lesson.duration,
      amount: lesson.totalAmount,
      meetingLink: lesson.meetingLink,
      status: lesson.status
    }));

    res.status(200).json({
      status: 'success',
      data: formattedLessons
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving upcoming lessons',
      error: error.message,
    });
  }
};

export const getBookingHistory = async (req, res) => {
  try {
    const { id } = req.user;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    const query = { tutorId: id };

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
      .populate('studentId', 'fullName email')
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
      message: 'An error occurred while retrieving booking history',
      error: error.message,
    });
  }
};

export const updateAvailability = async (req, res) => {
  try {
    const { id } = req.user;
    const { availability } = req.body;

    if (!availability || !Array.isArray(availability)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid availability array is required',
      });
    }

    const tutor = await Tutor.findById(id);
    if (!tutor) {
      return res.status(404).json({
        status: 'error',
        message: 'Tutor not found',
      });
    }

    tutor.availability = availability;
    await tutor.save();

    res.status(200).json({
      status: 'success',
      message: 'Availability updated successfully',
      data: tutor.availability
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating availability',
      error: error.message,
    });
  }
};

export const getEarningsReport = async (req, res) => {
  try {
    const { id } = req.user;
    const { startDate, endDate, groupBy = 'month' } = req.query;

    const matchStage = {
      tutorId: id,
      status: 'completed'
    };

    if (startDate || endDate) {
      matchStage.scheduledDate = {};
      if (startDate) matchStage.scheduledDate.$gte = new Date(startDate);
      if (endDate) matchStage.scheduledDate.$lte = new Date(endDate);
    }

    let groupStage;
    if (groupBy === 'day') {
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$scheduledDate" } },
          totalEarnings: { $sum: "$totalAmount" },
          totalLessons: { $sum: 1 }
        }
      };
    } else if (groupBy === 'week') {
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-W%V", date: "$scheduledDate" } },
          totalEarnings: { $sum: "$totalAmount" },
          totalLessons: { $sum: 1 }
        }
      };
    } else { // month
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$scheduledDate" } },
          totalEarnings: { $sum: "$totalAmount" },
          totalLessons: { $sum: 1 }
        }
      };
    }

    const earnings = await Booking.aggregate([
      { $match: matchStage },
      groupStage,
      { $sort: { _id: 1 } }
    ]);

    const totalEarnings = earnings.reduce((sum, item) => sum + item.totalEarnings, 0);
    const totalLessons = earnings.reduce((sum, item) => sum + item.totalLessons, 0);

    res.status(200).json({
      status: 'success',
      data: {
        earnings,
        summary: {
          totalEarnings: totalEarnings.toFixed(2),
          totalLessons,
          averagePerLesson: totalLessons > 0 ? (totalEarnings / totalLessons).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while generating earnings report',
      error: error.message,
    });
  }
};