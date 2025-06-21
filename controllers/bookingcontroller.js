
const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');

const BookingAdd = asyncHandler(async (req, res) => {
    const { bookingDetails } = req.body;

    
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

const BookingListSummery = asyncHandler(async (req, res) => {
  try {
   const  { userId }  = req.params;
    // Check if a post by this user already exists
    const bookings = await Booking.find({"bookingDetails.ownerId":userId}).lean();


      res.status(201).json({
        message: 'Your Data generated!',
        data: bookings,
        success:true
      });
  } catch (error) {
    res.status(500).json({
      message: 'Error storing dynamic data',
      error: error.message,
    });
  }
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  try {
    const { bookingId, newStatus } = req.body;
    console.log(bookingId,newStatus);
    

    if (!newStatus) {
      return res.status(400).json({ success: false, message: 'newStatus is required' });
    }

    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: bookingId },
      { $set: { 'bookingDetails.status': newStatus } },
      { new: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      data: updatedBooking,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating booking status',
      error: error.message,
    });
  }
});
module.exports = {
    BookingAdd,
    BookingList,
    BookingListSummery,
    updateBookingStatus
}
