import mongoose from 'mongoose';

const tutorSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    required: true,
    maxlength: 500
  },
  education: {
    type: String,
    required: true,
    trim: true
  },
  experience: {
    type: Number,
    required: true,
    min: 0
  },
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  languages: [{
    type: String,
    trim: true
  }],
  subjects: [{
    type: String,
    trim: true
  }],
  role: {
    type: String,
    default: 'tutor',
    enum: ['tutor']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Fixed: Changed from 'rating' to 'averageRating' to match controller
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  // Fixed: Changed from 'totalReviews' to 'totalRatings' to match controller
  totalRatings: {
    type: Number,
    default: 0
  },
  lastLogin: {
    type: Date
  },
  // Added availability field used in controller
  availability: [{
    day: String,
    startTime: String,
    endTime: String,
    isAvailable: Boolean
  }]
}, {
  timestamps: true
});

tutorSchema.methods.toJSON = function() {
  const tutor = this.toObject();
  delete tutor.password;
  return tutor;
};

const Tutor = mongoose.model('Tutor', tutorSchema);
export default Tutor;