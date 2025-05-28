
const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');

const BookingAdd = asyncHandler(async (req, res) => {
    const { bookingDetails,checkIn,checkOut } = req.body;
    
    try {
        if (!bookingDetails) {
            return res.status(400).json({message: "All fields are required"});
        }
    
        const booking = new Booking({
            bookingDetails, // Add category-specific fields here
          });
          const savedBooking = await booking.save();
          res.status(201).json(savedBooking); 
    } catch (error) {
        res.status(500).json({ error: err.message });
    }
    
}); 

const BookingList = asyncHandler(async (req, res) => {
    const { filterData } = req.body;

    const { checkIn, checkOut,postId } = filterData;
    try {

        if (checkIn && checkOut && postId) {
            const bookings = await Booking.find({
              "bookingDetails.postId": postId, // Filter by postId
              $or: [
                { "bookingDetails.checkIn": { $gte: checkIn, $lte: checkOut } }, // checkIn falls in range
                { "bookingDetails.checkOut": { $gte: checkIn, $lte: checkOut } }, // checkOut falls in range
                {
                  $and: [
                    { "bookingDetails.checkIn": { $lte: checkIn } }, // Booking starts before range
                    { "bookingDetails.checkOut": { $gte: checkOut } }, // Booking ends after range
                  ],
                },
              ],
            });
          
            res.status(201).json(bookings);
          } else {
            const booking = await Booking.find({});
            res.status(201).json(booking);
          }
          
       
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
    
}); 

module.exports = {
    BookingAdd,
    BookingList
}
