import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import Tutor from '../models/tutor.model.js';
import { Booking } from '../models/booking.model.js';
import { Rating } from '../models/rating.model.js';
import { mailTransport } from '../config/googleapis.js';
import { mailGenerator } from '../config/mailgen.js';
import dotenv from 'dotenv';
dotenv.config();

class EmailTemplates {
  
  static generateWelcomeEmail(tutorData) {
    const { fullName, email, location, hourlyRate, experience, subjects } = tutorData;
    
    return mailGenerator.generate({
      body: {
        name: fullName,
        intro: [
          'Welcome to TUTOR! 🎉',
          'Your tutor account has been successfully created and is now pending verification.'
        ],
        action: {
          instructions: 'While we review your profile, you can explore your dashboard and complete your profile setup.',
          button: {
            color: '#22BC66',
            text: 'Visit Your Dashboard',
            link: `${process.env.FRONTEND_URL}/dashboard`
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
              item: 'Teaching Location',
              description: location
            },
            {
              item: 'Hourly Rate',
              description: `$${hourlyRate}/hour`
            },
            {
              item: 'Experience',
              description: `${experience} ${experience === 1 ? 'year' : 'years'}`
            },
            {
              item: 'Subjects',
              description: Array.isArray(subjects) ? subjects.join(', ') : subjects
            }
          ]
        },
        outro: [
          'What happens next?',
          '• Our team will review your profile within 24-48 hours',
          '• You\'ll receive an email notification once approved',
          '• Start receiving booking requests from students',
          '',
          'Thank you for joining our tutoring community!'
        ]
      }
    });
  }

  // Login success notification
  static generateLoginEmail(tutorData) {
    const { fullName, email, isVerified, lastLogin } = tutorData;
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
        intro: 'You have successfully signed in to your TUTOR account.',
        action: {
          instructions: 'Access your dashboard to manage bookings and update your profile.',
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
              item: 'Account Status',
              description: isVerified ? '✅ Verified' : '⏳ Pending Verification'
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
          'Happy tutoring! 📚'
        ]
      }
    });
  }

  // Password update success email
  static generatePasswordUpdateEmail(tutorData) {
    const { fullName, email } = tutorData;
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
  static generateProfileUpdateEmail(tutorData) {
    const { fullName, email } = tutorData;

    return mailGenerator.generate({
      body: {
        name: fullName,
        intro: 'Your TUTOR profile has been successfully updated.',
        action: {
          instructions: 'View your updated profile and manage your tutoring services.',
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
              item: 'Visibility',
              description: 'Your updated profile is now visible to students'
            }
          ]
        },
        outro: [
          'Keep your profile updated to attract more students!',
          '',
          'Thank you for using TUTOR 📚'
        ]
      }
    });
  }
}

// Email Service Class
class EmailService {
  
  // Send welcome email after successful signup
  static async sendWelcomeEmail(tutorData) {
    try {
      const htmlContent = EmailTemplates.generateWelcomeEmail(tutorData);
      
      await mailTransport(
        tutorData.email,
        'Welcome to TUTOR - Account Created Successfully! 🎉',
        htmlContent
      );
      
      console.log(`Welcome email sent successfully to ${tutorData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      
      // Log specific error types for debugging
      if (error.code === 'EAUTH') {
        console.error('Authentication failed - check OAuth2 credentials');
      } else if (error.code === 'ENOTFOUND') {
        console.error('Network error - check internet connection');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('Request timeout - Gmail service may be slow');
      }
      
      return { success: false, error: error.message };
    }
  }

  // Send login notification email with retry mechanism
  static async sendLoginNotification(tutorData, retries = 2) {
    try {
      const htmlContent = EmailTemplates.generateLoginEmail(tutorData);
      
      await mailTransport(
        tutorData.email,
        'TUTOR - Login Notification 🔐',
        htmlContent
      );
      
      console.log(`Login notification sent successfully to ${tutorData.email}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send login notification (attempt ${3-retries}/3):`, error);
      
      // Retry logic for transient errors
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.sendLoginNotification(tutorData, retries - 1);
      }
      
      return { success: false, error: error.message };
    }
  }

  // Send password update notification
  static async sendPasswordUpdateNotification(tutorData) {
    try {
      const htmlContent = EmailTemplates.generatePasswordUpdateEmail(tutorData);
      
      await mailTransport(
        tutorData.email,
        'TUTOR - Password Updated Successfully 🔒',
        htmlContent
      );
      
      console.log(`Password update notification sent to ${tutorData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send password update notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send profile update notification
  static async sendProfileUpdateNotification(tutorData) {
    try {
      const htmlContent = EmailTemplates.generateProfileUpdateEmail(tutorData);
      
      await mailTransport(
        tutorData.email,
        'TUTOR - Profile Updated Successfully ✅',
        htmlContent
      );
      
      console.log(`Profile update notification sent to ${tutorData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send profile update notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper method to determine if error is retryable
  static isRetryableError(error) {
    const retryableErrors = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'];
    return retryableErrors.includes(error.code) || error.message.includes('timeout');
  }

  // Test email connection
  static async testConnection() {
    try {
      // This assumes you're using the OAuth2 version
      const transport = await createMailTransport();
      await transport.verify();
      console.log('Email service connection verified successfully');
      return { success: true };
    } catch (error) {
      console.error('Email service connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export { EmailService };

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

    // Send welcome email
    try {
      const emailResult = await EmailService.sendWelcomeEmail({
        fullName,
        email,
        location,
        hourlyRate,
        experience,
        subjects
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
      message: 'Tutor registered successfully. Your account is pending verification. A welcome email has been sent.',
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

    // Send login notification email
    try {
      const emailResult = await EmailService.sendLoginNotification({
        fullName: tutor.fullName,
        email: tutor.email,
        isVerified: tutor.isVerified || false,
        lastLogin: tutor.lastLogin
      });
      
      if (!emailResult.success) {
        console.error('Login notification failed:', emailResult.error);
      }
      
      // Update last login time
      tutor.lastLogin = new Date();
      await tutor.save();
    } catch (emailError) {
      console.error('Failed to send login notification email:', emailError);
      // Don't fail the login if email fails
    }

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

    // Send password update notification
    try {
      const emailResult = await EmailService.sendPasswordUpdateNotification({
        fullName: tutor.fullName,
        email: tutor.email
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

    // Send profile update notification
    try {
      const emailResult = await EmailService.sendProfileUpdateNotification({
        fullName: tutor.fullName,
        email: tutor.email
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

// DASHBOARD FUNCTIONS

export const getDashboardStats = async (req, res) => {
  try {
    const { id } = req.user;
    console.log('Tutor ID from token:', id); // Debug log
    
    // Convert to ObjectId for proper querying
    const tutorObjectId = new mongoose.Types.ObjectId(id);
        
    // Get total bookings count - Fixed to use ObjectId
    const totalBookings = await Booking.countDocuments({ 
      tutorId: tutorObjectId,
      status: { $in: ['confirmed', 'completed'] }
    });
    console.log('Total bookings:', totalBookings); // Debug log

    // Get unique students count - Fixed aggregation
    const uniqueStudentsAgg = await Booking.aggregate([
      {
        $match: {
          tutorId: tutorObjectId,
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $group: {
          _id: '$studentId'
        }
      },
      {
        $count: 'uniqueStudents'
      }
    ]);
    
    const totalStudents = uniqueStudentsAgg.length > 0 ? uniqueStudentsAgg[0].uniqueStudents : 0;
    console.log('Unique students:', totalStudents); // Debug log

    // Calculate total earnings - Fixed aggregation
    const earningsAgg = await Booking.aggregate([
      {
        $match: {
          tutorId: tutorObjectId,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalAmount' },
          completedCount: { $sum: 1 }
        }
      }
    ]);
    
    const totalEarnings = earningsAgg.length > 0 ? earningsAgg[0].totalEarnings : 0;
    const completedLessonsCount = earningsAgg.length > 0 ? earningsAgg[0].completedCount : 0;
    console.log('Total earnings:', totalEarnings); // Debug log

    // Get average rating - Fixed to use ObjectId
    const ratingsAgg = await Rating.aggregate([
      {
        $match: {
          tutorId: tutorObjectId
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const averageRating = ratingsAgg.length > 0 ? ratingsAgg[0].averageRating : 0;
    const totalRatings = ratingsAgg.length > 0 ? ratingsAgg[0].totalRatings : 0;
    console.log('Average rating:', averageRating, 'Total ratings:', totalRatings); // Debug log

    res.status(200).json({
      status: 'success',
      data: {
        totalBookings,
        totalStudents,
        completedLessons: completedLessonsCount,
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalRatings
      }
    });
  } catch (error) {
    console.error('Tutor dashboard stats error:', error);
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
    const tutorObjectId = new mongoose.Types.ObjectId(id);

    console.log('Getting recent activity for tutor:', id); // Debug log

    // Get recent bookings with student details - Fixed ObjectId usage
    const recentBookings = await Booking.find({ 
      tutorId: tutorObjectId 
    })
    .populate('studentId', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    console.log('Recent bookings found:', recentBookings.length); // Debug log

    // Get recent ratings - Fixed ObjectId usage
    const recentRatings = await Rating.find({ 
      tutorId: tutorObjectId 
    })
    .populate('studentId', 'fullName')
    .populate('bookingId', 'subject')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    console.log('Recent ratings found:', recentRatings.length); // Debug log

    // Combine and sort by date
    const activities = [
      ...recentBookings.map(booking => ({
        type: 'booking',
        action: `New ${booking.subject} booking from ${booking.studentId?.fullName || 'Unknown Student'}`,
        date: booking.createdAt,
        status: booking.status,
        amount: booking.totalAmount,
        bookingId: booking._id
      })),
      ...recentRatings.map(rating => ({
        type: 'rating',
        action: `Received ${rating.rating}-star rating from ${rating.studentId?.fullName || 'Unknown Student'}`,
        date: rating.createdAt,
        rating: rating.rating,
        comment: rating.comment,
        subject: rating.bookingId?.subject || 'Unknown Subject'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, parseInt(limit));

    console.log('Total activities combined:', activities.length); // Debug log

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

export const getUpcomingLessons = async (req, res) => {
  try {
    const { id } = req.user;
    const { limit = 10 } = req.query;
    const tutorObjectId = new mongoose.Types.ObjectId(id);

    console.log('Getting upcoming lessons for tutor:', id); // Debug log

    const now = new Date();
    const upcomingLessons = await Booking.find({
      tutorId: tutorObjectId,
      status: 'confirmed',
      scheduledDate: { $gte: now }
    })
    .populate('studentId', 'fullName email')
    .sort({ scheduledDate: 1 })
    .limit(parseInt(limit));

    console.log('Upcoming lessons found:', upcomingLessons.length); // Debug log

    const formattedLessons = upcomingLessons.map(lesson => ({
      id: lesson._id,
      student: lesson.studentId?.fullName || 'Unknown Student',
      studentEmail: lesson.studentId?.email,
      subject: lesson.subject,
      scheduledDate: lesson.scheduledDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      duration: lesson.duration,
      amount: lesson.totalAmount,
      meetingLink: lesson.meetingLink,
      meetingPreference: lesson.meetingPreference,
      status: lesson.status,
      notes: lesson.notes
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

export const getBookingHistory = async (req, res) => {
  try {
    const { id } = req.user;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    
    // Determine if this is a student or tutor based on the role
    const { role } = req.user;
    const userObjectId = new mongoose.Types.ObjectId(id);
    
    console.log('Getting booking history for:', role, id); // Debug log

    // Build query based on user role
    const query = {};
    if (role === 'student') {
      query.studentId = userObjectId;
    } else {
      query.tutorId = userObjectId;
    }

    // Add additional filters
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    console.log('Query:', JSON.stringify(query)); // Debug log

    const bookings = await Booking.find(query)
      .populate('tutorId', 'fullName email subjects hourlyRate averageRating')
      .populate('studentId', 'fullName email')
      .sort({ scheduledDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    console.log('Bookings found:', bookings.length, 'Total:', total); // Debug log

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

export const getEarningsReport = async (req, res) => {
  try {
    const { id } = req.user;
    const { startDate, endDate, groupBy = 'month' } = req.query;
    const tutorObjectId = new mongoose.Types.ObjectId(id);

    console.log('Getting earnings report for tutor:', id); // Debug log

    const matchStage = {
      tutorId: tutorObjectId,
      status: 'completed'
    };

    if (startDate || endDate) {
      matchStage.scheduledDate = {};
      if (startDate) matchStage.scheduledDate.$gte = new Date(startDate);
      if (endDate) matchStage.scheduledDate.$lte = new Date(endDate);
    }

    console.log('Match stage:', JSON.stringify(matchStage)); // Debug log

    let groupStage;
    if (groupBy === 'day') {
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$scheduledDate" } },
          totalEarnings: { $sum: "$totalAmount" },
          totalLessons: { $sum: 1 },
          lessons: { $push: { subject: "$subject", amount: "$totalAmount", date: "$scheduledDate" } }
        }
      };
    } else if (groupBy === 'week') {
      groupStage = {
        $group: {
          _id: { 
            year: { $year: "$scheduledDate" },
            week: { $week: "$scheduledDate" }
          },
          totalEarnings: { $sum: "$totalAmount" },
          totalLessons: { $sum: 1 },
          lessons: { $push: { subject: "$subject", amount: "$totalAmount", date: "$scheduledDate" } }
        }
      };
    } else { // month
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$scheduledDate" } },
          totalEarnings: { $sum: "$totalAmount" },
          totalLessons: { $sum: 1 },
          lessons: { $push: { subject: "$subject", amount: "$totalAmount", date: "$scheduledDate" } }
        }
      };
    }

    const earnings = await Booking.aggregate([
      { $match: matchStage },
      groupStage,
      { $sort: { _id: 1 } }
    ]);

    console.log('Earnings aggregation result:', earnings.length); // Debug log

    const totalEarnings = earnings.reduce((sum, item) => sum + item.totalEarnings, 0);
    const totalLessons = earnings.reduce((sum, item) => sum + item.totalLessons, 0);

    res.status(200).json({
      status: 'success',
      data: {
        earnings,
        summary: {
          totalEarnings: parseFloat(totalEarnings.toFixed(2)),
          totalLessons,
          averagePerLesson: totalLessons > 0 ? parseFloat((totalEarnings / totalLessons).toFixed(2)) : 0,
          period: groupBy
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

// Add these functions to your tutor.controller.js file

// Import mongoose at the top if not already imported
import mongoose from 'mongoose';

// ==== COURSE/LESSON COMPLETION FUNCTIONS ====

export const markLessonCompleted = async (req, res) => {
  try {
    const { id } = req.user; // Tutor ID from auth middleware
    const { bookingId } = req.params;
    const { lessonNotes, nextSteps, studentProgress } = req.body;

    // Validate bookingId format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid booking ID format',
      });
    }

    const tutorObjectId = new mongoose.Types.ObjectId(id);
    const bookingObjectId = new mongoose.Types.ObjectId(bookingId);

    // Find the booking and verify it belongs to this tutor
    const booking = await Booking.findOne({
      _id: bookingObjectId,
      tutorId: tutorObjectId
    }).populate('studentId', 'fullName email');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or you are not authorized to access it',
      });
    }

    // Check if booking is in a state that can be completed
    // if (booking.status !== 'confirmed') {
    //   return res.status(400).json({
    //     status: 'error',
    //     message: `Cannot complete lesson. Current status: ${booking.status}. Only confirmed lessons can be marked as completed.`,
    //   });
    // }

    // Check if lesson time has passed (optional validation)
    const now = new Date();
    const lessonEndTime = new Date(booking.endTime || booking.scheduledDate);
    
    if (now < lessonEndTime) {
      // Optional: Allow tutors to complete lessons early, or uncomment below to prevent early completion
      // return res.status(400).json({
      //   status: 'error',
      //   message: 'Cannot complete lesson before the scheduled end time',
      // });
    }

    // Update booking status to completed
    booking.status = 'completed';
    booking.completedAt = new Date();
    booking.lessonNotes = lessonNotes || '';
    booking.nextSteps = nextSteps || '';
    booking.studentProgress = studentProgress || '';

    await booking.save();

    // Send completion notification email to student (optional)
    try {
      if (booking.studentId && booking.studentId.email) {
        const completionEmailResult = await StudentEmailService.sendLessonCompletionNotification(
          {
            fullName: booking.studentId.fullName,
            email: booking.studentId.email
          },
          {
            tutorName: (await Tutor.findById(id)).fullName,
            subject: booking.subject,
            lessonDate: booking.scheduledDate,
            duration: booking.duration,
            lessonNotes,
            nextSteps,
            bookingId: booking._id
          }
        );

        if (!completionEmailResult.success) {
          console.error('Lesson completion email failed:', completionEmailResult.error);
        }
      }
    } catch (emailError) {
      console.error('Failed to send lesson completion email:', emailError);
      // Don't fail the completion if email fails
    }

    res.status(200).json({
      status: 'success',
      message: 'Lesson marked as completed successfully. Student can now rate this lesson.',
      data: {
        booking,
        canBeRated: true,
        completedAt: booking.completedAt
      }
    });

  } catch (error) {
    console.error('Mark lesson completed error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while marking lesson as completed',
      error: error.message,
    });
  }
};

export const getCompletableLessons = async (req, res) => {
  try {
    const { id } = req.user;
    const { page = 1, limit = 10 } = req.query;
    const tutorObjectId = new mongoose.Types.ObjectId(id);

    // Get confirmed lessons that haven't been completed yet
    const completableLessons = await Booking.find({
      tutorId: tutorObjectId,
      status: 'confirmed',
      // Optionally filter for lessons that should have ended by now
      endTime: { $lte: new Date() }
    })
    .populate('studentId', 'fullName email')
    .sort({ scheduledDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Booking.countDocuments({
      tutorId: tutorObjectId,
      status: 'confirmed',
      endTime: { $lte: new Date() }
    });

    const formattedLessons = completableLessons.map(lesson => ({
      id: lesson._id,
      student: lesson.studentId?.fullName || 'Unknown',
      studentEmail: lesson.studentId?.email,
      subject: lesson.subject,
      scheduledDate: lesson.scheduledDate,
      endTime: lesson.endTime,
      duration: lesson.duration,
      totalAmount: lesson.totalAmount,
      status: lesson.status
    }));

    res.status(200).json({
      status: 'success',
      data: {
        lessons: formattedLessons,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });

  } catch (error) {
    console.error('Get completable lessons error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving completable lessons',
      error: error.message,
    });
  }
};

export const getCompletedLessons = async (req, res) => {
  try {
    const { id } = req.user;
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const tutorObjectId = new mongoose.Types.ObjectId(id);

    const query = {
      tutorId: tutorObjectId,
      status: 'completed'
    };

    // Add date filters if provided
    if (startDate || endDate) {
      query.completedAt = {};
      if (startDate) query.completedAt.$gte = new Date(startDate);
      if (endDate) query.completedAt.$lte = new Date(endDate);
    }

    const completedLessons = await Booking.find(query)
      .populate('studentId', 'fullName email')
      .sort({ completedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    // Check if each completed lesson has been rated
    const lessonsWithRatingStatus = await Promise.all(
      completedLessons.map(async (lesson) => {
        const rating = await Rating.findOne({
          bookingId: lesson._id,
          tutorId: tutorObjectId,
          studentId: lesson.studentId._id
        });

        return {
          ...lesson.toObject(),
          hasBeenRated: !!rating,
          rating: rating ? {
            rating: rating.rating,
            comment: rating.comment,
            createdAt: rating.createdAt
          } : null
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        lessons: lessonsWithRatingStatus,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });

  } catch (error) {
    console.error('Get completed lessons error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving completed lessons',
      error: error.message,
    });
  }
};

export const updateLessonNotes = async (req, res) => {
  try {
    const { id } = req.user;
    const { bookingId } = req.params;
    const { lessonNotes, nextSteps, studentProgress } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid booking ID format',
      });
    }

    const tutorObjectId = new mongoose.Types.ObjectId(id);
    const bookingObjectId = new mongoose.Types.ObjectId(bookingId);

    const booking = await Booking.findOne({
      _id: bookingObjectId,
      tutorId: tutorObjectId,
      status: 'completed'
    });

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Completed lesson not found or you are not authorized to access it',
      });
    }

    // Update lesson notes
    booking.lessonNotes = lessonNotes || booking.lessonNotes;
    booking.nextSteps = nextSteps || booking.nextSteps;
    booking.studentProgress = studentProgress || booking.studentProgress;
    booking.notesUpdatedAt = new Date();

    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Lesson notes updated successfully',
      data: {
        lessonNotes: booking.lessonNotes,
        nextSteps: booking.nextSteps,
        studentProgress: booking.studentProgress,
        notesUpdatedAt: booking.notesUpdatedAt
      }
    });

  } catch (error) {
    console.error('Update lesson notes error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating lesson notes',
      error: error.message,
    });
  }
};

export const debugDashboardData = async (req, res) => {
  try {
    const { id } = req.user;
    const { role } = req.user;
    
    console.log('Debug - User ID:', id, 'Role:', role);
    
    const userObjectId = new mongoose.Types.ObjectId(id);
    
    // Count all bookings for this user
    let allBookings, allRatings;
    
    if (role === 'student') {
      allBookings = await Booking.find({ studentId: userObjectId });
      allRatings = await Rating.find({ studentId: userObjectId });
    } else {
      allBookings = await Booking.find({ tutorId: userObjectId });
      allRatings = await Rating.find({ tutorId: userObjectId });
    }
    
    console.log('All bookings:', allBookings.length);
    console.log('All ratings:', allRatings.length);
    
    // Get sample booking to check structure
    const sampleBooking = allBookings[0];
    console.log('Sample booking structure:', sampleBooking ? {
      _id: sampleBooking._id,
      studentId: sampleBooking.studentId,
      tutorId: sampleBooking.tutorId,
      status: sampleBooking.status,
      totalAmount: sampleBooking.totalAmount
    } : 'No bookings found');
    
    res.status(200).json({
      status: 'success',
      debug: {
        userId: id,
        userRole: role,
        userObjectId: userObjectId.toString(),
        totalBookings: allBookings.length,
        totalRatings: allRatings.length,
        sampleBooking: sampleBooking ? {
          _id: sampleBooking._id,
          studentId: sampleBooking.studentId,
          tutorId: sampleBooking.tutorId,
          status: sampleBooking.status,
          totalAmount: sampleBooking.totalAmount
        } : null,
        bookingStatuses: [...new Set(allBookings.map(b => b.status))],
        bookingDates: allBookings.map(b => ({
          id: b._id,
          date: b.scheduledDate,
          status: b.status
        })).slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Debug dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Debug failed',
      error: error.message
    });
  }
};