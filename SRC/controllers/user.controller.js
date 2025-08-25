import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import User from '../models/user.model.js';
import Tutor from '../models/tutor.model.js';
import { Booking } from '../models/booking.model.js';
import { Rating } from '../models/rating.model.js';
import { mailTransport } from '../config/googleapis.js';
import { mailGenerator } from '../config/mailgen.js';
import dotenv from 'dotenv';
dotenv.config();

// Email Templates Class for Students
class StudentEmailTemplates {
  
  // Welcome email for new student signup
  static generateWelcomeEmail(userData) {
    const { fullName, email, location } = userData;
    
    return mailGenerator.generate({
      body: {
        name: fullName,
        intro: [
          'Welcome to TUTOR! 🎓',
          'Your student account has been successfully created. You can now start finding and booking amazing tutors!'
        ],
        action: {
          instructions: 'Start exploring our tutors and book your first lesson today.',
          button: {
            color: '#22BC66',
            text: 'Find Tutors',
            link: `${process.env.FRONTEND_URL}/tutors`
          }
        },
        table: {
          data: [
            {
              item: 'Full Name',
              description: fullName
            },
            {
              item: 'Email Address',
              description: email
            },
            {
              item: 'Location',
              description: location
            },
            {
              item: 'Account Type',
              description: 'Student'
            }
          ]
        },
        outro: [
          'What you can do now:',
          '• Browse and search for qualified tutors',
          '• Book lessons with your preferred tutors',
          '• Rate and review your learning experiences',
          '• Track your learning progress',
          '',
          'Happy learning! 📚'
        ]
      }
    });
  }

  static generateLessonCompletionEmail(userData, lessonData) {
  const { fullName } = userData;
  const { tutorName, subject, lessonDate, duration, lessonNotes, nextSteps, bookingId } = lessonData;

  return mailGenerator.generate({
    body: {
      name: fullName,
      intro: `Your ${subject} lesson with ${tutorName} has been completed! 🎓`,
      action: {
        instructions: 'Rate your learning experience to help other students.',
        button: {
          color: '#22BC66',
          text: 'Rate This Lesson',
          link: `${process.env.FRONTEND_URL}/rate-lesson/${bookingId}`
        }
      },
      table: {
        data: [
          {
            item: 'Tutor',
            description: tutorName
          },
          {
            item: 'Subject',
            description: subject
          },
          {
            item: 'Lesson Date',
            description: new Date(lessonDate).toLocaleString()
          },
          {
            item: 'Duration',
            description: `${duration} ${duration === 1 ? 'hour' : 'hours'}`
          },
          ...(lessonNotes ? [{
            item: 'Lesson Notes',
            description: lessonNotes
          }] : []),
          ...(nextSteps ? [{
            item: 'Next Steps',
            description: nextSteps
          }] : [])
        ]
      },
      outro: [
        'Your feedback helps improve our tutoring community.',
        'Keep up the great learning! 📚'
      ]
    }
  });
}

static async sendLessonCompletionNotification(userData, lessonData) {
  try {
    const htmlContent = StudentEmailTemplates.generateLessonCompletionEmail(userData, lessonData);
    
    await mailTransport(
      userData.email,
      'Lesson Completed - Please Rate Your Experience! 🎓',
      htmlContent
    );
    
    console.log(`Lesson completion notification sent to ${userData.email}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send lesson completion notification:', error);
    return { success: false, error: error.message };
  }
}

  // Login success notification
  static generateLoginEmail(userData) {
    const { fullName, email, lastLogin } = userData;
    const loginTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return mailGenerator.generate({
      body: {
        name: fullName,
        intro: 'You have successfully signed in to your TUTOR student account.',
        action: {
          instructions: 'Continue your learning journey or book a new lesson.',
          button: {
            color: '#22BC66',
            text: 'Go to Dashboard',
            link: `${process.env.FRONTEND_URL}/dashboard`
          }
        },
        table: {
          data: [
            {
              item: 'Login Time',
              description: loginTime
            },
            {
              item: 'Account Type',
              description: '🎓 Student Account'
            },
            {
              item: 'Email',
              description: email
            },
            {
              item: 'Previous Login',
              description: lastLogin ? new Date(lastLogin).toLocaleString() : 'First time login'
            }
          ]
        },
        outro: [
          'Security Notice: If this wasn\'t you, please secure your account immediately.',
          '',
          'Keep learning! 📖'
        ]
      }
    });
  }

  // Booking confirmation email
  static generateBookingConfirmationEmail(userData, bookingData) {
    const { fullName } = userData;
    const { tutorName, subject, scheduledDate, duration, totalAmount, status } = bookingData;

    return mailGenerator.generate({
      body: {
        name: fullName,
        intro: 'Your booking has been created successfully! 📅',
        action: {
          instructions: 'View your booking details and prepare for your lesson.',
          button: {
            color: '#22BC66',
            text: 'View Booking Details',
            link: `${process.env.FRONTEND_URL}/bookings/${bookingData.id}`
          }
        },
        table: {
          data: [
            {
              item: 'Tutor',
              description: tutorName || 'Loading...'
            },
            {
              item: 'Subject',
              description: subject
            },
            {
              item: 'Date & Time',
              description: new Date(scheduledDate).toLocaleString()
            },
            {
              item: 'Duration',
              description: `${duration} ${duration === 1 ? 'hour' : 'hours'}`
            },
            {
              item: 'Total Amount',
              description: `$${totalAmount}`
            },
            {
              item: 'Status',
              description: status === 'pending' ? '⏳ Waiting for tutor confirmation' : `✅ ${status}`
            }
          ]
        },
        outro: [
          status === 'pending' 
            ? 'Your tutor will confirm this booking soon. You\'ll receive another email once confirmed.'
            : 'Your lesson is confirmed! Don\'t forget to prepare any questions you might have.',
          '',
          'Good luck with your learning! 🌟'
        ]
      }
    });
  }

  // Password update success email
  static generatePasswordUpdateEmail(userData) {
    const { fullName, email } = userData;
    const updateTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return mailGenerator.generate({
      body: {
        name: fullName,
        intro: 'Your TUTOR account password has been successfully updated.',
        action: {
          instructions: 'If this wasn\'t you, please contact support immediately.',
          button: {
            color: '#DC4C64',
            text: 'Contact Support',
            link: `${process.env.FRONTEND_URL}/support`
          }
        },
        table: {
          data: [
            {
              item: 'Account Email',
              description: email
            },
            {
              item: 'Password Updated',
              description: updateTime
            },
            {
              item: 'Account Type',
              description: '🎓 Student Account'
            },
            {
              item: 'Security Status',
              description: '🔒 Password successfully changed'
            }
          ]
        },
        outro: [
          'Security Tips:',
          '• Use a strong, unique password',
          '• Don\'t share your login credentials',
          '• Log out from shared devices',
          '',
          'Your account security is important to us!'
        ]
      }
    });
  }

  // Profile update confirmation email
  static generateProfileUpdateEmail(userData) {
    const { fullName, email } = userData;

    return mailGenerator.generate({
      body: {
        name: fullName,
        intro: 'Your TUTOR student profile has been successfully updated.',
        action: {
          instructions: 'View your updated profile and continue learning.',
          button: {
            color: '#22BC66',
            text: 'View Profile',
            link: `${process.env.FRONTEND_URL}/profile`
          }
        },
        table: {
          data: [
            {
              item: 'Profile Status',
              description: '✅ Successfully Updated'
            },
            {
              item: 'Last Updated',
              description: new Date().toLocaleString()
            },
            {
              item: 'Account Type',
              description: '🎓 Student Profile'
            }
          ]
        },
        outro: [
          'Keep your profile updated for a better learning experience!',
          '',
          'Happy learning! 📚'
        ]
      }
    });
  }

  // Rating submitted confirmation email
  static generateRatingSubmittedEmail(userData, ratingData) {
    const { fullName } = userData;
    const { tutorName, rating, subject } = ratingData;

    return mailGenerator.generate({
      body: {
        name: fullName,
        intro: 'Thank you for rating your tutor! Your feedback helps improve our community.',
        action: {
          instructions: 'Continue learning with more amazing tutors.',
          button: {
            color: '#22BC66',
            text: 'Find More Tutors',
            link: `${process.env.FRONTEND_URL}/tutors`
          }
        },
        table: {
          data: [
            {
              item: 'Tutor Rated',
              description: tutorName
            },
            {
              item: 'Subject',
              description: subject
            },
            {
              item: 'Your Rating',
              description: `${'⭐'.repeat(rating)} (${rating}/5)`
            },
            {
              item: 'Submitted',
              description: new Date().toLocaleString()
            }
          ]
        },
        outro: [
          'Your feedback helps other students make informed decisions.',
          'Thank you for being part of our learning community! 🌟'
        ]
      }
    });
  }

  // Booking cancellation email
  static generateBookingCancellationEmail(userData, bookingData) {
    const { fullName } = userData;
    const { tutorName, subject, scheduledDate, reason } = bookingData;

    return mailGenerator.generate({
      body: {
        name: fullName,
        intro: 'Your booking has been cancelled successfully.',
        action: {
          instructions: 'Book another lesson when you\'re ready to continue learning.',
          button: {
            color: '#22BC66',
            text: 'Find New Tutors',
            link: `${process.env.FRONTEND_URL}/tutors`
          }
        },
        table: {
          data: [
            {
              item: 'Cancelled Lesson',
              description: `${subject} with ${tutorName}`
            },
            {
              item: 'Original Date',
              description: new Date(scheduledDate).toLocaleString()
            },
            {
              item: 'Cancellation Reason',
              description: reason || 'Not specified'
            },
            {
              item: 'Cancelled On',
              description: new Date().toLocaleString()
            }
          ]
        },
        outro: [
          'No worries! You can book another lesson anytime.',
          'We\'re here to support your learning journey! 📚'
        ]
      }
    });
  }
}

// Email Service Class for Students
class StudentEmailService {
  
  static async sendWelcomeEmail(userData) {
    try {
      const htmlContent = StudentEmailTemplates.generateWelcomeEmail(userData);
      
      await mailTransport(
        userData.email,
        'Welcome to TUTOR - Start Your Learning Journey! 🎓',
        htmlContent
      );
      
      console.log(`Welcome email sent successfully to ${userData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send login notification email
  static async sendLoginNotification(userData) {
    try {
      const htmlContent = StudentEmailTemplates.generateLoginEmail(userData);
      
      await mailTransport(
        userData.email,
        'TUTOR - Login Notification 🔐',
        htmlContent
      );
      
      console.log(`Login notification sent successfully to ${userData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send login notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send booking confirmation email
  static async sendBookingConfirmation(userData, bookingData) {
    try {
      const htmlContent = StudentEmailTemplates.generateBookingConfirmationEmail(userData, bookingData);
      
      await mailTransport(
        userData.email,
        'Booking Confirmed - TUTOR 📅',
        htmlContent
      );
      
      console.log(`Booking confirmation sent to ${userData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send booking confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password update notification
  static async sendPasswordUpdateNotification(userData) {
    try {
      const htmlContent = StudentEmailTemplates.generatePasswordUpdateEmail(userData);
      
      await mailTransport(
        userData.email,
        'TUTOR - Password Updated Successfully 🔒',
        htmlContent
      );
      
      console.log(`Password update notification sent to ${userData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send password update notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send profile update notification
  static async sendProfileUpdateNotification(userData) {
    try {
      const htmlContent = StudentEmailTemplates.generateProfileUpdateEmail(userData);
      
      await mailTransport(
        userData.email,
        'TUTOR - Profile Updated Successfully ✅',
        htmlContent
      );
      
      console.log(`Profile update notification sent to ${userData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send profile update notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send rating submitted confirmation
  static async sendRatingConfirmation(userData, ratingData) {
    try {
      const htmlContent = StudentEmailTemplates.generateRatingSubmittedEmail(userData, ratingData);
      
      await mailTransport(
        userData.email,
        'Thank You for Your Rating - TUTOR ⭐',
        htmlContent
      );
      
      console.log(`Rating confirmation sent to ${userData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send rating confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  // Send booking cancellation confirmation
  static async sendCancellationConfirmation(userData, bookingData) {
    try {
      const htmlContent = StudentEmailTemplates.generateBookingCancellationEmail(userData, bookingData);
      
      await mailTransport(
        userData.email,
        'Booking Cancelled - TUTOR 📅',
        htmlContent
      );
      
      console.log(`Cancellation confirmation sent to ${userData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send cancellation confirmation:', error);
      return { success: false, error: error.message };
    }
  }
}

export const signup = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
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
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send welcome email
    try {
      const emailResult = await StudentEmailService.sendWelcomeEmail({
        fullName,
        email,
      });
      
      if (!emailResult.success) {
        console.error('Welcome email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the registration if email fails
    }

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. A welcome email has been sent!',
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

    // Send login notification email
    try {
      const emailResult = await StudentEmailService.sendLoginNotification({
        fullName: user.fullName,
        email: user.email,
        lastLogin: user.lastLogin
      });
      
      if (!emailResult.success) {
        console.error('Login notification failed:', emailResult.error);
      }
      
      // Update last login time
      user.lastLogin = new Date();
      await user.save();
    } catch (emailError) {
      console.error('Failed to send login notification email:', emailError);
      // Don't fail the login if email fails
    }

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

    // Send password update notification
    try {
      const emailResult = await StudentEmailService.sendPasswordUpdateNotification({
        fullName: user.fullName,
        email: user.email
      });
      
      if (!emailResult.success) {
        console.error('Password update notification failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Failed to send password update notification:', emailError);
      // Don't fail the password update if email fails
    }

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully. A confirmation email has been sent.',
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

    // Send profile update notification
    try {
      const emailResult = await StudentEmailService.sendProfileUpdateNotification({
        fullName: user.fullName,
        email: user.email
      });
      
      if (!emailResult.success) {
        console.error('Profile update notification failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Failed to send profile update notification:', emailError);
      // Don't fail the profile update if email fails
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully. A confirmation email has been sent.',
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

// BOOKING FUNCTIONS

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

    // Check if tutor teaches the requested subject (case insensitive)
    const teachesSubject = tutor.subjects.some(s => 
      s.toLowerCase() === subject.toLowerCase()
    );
    
    if (!teachesSubject) {
      return res.status(400).json({
        status: 'error',
        message: 'Tutor does not teach this subject',
      });
    }

    // Calculate total amount and time slots
    const totalAmount = tutor.hourlyRate * duration;
    const startTime = new Date(scheduledDate);
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    // Fixed: Check for booking conflicts with proper date comparison
    const conflictingBooking = await Booking.findOne({
      tutorId: new mongoose.Types.ObjectId(tutorId),
      $or: [
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gt: startTime } }
          ]
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
      studentId: new mongoose.Types.ObjectId(id),
      tutorId: new mongoose.Types.ObjectId(tutorId),
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

    // Populate with proper field selection
    await newBooking.populate('tutorId', 'fullName email subjects hourlyRate');
    await newBooking.populate('studentId', 'fullName email');

    // Get user for email
    const user = await User.findById(id);

    // Send booking confirmation email
    try {
      const emailResult = await StudentEmailService.sendBookingConfirmation(
        { fullName: user.fullName, email: user.email },
        {
          id: newBooking._id,
          tutorName: tutor.fullName,
          subject,
          scheduledDate: startTime,
          duration,
          totalAmount,
          status: 'pending'
        }
      );
      
      if (!emailResult.success) {
        console.error('Booking confirmation email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Failed to send booking confirmation email:', emailError);
    }

    res.status(201).json({
      status: 'success',
      message: 'Booking created successfully. Waiting for tutor confirmation. A confirmation email has been sent.',
      data: newBooking
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the booking',
      error: error.message,
    });
  }
};

// Fixed getUserBookings function
export const getUserBookings = async (req, res) => {
  try {
    const { id } = req.user;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    const query = { studentId: new mongoose.Types.ObjectId(id) };

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
      .populate('tutorId', 'fullName email subjects hourlyRate location averageRating')
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
    console.error('Get user bookings error:', error);
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

    const booking = await Booking.findOne({ _id: bookingId, studentId: id })
      .populate('tutorId', 'fullName');
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

    // // Check cancellation policy (e.g., 24 hours before)
    // const hoursBefore = (new Date(booking.scheduledDate) - new Date()) / (1000 * 60 * 60);
    // if (hoursBefore < 24) {
    //   return res.status(400).json({
    //     status: 'error',
    //     message: 'Bookings can only be cancelled 24 hours before the scheduled time',
    //   });
    // }

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledBy = 'student';
    booking.cancelledAt = new Date();

    await booking.save();

    // Get user for email
    const user = await User.findById(id);

    // Send cancellation confirmation email
    try {
      const emailResult = await StudentEmailService.sendCancellationConfirmation(
        { fullName: user.fullName, email: user.email },
        {
          tutorName: booking.tutorId?.fullName || 'Unknown',
          subject: booking.subject,
          scheduledDate: booking.scheduledDate,
          reason
        }
      );
      
      if (!emailResult.success) {
        console.error('Cancellation confirmation email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Failed to send cancellation confirmation email:', emailError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully. A confirmation email has been sent.',
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


// Fixed rateTutor function  
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

    const studentObjectId = new mongoose.Types.ObjectId(id);
    const tutorObjectId = new mongoose.Types.ObjectId(tutorId);
    const bookingObjectId = new mongoose.Types.ObjectId(bookingId);

    // Verify the booking exists and is completed
    const booking = await Booking.findOne({
      _id: bookingObjectId,
      studentId: studentObjectId,
      tutorId: tutorObjectId,
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
      studentId: studentObjectId,
      tutorId: tutorObjectId,
      bookingId: bookingObjectId
    });

    if (existingRating) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already rated this tutor for this lesson',
      });
    }

    const newRating = new Rating({
      studentId: studentObjectId,
      tutorId: tutorObjectId,
      bookingId: bookingObjectId,
      rating,
      comment
    });

    await newRating.save();

    // Update tutor's average rating
    const tutorRatings = await Rating.find({ tutorId: tutorObjectId });
    const averageRating = tutorRatings.reduce((sum, r) => sum + r.rating, 0) / tutorRatings.length;
    
    const tutor = await Tutor.findByIdAndUpdate(tutorObjectId, {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalRatings: tutorRatings.length
    });

    await newRating.populate('tutorId', 'fullName');
    await newRating.populate('studentId', 'fullName');

    // Get user for email
    const user = await User.findById(id);

    // Send rating confirmation email
    try {
      const emailResult = await StudentEmailService.sendRatingConfirmation(
        { fullName: user.fullName, email: user.email },
        {
          tutorName: tutor.fullName,
          rating,
          subject: booking.subject
        }
      );
      
      if (!emailResult.success) {
        console.error('Rating confirmation email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Failed to send rating confirmation email:', emailError);
    }

    res.status(201).json({
      status: 'success',
      message: 'Rating submitted successfully. Thank you for your feedback!',
      data: newRating
    });
  } catch (error) {
    console.error('Rate tutor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while submitting the rating',
      error: error.message,
    });
  }
};

// ==== TUTOR CONTROLLER FIXES ====

// Fixed getDashboardStats function
export const getDashboardStats = async (req, res) => {
  try {
    const { id } = req.user;
    const tutorObjectId = new mongoose.Types.ObjectId(id);
        
    // Get total bookings count
    const totalBookings = await Booking.countDocuments({ 
      tutorId: tutorObjectId,
      status: { $in: ['confirmed', 'completed'] }
    });

    // Get unique students count
    const uniqueStudents = await Booking.distinct('studentId', { 
      tutorId: tutorObjectId,
      status: { $in: ['confirmed', 'completed'] }
    });

    // Calculate total earnings
    const completedBookings = await Booking.find({ 
      tutorId: tutorObjectId, 
      status: 'completed' 
    });
    const totalEarnings = completedBookings.reduce((sum, booking) => {
      return sum + (booking.totalAmount || 0);
    }, 0);

    // Get average rating
    const ratings = await Rating.find({ tutorId: tutorObjectId });
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
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving dashboard stats',
      error: error.message,
    });
  }
};

// Fixed getRecentActivity function
export const getRecentActivity = async (req, res) => {
  try {
    const { id } = req.user;
    const { limit = 10 } = req.query;
    const tutorObjectId = new mongoose.Types.ObjectId(id);

    // Get recent bookings with student details
    const recentBookings = await Booking.find({ tutorId: tutorObjectId })
      .populate('studentId', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Get recent ratings
    const recentRatings = await Rating.find({ tutorId: tutorObjectId })
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
    console.error('Recent activity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving recent activity',
      error: error.message,
    });
  }
};

// Fixed getUpcomingLessons function
export const getUpcomingLessons = async (req, res) => {
  try {
    const { id } = req.user;
    const { limit = 10 } = req.query;
    const tutorObjectId = new mongoose.Types.ObjectId(id);

    const now = new Date();
    const upcomingLessons = await Booking.find({
      tutorId: tutorObjectId,
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
    console.error('Upcoming lessons error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving upcoming lessons',
      error: error.message,
    });
  }
};

// Fixed getBookingHistory function
export const getBookingHistory = async (req, res) => {
  try {
    const { id } = req.user;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const tutorObjectId = new mongoose.Types.ObjectId(id);

    const query = { tutorId: tutorObjectId };

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
    console.error('Booking history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving booking history',
      error: error.message,
    });
  }
};

// Fixed getEarningsReport function
export const getEarningsReport = async (req, res) => {
  try {
    const { id } = req.user;
    const { startDate, endDate, groupBy = 'month' } = req.query;
    const tutorObjectId = new mongoose.Types.ObjectId(id);

    const matchStage = {
      tutorId: tutorObjectId,
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
    console.error('Earnings report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while generating earnings report',
      error: error.message,
    });
  }
};

// RATING FUNCTIONS
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