const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT');
const bookingcontroller = require('../controllers/bookingcontroller');

router.post('/booking',verifyJWT, bookingcontroller.BookingAdd);
router.post('/bookinglist',verifyJWT, bookingcontroller.BookingList);
router.get('/bookings/summary/:userId',verifyJWT, bookingcontroller.BookingListSummery);
router.post('/bookings/updateStatus',verifyJWT, bookingcontroller.updateBookingStatus);
router.post('/bookings/unavailable/:productId',verifyJWT, bookingcontroller.updateBookingStatus);






module.exports = router; 