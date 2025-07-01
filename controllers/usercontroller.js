
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const loginWithPassword = asyncHandler(async (req, res) => {
    const { email, phone, password } = req.body;

    if (!password || (!email && !phone)) {
        return res.status(400).json({ message: "Password and email or phone are required" });
    }

    const query = email ? { email } : { phone };
    const user = await User.findOne(query);

    if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: "Incorrect password" });

    const token = generateToken(user._id, email || phone);
    res.json({ success: true, message: "Password login successful", token });
});

const userInfo = asyncHandler(async (req, res) => {
    const  userId  = req.userId;
   const UserData = await User.findById(userId).select('-password -otp');
    if (!UserData) {
        return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, data:UserData, message: "User Data Generated " });
});
module.exports = {
    loginWithPassword,
    userInfo
}
