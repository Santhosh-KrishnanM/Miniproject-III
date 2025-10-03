<<<<<<< HEAD
=======
// models/Destination.js
>>>>>>> 708f77ca15dbedf6f80255a3e3a6fb231eaf21b6
const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
<<<<<<< HEAD
  type: { type: String }, 
=======
  type: { type: String }, // e.g., Hill Station, Beach
>>>>>>> 708f77ca15dbedf6f80255a3e3a6fb231eaf21b6
  rating: { type: Number },
  description: { type: String },
  imageUrl: { type: String }
});

<<<<<<< HEAD
module.exports = mongoose.model('Destination', destinationSchema);
=======
module.exports = mongoose.model('Destination', destinationSchema);
>>>>>>> 708f77ca15dbedf6f80255a3e3a6fb231eaf21b6
