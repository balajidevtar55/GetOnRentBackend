const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
    isPrivate: {
      type: Boolean,
      default: false
    },
    allowMemberInvite: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Index for search functionality
teamSchema.index({ name: 'text', description: 'text' });
teamSchema.index({ members: 1 });

module.exports = mongoose.model('Team', teamSchema);