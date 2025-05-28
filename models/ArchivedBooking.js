const mongoose = require("mongoose");

const archivedBookingSchema = new mongoose.Schema(
  {
    bookingDetails: mongoose.Schema.Types.Mixed,
    archivedAt: { type: Date, default: Date.now }, // When it was archived
  },
  { timestamps: true }
);

module.exports = mongoose.model("ArchivedBooking", archivedBookingSchema);
