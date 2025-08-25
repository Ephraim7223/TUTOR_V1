// Update your booking.model.js to include these additional fields for lesson completion

import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  // Fixed: Changed to Date types to match controller logic
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 0.5 // Minimum 30 minutes
  },
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
    default: 'pending'
  },
  sessionType: {
    type: String,
    enum: ['online', 'in-person'],
    default: 'online'
  },
  meetingPreference: {
    type: String,
    enum: ['zoom', 'google-meet', 'skype', 'in-person', 'other'],
    default: 'zoom'
  },
  meetingLink: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    maxlength: 500
  },
  studentNotes: {
    type: String,
    maxlength: 500
  },
  tutorFeedback: {
    type: String,
    maxlength: 500
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  cancellationReason: {
    type: String,
    maxlength: 500
  },
  cancelledBy: {
    type: String,
    enum: ['student', 'tutor', 'admin']
  },
  cancelledAt: {
    type: Date
  },
  originalScheduledDate: {
    type: Date
  },
  rescheduleReason: {
    type: String,
    maxlength: 500
  },
  rescheduledBy: {
    type: String,
    enum: ['student', 'tutor', 'admin']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // New fields for lesson completion
  completedAt: {
    type: Date
  },
  lessonNotes: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  nextSteps: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  studentProgress: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  notesUpdatedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bookingSchema.index({ tutorId: 1, scheduledDate: 1 });
bookingSchema.index({ studentId: 1, scheduledDate: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledDate: 1 });
bookingSchema.index({ paymentStatus: 1 });
// Additional indexes for completion features
bookingSchema.index({ tutorId: 1, status: 1 });
bookingSchema.index({ status: 1, endTime: 1 });

// Virtual for checking if lesson can be completed
bookingSchema.virtual('canBeCompleted').get(function() {
  return this.status === 'confirmed' && new Date() >= this.endTime;
});

// Virtual for checking if lesson can be rated
bookingSchema.virtual('canBeRated').get(function() {
  return this.status === 'completed';
});

// Pre-save middleware to handle calculations
bookingSchema.pre('save', function(next) {
  // Calculate total amount
  if (this.isModified('duration') || this.isModified('hourlyRate')) {
    this.totalAmount = this.duration * this.hourlyRate;
  }
  
  // Set startTime and endTime based on scheduledDate and duration
  if (this.isModified('scheduledDate') || this.isModified('duration')) {
    this.startTime = this.scheduledDate;
    this.endTime = new Date(this.scheduledDate.getTime() + (this.duration * 60 * 60 * 1000));
  }
  
  // Set completion timestamp when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);
export { Booking };