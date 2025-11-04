const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  travelers: { type: Number, default: 1 },
  status: { 
    type: String, 
    enum: ['Confirmed', 'Pending', 'Cancelled'], 
    default: 'Pending' 
  },

  // ✅ NEW FIELD: assigned travel details
   assignedTravel: {
    name: String,
    seats: Number,
    costPerDay: Number,
    totalPrice: Number,
    bookedAt: Date
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);



