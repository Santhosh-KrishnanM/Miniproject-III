const mongoose = require('mongoose');

const travelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  seats: { type: Number, required: true },
  costPerDay: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  available: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Travel', travelSchema);
