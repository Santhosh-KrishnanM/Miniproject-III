const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  travelers: { type: Number, default: 1 },

  // booking lifecycle status
  status: { 
    type: String, 
    enum: ['Confirmed', 'Pending', 'Cancelled', 'Pending Approval'], 
    default: 'Pending' 
  },

  // payment tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],

  // approval workflow for assigned travel
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  // ✅ NEW FIELD: assigned travel details (may be added after payment)
  assignedTravel: {
    name: String,
    seats: Number,
    costPerDay: Number,
    totalPrice: Number,
    bookedAt: Date,
    approved: { type: Boolean, default: false }
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);