const express = require('express');
const router = express.Router();
const { paymentController } = require('../controllers/paymentcontroller');
const verifyJWT = require('../middleware/verifyJWT');

router.post('/payment',verifyJWT,paymentController );


module.exports = router; 