const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String }, 
  rating: { type: Number },
  reviews: { type: Number, default: 0 },
  description: { type: String },
  imageUrl: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Destination', destinationSchema);