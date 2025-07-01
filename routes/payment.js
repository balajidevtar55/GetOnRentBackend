const express = require('express');
const router = express.Router();
const { paymentController, myTransactionHistory } = require('../controllers/paymentcontroller');
const verifyJWT = require('../middleware/verifyJWT');

router.post('/payment',verifyJWT,paymentController );
router.post('/payment/transitionHistory',verifyJWT,myTransactionHistory );



module.exports = router; 