const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT');
const bookingcontroller = require('../controllers/bookingcontroller');

router.post('/booking',verifyJWT, bookingcontroller.BookingAdd);
router.post('/bookinglist',verifyJWT, bookingcontroller.BookingList);



module.exports = router; 