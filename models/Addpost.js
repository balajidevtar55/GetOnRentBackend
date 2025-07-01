const mongoose = require('mongoose');

// Define a sub-schema for postData
const PostDataSchema = new mongoose.Schema({
  // Add only necessary fields here or keep them generic
  lat: Number,
  lng: Number,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: false,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false,
    }
  },
  // You can still allow dynamic fields
}, { strict: false }); // Keep this to allow mixed fields dynamically

// Create 2dsphere index
PostDataSchema.index({ location: '2dsphere' });

const AddPost = new mongoose.Schema({
  postData: { type: PostDataSchema, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  isSubmit: { type: Boolean },
  step: { type: mongoose.Schema.Types.Mixed },
});

const DynamicPostData = mongoose.model('postData', AddPost);

module.exports = DynamicPostData;