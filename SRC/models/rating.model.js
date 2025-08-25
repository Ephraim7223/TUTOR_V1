import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
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
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Ensure unique rating per booking
ratingSchema.index({ studentId: 1, tutorId: 1, bookingId: 1 }, { unique: true });

const Rating = mongoose.model('Rating', ratingSchema);
export { Rating };