const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
<<<<<<< HEAD
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  travelers: { type: Number, default: 1 },
=======

  // ✅ Reference to Destination collection instead of plain string
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  travelers: { type: Number, default: 1 },

>>>>>>> 708f77ca15dbedf6f80255a3e3a6fb231eaf21b6
  status: { 
    type: String, 
    enum: ['Confirmed', 'Pending', 'Cancelled'], 
    default: 'Pending' 
  },
<<<<<<< HEAD
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
=======

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
>>>>>>> 708f77ca15dbedf6f80255a3e3a6fb231eaf21b6
