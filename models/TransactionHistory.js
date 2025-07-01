const mongoose = require('mongoose');

const transactionHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // who received the money (e.g., owner)
    },
    sourceUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // who paid the money (e.g., renter)
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true, // credited amount (e.g., 99% of rent)
    },
    depositAmount: {
      type: Number,
      default: 0, // for reference
    },
    platformFee: {
      type: Number,
      default: 0, // amount deducted as platform fee
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'refunded','held'],
      default: 'success',
    },
  },
  {
    timestamps: true, // auto adds createdAt & updatedAt
  }
);

module.exports = mongoose.model('TransactionHistory', transactionHistorySchema);
