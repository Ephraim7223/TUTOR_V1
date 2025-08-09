import User from '../models/user.model.js';
import Tutor from '../models/tutor.model.js';
import { Booking } from '../models/booking.model.js';
import Rating from '../models/rating.model.js';

// USER MANAGEMENT

export const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const query = {};

    // Add search functionality
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Get booking counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const bookingCount = await Booking.countDocuments({ studentId: user._id });
        const completedLessons = await Booking.countDocuments({ 
          studentId: user._id, 
          status: 'completed' 
        });
        return {
          ...user.toObject(),
          stats: {
            totalBookings: bookingCount,
            completedLessons
          }
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        users: usersWithStats,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving users',
      error: error.message,
    });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'User is already deactivated',
      });
    }

    user.isActive = false;
    user.deactivationReason = reason;
    user.deactivatedAt = new Date();

    await user.save();

    // Cancel all pending and confirmed bookings for this user
    await Booking.updateMany(
      { 
        studentId: userId, 
        status: { $in: ['pending', 'confirmed'] },
        scheduledDate: { $gte: new Date() }
      },
      { 
        status: 'cancelled',
        cancellationReason: 'User account deactivated by admin',
        cancelledBy: 'admin',
        cancelledAt: new Date()
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'User deactivated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deactivating user',
      error: error.message,
    });
  }
};

export const activateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'User is already active',
      });
    }

    user.isActive = true;
    user.reactivatedAt = new Date();
    // Clear deactivation fields
    user.deactivationReason = undefined;
    user.deactivatedAt = undefined;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'User activated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while activating user',
      error: error.message,
    });
  }
};

// BOOKING MANAGEMENT

export const getAllBookings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      startDate, 
      endDate,
      search,
      sortBy = 'scheduledDate',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Add filters
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    let bookingsQuery = Booking.find(query)
      .populate('studentId', 'fullName email location')
      .populate('tutorId', 'fullName email subjects location')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Add search functionality if provided
    if (search) {
      bookingsQuery = Booking.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        {
          $lookup: {
            from: 'tutors',
            localField: 'tutorId',
            foreignField: '_id',
            as: 'tutor'
          }
        },
        {
          $match: {
            ...query,
            $or: [
              { 'student.fullName': { $regex: search, $options: 'i' } },
              { 'student.email': { $regex: search, $options: 'i' } },
              { 'tutor.fullName': { $regex: search, $options: 'i' } },
              { 'tutor.email': { $regex: search, $options: 'i' } },
              { subject: { $regex: search, $options: 'i' } }
            ]
          }
        },
        {
          $addFields: {
            studentId: { $arrayElemAt: ['$student', 0] },
            tutorId: { $arrayElemAt: ['$tutor', 0] }
          }
        },
        {
          $project: {
            student: 0,
            tutor: 0
          }
        },
        { $sort: sort },
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 }
      ]);
    }

    const bookings = await bookingsQuery;
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

export const handleDispute = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { 
      disputeStatus, 
      adminNotes, 
      resolution, 
      refundAmount,
      refundToStudent 
    } = req.body;

    if (!disputeStatus) {
      return res.status(400).json({
        status: 'error',
        message: 'Dispute status is required',
      });
    }

    const validDisputeStatuses = ['under_review', 'resolved_student', 'resolved_tutor', 'resolved_partial', 'dismissed'];
    if (!validDisputeStatuses.includes(disputeStatus)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid dispute status',
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate('studentId', 'fullName email')
      .populate('tutorId', 'fullName email');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found',
      });
    }

    // Add dispute handling fields to booking
    booking.disputeStatus = disputeStatus;
    booking.adminNotes = adminNotes;
    booking.disputeResolution = resolution;
    booking.disputeResolvedAt = new Date();

    // Handle refunds if specified
    if (refundAmount && refundToStudent) {
      booking.refundAmount = parseFloat(refundAmount);
      booking.refundProcessed = true;
      booking.paymentStatus = 'refunded';
    }

    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Dispute handled successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while handling dispute',
      error: error.message,
    });
  }
};

// STATISTICS AND ANALYTICS

export const getUserStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateQuery = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
      if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
    }

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsersThisMonth,
      usersWithBookings
    ] = await Promise.all([
      User.countDocuments(dateQuery),
      User.countDocuments({ ...dateQuery, isActive: true }),
      User.countDocuments({ ...dateQuery, isActive: false }),
      User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }),
      User.countDocuments({
        ...dateQuery,
        _id: { 
          $in: await Booking.distinct('studentId', { status: { $in: ['confirmed', 'completed'] } })
        }
      })
    ]);

    // Get user registration trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const registrationTrends = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        newUsersThisMonth,
        usersWithBookings,
        engagementRate: totalUsers > 0 ? ((usersWithBookings / totalUsers) * 100).toFixed(1) : 0,
        registrationTrends
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving user stats',
      error: error.message,
    });
  }
};

export const getTutorStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateQuery = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
      if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
    }

    const [
      totalTutors,
      activeTutors,
      inactiveTutors,
      verifiedTutors,
      newTutorsThisMonth,
      tutorsWithBookings
    ] = await Promise.all([
      Tutor.countDocuments(dateQuery),
      Tutor.countDocuments({ ...dateQuery, isActive: true }),
      Tutor.countDocuments({ ...dateQuery, isActive: false }),
      Tutor.countDocuments({ ...dateQuery, isVerified: true }),
      Tutor.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }),
      Tutor.countDocuments({
        ...dateQuery,
        _id: { 
          $in: await Booking.distinct('tutorId', { status: { $in: ['confirmed', 'completed'] } })
        }
      })
    ]);

    // Get top performing tutors
    const topTutors = await Tutor.find({ isActive: true })
      .select('fullName averageRating totalRatings')
      .sort({ averageRating: -1, totalRatings: -1 })
      .limit(10);

    // Get subject distribution
    const subjectDistribution = await Tutor.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$subjects' },
      {
        $group: {
          _id: '$subjects',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get average hourly rates by subject
    const averageRatesBySubject = await Tutor.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$subjects' },
      {
        $group: {
          _id: '$subjects',
          averageRate: { $avg: '$hourlyRate' },
          count: { $sum: 1 }
        }
      },
      { $sort: { averageRate: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalTutors,
        activeTutors,
        inactiveTutors,
        verifiedTutors,
        newTutorsThisMonth,
        tutorsWithBookings,
        utilizationRate: totalTutors > 0 ? ((tutorsWithBookings / totalTutors) * 100).toFixed(1) : 0,
        topTutors,
        subjectDistribution,
        averageRatesBySubject
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving tutor stats',
      error: error.message,
    });
  }
};

export const getSystemStats = async (req, res) => {
  try {
    const { period = '30' } = req.query; // Default to last 30 days

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get overall system metrics
    const [
      totalUsers,
      totalTutors,
      totalBookings,
      completedBookings,
      totalRevenue,
      averageRating,
      totalRatings
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Tutor.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).then(result => result[0]?.total || 0),
      Rating.aggregate([
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ]).then(result => result[0]?.avg || 0),
      Rating.countDocuments()
    ]);

    // Get platform metrics for the specified period
    const periodBookings = await Booking.countDocuments({
      createdAt: { $gte: startDate }
    });

    const periodRevenue = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          scheduledDate: { $gte: startDate }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).then(result => result[0]?.total || 0);

    // Get booking trends (daily for last 30 days, weekly for longer periods)
    const groupFormat = periodDays <= 30 ? "%Y-%m-%d" : "%Y-W%V";
    const bookingTrends = await Booking.aggregate([
      {
        $match: {
          scheduledDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$scheduledDate" } },
          bookings: { $sum: 1 },
          revenue: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] 
            } 
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get popular subjects
    const popularSubjects = await Booking.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'completed'] },
          scheduledDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$subject',
          count: { $sum: 1 },
          revenue: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] 
            } 
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Calculate key metrics
    const bookingConversionRate = totalBookings > 0 
      ? ((completedBookings / totalBookings) * 100).toFixed(1) 
      : 0;

    const averageBookingValue = completedBookings > 0 
      ? (totalRevenue / completedBookings).toFixed(2) 
      : 0;

    // Platform growth metrics
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);

    const previousPeriodBookings = await Booking.countDocuments({
      createdAt: { 
        $gte: previousPeriodStart, 
        $lt: startDate 
      }
    });

    const bookingGrowthRate = previousPeriodBookings > 0
      ? (((periodBookings - previousPeriodBookings) / previousPeriodBookings) * 100).toFixed(1)
      : periodBookings > 0 ? '100.0' : '0.0';

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalUsers,
          totalTutors,
          totalBookings,
          completedBookings,
          totalRevenue: totalRevenue.toFixed(2),
          averageRating: averageRating.toFixed(1),
          totalRatings
        },
        periodMetrics: {
          period: `${periodDays} days`,
          bookings: periodBookings,
          revenue: periodRevenue.toFixed(2),
          bookingGrowthRate: `${bookingGrowthRate}%`,
          averageBookingValue,
          bookingConversionRate: `${bookingConversionRate}%`
        },
        trends: {
          bookingTrends,
          popularSubjects
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving system stats',
      error: error.message,
    });
  }
};

// ADDITIONAL ADMIN FUNCTIONS

export const getAllTutors = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      verified,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const query = {};

    // Add search functionality
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { subjects: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Filter by status
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Filter by verification
    if (verified === 'true') {
      query.isVerified = true;
    } else if (verified === 'false') {
      query.isVerified = false;
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

    // Get booking counts for each tutor
    const tutorsWithStats = await Promise.all(
      tutors.map(async (tutor) => {
        const bookingCount = await Booking.countDocuments({ tutorId: tutor._id });
        const completedLessons = await Booking.countDocuments({ 
          tutorId: tutor._id, 
          status: 'completed' 
        });
        const totalEarnings = await Booking.aggregate([
          { 
            $match: { 
              tutorId: tutor._id, 
              status: 'completed' 
            } 
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]).then(result => result[0]?.total || 0);

        return {
          ...tutor.toObject(),
          stats: {
            totalBookings: bookingCount,
            completedLessons,
            totalEarnings: totalEarnings.toFixed(2)
          }
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        tutors: tutorsWithStats,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
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

// Tutor activation/deactivation (similar to users but for tutors)
export const deactivateTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const { reason } = req.body;

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      return res.status(404).json({
        status: 'error',
        message: 'Tutor not found',
      });
    }

    if (!tutor.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Tutor is already deactivated',
      });
    }

    tutor.isActive = false;
    tutor.deactivationReason = reason;
    tutor.deactivatedAt = new Date();

    await tutor.save();

    // Cancel all future bookings for this tutor
    await Booking.updateMany(
      { 
        tutorId: tutorId, 
        status: { $in: ['pending', 'confirmed'] },
        scheduledDate: { $gte: new Date() }
      },
      { 
        status: 'cancelled',
        cancellationReason: 'Tutor account deactivated by admin',
        cancelledBy: 'admin',
        cancelledAt: new Date()
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Tutor deactivated successfully',
      data: tutor
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deactivating tutor',
      error: error.message,
    });
  }
};

export const activateTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      return res.status(404).json({
        status: 'error',
        message: 'Tutor not found',
      });
    }

    if (tutor.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Tutor is already active',
      });
    }

    tutor.isActive = true;
    tutor.reactivatedAt = new Date();
    // Clear deactivation fields
    tutor.deactivationReason = undefined;
    tutor.deactivatedAt = undefined;

    await tutor.save();

    res.status(200).json({
      status: 'success',
      message: 'Tutor activated successfully',
      data: tutor
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while activating tutor',
      error: error.message,
    });
  }
};