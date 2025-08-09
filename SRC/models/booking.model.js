import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Changed from 'tutor' to 'tutorId' to match controller
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
  // Changed from 'sessionDate' to 'scheduledDate' to match controller
  scheduledDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
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
  // Added cancellation fields from controller
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
  // Added rescheduling fields
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
  }
}, {
  timestamps: true
});

bookingSchema.index({ tutorId: 1, scheduledDate: 1 });
bookingSchema.index({ studentId: 1, scheduledDate: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledDate: 1 });
bookingSchema.index({ paymentStatus: 1 });

bookingSchema.virtual('sessionEndTime').get(function() {
  if (this.scheduledDate && this.duration) {
    return new Date(this.scheduledDate.getTime() + (this.duration * 60 * 60 * 1000));
  }
  return null;
});

bookingSchema.pre('save', function(next) {
  if (this.isModified('duration') || this.isModified('hourlyRate')) {
    this.totalAmount = this.duration * this.hourlyRate;
  }
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

export { Booking };