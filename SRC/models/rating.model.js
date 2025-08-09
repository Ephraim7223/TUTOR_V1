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
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number between 1 and 5'
    }
  },
  comment: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  // Additional rating categories (optional)
  teachingQuality: {
    type: Number,
    min: 1,
    max: 5
  },
  communication: {
    type: Number,
    min: 1,
    max: 5
  },
  punctuality: {
    type: Number,
    min: 1,
    max: 5
  },
  helpfulness: {
    type: Number,
    min: 1,
    max: 5
  },
  // Response from tutor (optional)
  tutorResponse: {
    type: String,
    maxlength: 500,
    trim: true
  },
  tutorResponseDate: {
    type: Date
  },
  // Flag for inappropriate content
  isReported: {
    type: Boolean,
    default: false
  },
  reportReason: {
    type: String,
    maxlength: 200
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

ratingSchema.index({ tutorId: 1, createdAt: -1 });
ratingSchema.index({ studentId: 1, createdAt: -1 });
ratingSchema.index({ bookingId: 1 }, { unique: true });
ratingSchema.index({ rating: 1 });
ratingSchema.index({ isActive: 1 });

ratingSchema.index({ studentId: 1, tutorId: 1, bookingId: 1 }, { unique: true });

ratingSchema.virtual('detailedAverage').get(function() {
  const ratings = [this.teachingQuality, this.communication, this.punctuality, this.helpfulness]
    .filter(rating => rating != null);
  
  if (ratings.length === 0) return null;
  
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
});

ratingSchema.statics.calculateTutorAverage = async function(tutorId) {
  const result = await this.aggregate([
    { $match: { tutorId: new mongoose.Types.ObjectId(tutorId), isActive: true } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
        ratingBreakdown: {
          $push: '$rating'
        }
      }
    }
  ]);

  if (result.length > 0) {
    const breakdown = result[0].ratingBreakdown.reduce((acc, rating) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {});

    return {
      averageRating: parseFloat(result[0].averageRating.toFixed(2)),
      totalRatings: result[0].totalRatings,
      ratingDistribution: {
        5: breakdown[5] || 0,
        4: breakdown[4] || 0,
        3: breakdown[3] || 0,
        2: breakdown[2] || 0,
        1: breakdown[1] || 0
      }
    };
  }

  return {
    averageRating: 0,
    totalRatings: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  };
};

ratingSchema.post('save', async function() {
  try {
    const Tutor = mongoose.model('Tutor');
    const ratingStats = await this.constructor.calculateTutorAverage(this.tutorId);
    
    await Tutor.findByIdAndUpdate(this.tutorId, {
      averageRating: ratingStats.averageRating,
      totalRatings: ratingStats.totalRatings,
      ratingDistribution: ratingStats.ratingDistribution
    });
  } catch (error) {
    console.error('Error updating tutor rating:', error);
  }
});

const Rating = mongoose.model('Rating', ratingSchema);

export { Rating };