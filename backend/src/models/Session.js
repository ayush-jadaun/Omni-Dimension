import mongoose from 'mongoose';
import { SESSION_STATUS } from '../config/constants.js';

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.ACTIVE
  },
  userAgent: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  location: {
    country: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  metadata: {
    device: String,
    browser: String,
    os: String,
    referrer: String
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  conversationCount: {
    type: Number,
    default: 0
  },
  workflowCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
sessionSchema.index({ userId: 1, status: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ lastActivityAt: -1 });

// Virtual to check if session is expired
sessionSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual to check if session is active
sessionSchema.virtual('isActive').get(function() {
  return this.status === SESSION_STATUS.ACTIVE && !this.isExpired;
});

// Method to extend session
sessionSchema.methods.extend = function(durationMs = 24 * 60 * 60 * 1000) {
  this.expiresAt = new Date(Date.now() + durationMs);
  this.lastActivityAt = new Date();
  return this.save();
};

// Method to deactivate session
sessionSchema.methods.deactivate = function() {
  this.status = SESSION_STATUS.INACTIVE;
  return this.save();
};

// Method to update activity
sessionSchema.methods.updateActivity = function() {
  this.lastActivityAt = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { status: SESSION_STATUS.EXPIRED }
    ]
  });
};

// Static method to find active session
sessionSchema.statics.findActiveSession = function(sessionId) {
  return this.findOne({
    sessionId,
    status: SESSION_STATUS.ACTIVE,
    expiresAt: { $gt: new Date() }
  }).populate('userId', '-password');
};

export default mongoose.model('Session', sessionSchema);