const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT');
const bookingcontroller = require('../controllers/bookingcontroller');

router.post('/booking',verifyJWT, bookingcontroller.BookingAdd);
router.post('/bookinglist',verifyJWT, bookingcontroller.BookingList);
router.post('/bookings/summary',verifyJWT, bookingcontroller.BookingListSummery);
router.post('/bookings/updateStatus',verifyJWT, bookingcontroller.updateBookingStatus);
router.get('/bookings/unavailable/:productId',verifyJWT, bookingcontroller.getUnavailableDates);
router.get('/bookings/check/:productId', verifyJWT, bookingcontroller.checkExistingBooking)
router.post('/bookings/myBookings', verifyJWT, bookingcontroller.myBookings)
router.post('/bookings/payment-update', verifyJWT, bookingcontroller.updatePaymentStatus);



module.exports = router; 