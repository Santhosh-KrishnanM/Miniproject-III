const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String }, 
  rating: { type: Number },
  description: { type: String },
  imageUrl: { type: String }
});

module.exports = mongoose.model('Destination', destinationSchema);