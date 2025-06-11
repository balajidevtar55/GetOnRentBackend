const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        lowercase: true,
        sparse: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        sparse: true,
        unique: true,
        match: [/\S+@\S+\.\S+/, 'is invalid']
    },
    password: String,
    otp: String,
    otpExpiresAt: Date,
}, { timestamps: true });

userSchema.plugin(uniqueValidator);

userSchema.methods.generateAccessToken = function () {
    return jwt.sign({
        user: {
            id: this._id,
            email: this.email
        }
    }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
};

module.exports = mongoose.model("User", userSchema);
