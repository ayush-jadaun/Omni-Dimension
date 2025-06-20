import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.USER
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    phone: {
      type: String,
      trim: true,
      match: /^[\+]?[1-9][\d]{0,15}$/
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    preferences: {
      language: {
        type: String,
        default: 'en'
      },
      notifications: {
        email: {
          type: Boolean,
          default: true
        },
        sms: {
          type: Boolean,
          default: false
        },
        push: {
          type: Boolean,
          default: true
        }
      },
      defaultLocation: {
        address: String,
        coordinates: {
          lat: Number,
          lng: Number
        }
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLoginAt: Date,
  lastActiveAt: Date,
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.profile?.firstName && this.profile?.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.username;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update last activity
userSchema.methods.updateLastActivity = async function() {
  this.lastActiveAt = new Date();
  return this.save({ validateBeforeSave: false });
};

// Method to update login info
userSchema.methods.updateLoginInfo = async function() {
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  this.lastActiveAt = new Date();
  return this.save({ validateBeforeSave: false });
};

// Method to get safe user object (without password)
userSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Static method to find active user
userSchema.statics.findActiveUser = function(criteria) {
  return this.findOne({ ...criteria, isActive: true });
};

export default mongoose.model('User', userSchema);