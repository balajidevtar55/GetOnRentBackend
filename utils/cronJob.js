const cron = require("node-cron");
const Booking = require("../models/Booking");
const ArchivedBooking = require("../models/ArchivedBooking");

// Run the cron job every day at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("🕛 Running cron job to archive expired bookings...");

  try {
    const today = new Date();

    // Find all bookings where `checkOut` is in the past OR `checkIn` is in the past
    const expiredBookings = await Booking.find({
      $or: [
        { "bookingDetails.checkOut": { $lt: today } }, // Check-out has expired
        { "bookingDetails.checkIn": { $lt: today } },  // Check-in has expired but still exists
      ],
    });

    if (expiredBookings.length > 0) {
      console.log(`📦 Moving ${expiredBookings.length} expired bookings to archive...`);

      // Move expired bookings to the `ArchivedBooking` collection
      await ArchivedBooking.insertMany(
        expiredBookings.map((booking) => ({
          bookingDetails: booking.bookingDetails,
          archivedAt: today,
        }))
      );

      // Delete expired bookings from the active `Booking` collection
      await Booking.deleteMany({
        $or: [
          { "bookingDetails.checkOut": { $lt: today } },
          { "bookingDetails.checkIn": { $lt: today } },
        ],
      });

      console.log(`✅ Successfully archived and removed ${expiredBookings.length} bookings.`);
    } else {
      console.log("✅ No expired bookings found.");
    }
  } catch (error) {
    console.error("❌ Error in cron job:", error);
  }
});
