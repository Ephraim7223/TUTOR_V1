import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
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
  role: {
    type: String,
    default: 'user',
    enum: ['user']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Add the wishlist field to your schema
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    default: []
  }]
}, {
  timestamps: true
});

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;