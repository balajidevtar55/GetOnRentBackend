
const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const DynamicPostData = require('../models/Addpost');

const BookingAdd = asyncHandler(async (req, res) => {
  const { bookingDetails } = req.body;


  try {
    if (!bookingDetails) {
      return res.status(400).json({ message: "All fields are required" });
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

  const { checkIn, checkOut, postId } = filterData;
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
    const {
      filterData: {
        status = 'all',
        search = '',
        page = 1,
        limit = 2
      } = {},
      userId
    } = req.body;



    const skip = (Number(page) - 1) * Number(limit);


    const baseQuery = {
      "bookingDetails.ownerId": userId
    };

    const query = { ...baseQuery };
    // Apply status filtering
    if (status !== 'all') {
      if (status === 'completed') {
        query['bookingDetails.status'] = { $nin: ['pending', 'approved'] };
      } else {
        query['bookingDetails.status'] = status;
      }
    }

    // Apply search filtering (adjust fields as needed)
    if (search) {
      query.$or = [
        { "bookingDetails.productName": { $regex: search, $options: 'i' } },
        { "bookingDetails.bookingId": { $regex: search, $options: 'i' } }
      ];
    }

    const isFiltered = status !== 'all' || Boolean(search);
    const total = isFiltered
      ? await Booking.countDocuments(query)
      : await Booking.countDocuments(baseQuery);


    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const [all, pending, approved, completed] = await Promise.all([
      Booking.countDocuments(baseQuery),
      Booking.countDocuments({ ...baseQuery, "bookingDetails.status": "pending" }),
      Booking.countDocuments({ ...baseQuery, "bookingDetails.status": "approved" }),
      Booking.countDocuments({ ...baseQuery, "bookingDetails.status": { $nin: ["pending", "approved"] } }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Booking summary retrieved!',
      total,
      page: Number(page),
      limit: Number(limit),
      data: bookings,
      statusCounts: {
        all,
        pending,
        approved,
        completed
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching booking summary',
      error: error.message
    });
  }
});



const updateBookingStatus = asyncHandler(async (req, res) => {
  try {
    const { bookingId, newStatus } = req.body;


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



const getUnavailableDates = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({ success: false, message: "Product ID is required" });
  }

  try {
    const bookings = await Booking.find({
      "bookingDetails.postId": productId,
      "bookingDetails.status": "approved"
    }).select("bookingDetails.startDate bookingDetails.endDate -_id");


    const dateRanges = bookings.map(b => ({
      start: b.bookingDetails.startDate,
      end: b.bookingDetails.endDate
    }));

    res.status(200).json({
      success: true,
      data: dateRanges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch unavailable dates",
      error: error.message
    });
  }
});
const checkExistingBooking = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.userId

  if (!productId) {
    return res.status(400).json({ success: false, message: "Product ID is required" });
  }
  console.log("userId", userId, productId)


  try {
    const existing = await Booking.findOne({
      "bookingDetails.rentedBy": userId,
      "bookingDetails.postId": productId,
      "bookingDetails.status": { $nin: ["rejected", "returned"] } // treat these as expired
    }).select("bookingDetails.status bookingDetails.startDate bookingDetails.endDate");

    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyBooked: true,
        status: existing.bookingDetails.status,
        startDate: existing.bookingDetails.startDate,
        endDate: existing.bookingDetails.endDate
      });
    }

    return res.status(200).json({
      success: true,
      alreadyBooked: false
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking booking status",
      error: error.message
    });
  }
});

const myBookings = asyncHandler(async (req, res) => {
  try {
    const {
      filterData: {
        status = 'all',
        search = '',
        page = 1,
        limit = 2
      } = {},
    } = req.body;
    const userId = req.userId

    const skip = (Number(page) - 1) * Number(limit);


    const baseQuery = {
      "bookingDetails.rentedBy": userId
    };

    const query = { ...baseQuery };
    // Apply status filtering
    if (status !== 'all') {
      if (status === 'completed') {
        query['bookingDetails.status'] = { $nin: ['pending', 'approved'] };
      } else {
        query['bookingDetails.status'] = status;
      }
    }

    // Apply search filtering (adjust fields as needed)
    if (search) {
      query.$or = [
        { "bookingDetails.productName": { $regex: search, $options: 'i' } },
        { "bookingDetails.bookingId": { $regex: search, $options: 'i' } }
      ];
    }



    const isFiltered = status !== 'all' || Boolean(search);
    const total = isFiltered
      ? await Booking.countDocuments(query)
      : await Booking.countDocuments(baseQuery);


    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const [all, pending, approved, completed] = await Promise.all([
      Booking.countDocuments(baseQuery),
      Booking.countDocuments({ ...baseQuery, "bookingDetails.status": "pending" }),
      Booking.countDocuments({ ...baseQuery, "bookingDetails.status": "approved" }),
      Booking.countDocuments({ ...baseQuery, "bookingDetails.status": { $nin: ["pending", "approved"] } }),
    ]);
    let updatedData = [];
if (Array.isArray(bookings) && bookings.length !== 0) {
  try {
    // Extract all unique post IDs
    const postIds = [...new Set(bookings.map(booking => booking.bookingDetails.postId))];
    
    // Fetch all posts in one query
    const posts = await DynamicPostData.find({ 
      _id: { $in: postIds } 
    }).lean();
    
    // Create a map for quick lookup
    const postMap = new Map(posts.map(post => [post._id.toString(), post]));
    
    // Map bookings with their corresponding post data
    updatedData = bookings.map(booking => ({
      ...booking,
      bookingDetails: {
        ...booking.bookingDetails,
        postData: postMap.get(booking.bookingDetails.postId.toString()) || null,
      }
    }));
    
  } catch (error) {
    console.error("Error processing bookings:", error);
    updatedData = [];
  }
} else {
  console.error("Bookings array is empty or invalid.");
  updatedData = [];
}
    res.status(200).json({
      success: true,
      message: 'Booking summary retrieved!',
      total,
      page: Number(page),
      limit: Number(limit),
      data: updatedData,
      statusCounts: {
        all,
        pending,
        approved,
        completed
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching booking summary',
      error: error.message
    });
  }
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { bookingId, paymentMethod, razorpayDetails } = req.body;

  if (!bookingId || !paymentMethod) {
    return res.status(400).json({
      success: false,
      message: 'Booking ID and payment method are required'
    });
  }

  try {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update fields
    booking.set('bookingDetails.paymentStatus', 'completed');
    booking.set('bookingDetails.paymentMethod', paymentMethod);
    booking.set('bookingDetails.paymentCompleted', true);

    if (paymentMethod === 'online' && razorpayDetails) {
      booking.set('bookingDetails.razorpayDetails', {
        orderId: razorpayDetails.orderId,
        paymentId: razorpayDetails.paymentId,
        signature: razorpayDetails.signature,
        paidAt: new Date()
      });
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating payment status',
      error: error.message
    });
  }
});


module.exports = {
  BookingAdd,
  BookingList,
  BookingListSummery,
  updateBookingStatus,
  getUnavailableDates,
  checkExistingBooking,
  myBookings,
  updatePaymentStatus
}
