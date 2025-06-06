const express = require('express');
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/login/otp", authController.loginWithOTP);
router.post("/verify/otp", authController.verifyOTP);

module.exports = router;
