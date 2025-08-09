import { Booking } from '../models/booking.model.js';
import User from '../models/user.model.js';
import Tutor from '../models/tutor.model.js';

// Get booking by ID (accessible to both student and tutor involved)
export const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate('studentId', 'fullName email location')
      .populate('tutorId', 'fullName email subjects hourlyRate location');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving the booking',
      error: error.message,
    });
  }
};

// Update booking status (mainly for tutors to confirm/decline)
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, reason } = req.body;
    const { id, role } = req.user;

    if (!status) {
      return res.status(400).json({
        status: 'error',
        message: 'Status is required',
      });
    }

    const validStatuses = ['confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status. Must be confirmed, cancelled, or completed',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found',
      });
    }

    // Check if current status allows the transition
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot update status of completed or cancelled booking',
      });
    }

    // Only tutors can confirm bookings, both can cancel
    if (status === 'confirmed' && role !== 'tutor') {
      return res.status(403).json({
        status: 'error',
        message: 'Only tutors can confirm bookings',
      });
    }

    // Only tutors can mark as completed
    if (status === 'completed' && role !== 'tutor') {
      return res.status(403).json({
        status: 'error',
        message: 'Only tutors can mark bookings as completed',
      });
    }

    // For cancellation, check timing constraints
    if (status === 'cancelled') {
      const hoursBefore = (new Date(booking.scheduledDate) - new Date()) / (1000 * 60 * 60);
      
      // Students have 24-hour cancellation policy
      if (role === 'student' && hoursBefore < 24) {
        return res.status(400).json({
          status: 'error',
          message: 'Bookings can only be cancelled 24 hours before the scheduled time',
        });
      }

      // Set cancellation details
      booking.cancellationReason = reason;
      booking.cancelledBy = role === 'tutor' ? 'tutor' : 'student';
      booking.cancelledAt = new Date();
    }

    booking.status = status;
    await booking.save();

    // Populate for response
    await booking.populate([
      { path: 'studentId', select: 'fullName email' },
      { path: 'tutorId', select: 'fullName email subjects' }
    ]);

    let message = 'Booking status updated successfully';
    if (status === 'confirmed') {
      message = 'Booking confirmed successfully';
    } else if (status === 'cancelled') {
      message = 'Booking cancelled successfully';
    } else if (status === 'completed') {
      message = 'Booking marked as completed';
    }

    res.status(200).json({
      status: 'success',
      message,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating booking status',
      error: error.message,
    });
  }
};

// Reschedule booking
export const rescheduleBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { newScheduledDate, newStartTime, newEndTime, reason } = req.body;
    const { id, role } = req.user;

    if (!newScheduledDate) {
      return res.status(400).json({
        status: 'error',
        message: 'New scheduled date is required',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found',
      });
    }

    // Check if booking can be rescheduled
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot reschedule completed or cancelled booking',
      });
    }

    // Check timing constraints (at least 24 hours before current scheduled time)
    const hoursBefore = (new Date(booking.scheduledDate) - new Date()) / (1000 * 60 * 60);
    if (hoursBefore < 24) {
      return res.status(400).json({
        status: 'error',
        message: 'Bookings can only be rescheduled 24 hours before the scheduled time',
      });
    }

    // Check for conflicts with new time
    const newDate = new Date(newScheduledDate);
    const conflictingBooking = await Booking.findOne({
      tutorId: booking.tutorId,
      scheduledDate: {
        $gte: newDate,
        $lt: new Date(newDate.getTime() + booking.duration * 60 * 60 * 1000)
      },
      status: { $in: ['pending', 'confirmed'] },
      _id: { $ne: bookingId }
    });

    if (conflictingBooking) {
      return res.status(400).json({
        status: 'error',
        message: 'Tutor is not available at the requested new time',
      });
    }

    // Store original date and update
    booking.originalScheduledDate = booking.scheduledDate;
    booking.scheduledDate = newDate;
    
    if (newStartTime) booking.startTime = newStartTime;
    if (newEndTime) booking.endTime = newEndTime;
    
    booking.rescheduleReason = reason;
    booking.rescheduledBy = role === 'tutor' ? 'tutor' : 'student';
    booking.status = 'rescheduled';

    await booking.save();

    // Populate for response
    await booking.populate([
      { path: 'studentId', select: 'fullName email' },
      { path: 'tutorId', select: 'fullName email subjects' }
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Booking rescheduled successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while rescheduling the booking',
      error: error.message,
    });
  }
};

// Add meeting link (typically by tutor)
export const addMeetingLink = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { meetingLink, location } = req.body;
    const { role } = req.user;

    if (!meetingLink && !location) {
      return res.status(400).json({
        status: 'error',
        message: 'Meeting link or location is required',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found',
      });
    }

    // Only tutors can typically add meeting links, but allow students too for flexibility
    if (meetingLink) {
      // Basic URL validation
      try {
        new URL(meetingLink);
      } catch (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid meeting link URL',
        });
      }
      booking.meetingLink = meetingLink;
    }

    if (location) {
      booking.location = location;
    }

    await booking.save();

    // Populate for response
    await booking.populate([
      { path: 'studentId', select: 'fullName email' },
      { path: 'tutorId', select: 'fullName email subjects' }
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Meeting details updated successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating meeting details',
      error: error.message,
    });
  }
};

// Add tutor feedback (only tutors can add feedback)
export const addTutorFeedback = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { feedback } = req.body;
    const { id, role } = req.user;

    if (!feedback) {
      return res.status(400).json({
        status: 'error',
        message: 'Feedback is required',
      });
    }

    if (role !== 'tutor') {
      return res.status(403).json({
        status: 'error',
        message: 'Only tutors can add feedback',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found',
      });
    }

    // Verify the tutor owns this booking
    if (booking.tutorId.toString() !== id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only add feedback to your own bookings',
      });
    }

    // Feedback can only be added to completed bookings
    if (booking.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Feedback can only be added to completed bookings',
      });
    }

    booking.tutorFeedback = feedback;
    await booking.save();

    // Populate for response
    await booking.populate([
      { path: 'studentId', select: 'fullName email' },
      { path: 'tutorId', select: 'fullName email subjects' }
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Feedback added successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while adding feedback',
      error: error.message,
    });
  }
};

// Additional helper function - Get booking analytics (can be useful for both parties)
export const getBookingAnalytics = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { startDate, endDate } = req.query;

    const query = role === 'tutor' ? { tutorId: id } : { studentId: id };

    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    const [
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings
    ] = await Promise.all([
      Booking.countDocuments(query),
      Booking.countDocuments({ ...query, status: 'confirmed' }),
      Booking.countDocuments({ ...query, status: 'completed' }),
      Booking.countDocuments({ ...query, status: 'cancelled' }),
      Booking.countDocuments({ ...query, status: 'pending' })
    ]);

    // Calculate total earnings/spent for completed bookings
    const completedBookingsList = await Booking.find({ 
      ...query, 
      status: 'completed' 
    });
    const totalAmount = completedBookingsList.reduce((sum, booking) => {
      return sum + (booking.totalAmount || 0);
    }, 0);

    const analytics = {
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      [role === 'tutor' ? 'totalEarnings' : 'totalSpent']: totalAmount.toFixed(2),
      completionRate: totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : 0,
      cancellationRate: totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : 0
    };

    res.status(200).json({
      status: 'success',
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving booking analytics',
      error: error.message,
    });
  }
};