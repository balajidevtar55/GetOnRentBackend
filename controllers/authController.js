const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// Set a constant OTP for now
const FIXED_OTP = "123456";
const generateToken = (user) => {
    return jwt.sign({ id: user._id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "30d",
    });
  };
  exports.loginWithOTP = async (req, res) => {
    try {
      const { email, phone, otpMethod } = req.body;
  
      if (!email && !phone) {
        return res.status(400).json({ message: "Email or phone is required" });
      }
  
      const query = email ? { email } : { phone };
      let user = await User.findOne(query);
  
      const hashedOtp = await bcrypt.hash(FIXED_OTP, 10);
  
      if (user) {
        // Update OTP for existing user
        user.otp = hashedOtp;
        await user.save();
        return res.status(200).json({
          success: true,
          message: `OTP sent via ${otpMethod}`,
          userId: user._id,
          otp: FIXED_OTP, // REMOVE in production
        });
      } else {
        // Extra check to avoid duplicate email or phone from different query path
        const existingUser = await User.findOne({
          $or: [
            email ? { email } : {},
            phone ? { phone } : {},
          ],
        });
  
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "A user with this email or phone already exists.",
          });
        }
  
        // Create new user
        const newUser = await User.create({
          email: email || null,
          phone: phone || null,
          otp: hashedOtp,
        });
  
        return res.status(201).json({
          success: true,
          message: "User registered and OTP sent",
          userId: newUser._id,
          otp: FIXED_OTP, // REMOVE in production
        });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  };
  

exports.verifyOTP = async (req, res) => {
    const { email, phone, otp } = req.body;

    if (!otp || (!email && !phone)) {
      return res.status(400).json({ message: "OTP and email or phone are required" });
    }
   
    const query = email ? { email } : { phone };
    const user = await User.findOne(query);
  
    if (!user) return res.status(404).json({ message: "User not found" });
  
    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) return res.status(401).json({ message: "Invalid OTP" });
  
    const token = generateToken(user);
  
    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        token:token
      },
    });
};
