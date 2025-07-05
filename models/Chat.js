const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['direct', 'group', 'team'],
    default: 'direct'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    muteNotifications: {
      type: Boolean,
      default: false
    },
    theme: {
      type: String,
      default: 'default'
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatSchema.index({ participants: 1, updatedAt: -1 });
chatSchema.index({ type: 1 });

module.exports = mongoose.model('Chat', chatSchema);