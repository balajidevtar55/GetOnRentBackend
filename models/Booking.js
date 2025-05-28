const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingDetails: {
      type: mongoose.Schema.Types.Mixed, 
      checkIn: { type: Date, required: true },
      checkOut: { type: Date, required: true },
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
