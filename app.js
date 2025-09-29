const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const db = require('./db'); // import db connection
const Destination = require('./Destination');
const Booking = require('./Booking'); 
const User = require('./User');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // serve frontend files if needed

// --------- ROUTES ---------

// Home
app.post('/signup', async (req, res) => {
  try {
    const { username, email, phone, address, password } = req.body;
    if (!username || !email || !phone || !address || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // TODO: Use password hashing in production!
    const user = new User({ username, email, phone, address, password });
    await user.save();

    res.status(201).json({
      message: 'User registered!',
      user: {
        _id: user._id,          // ✅ return MongoDB ObjectId
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json({ message: 'Username or email already exists' });
    } else {
      res.status(500).json({ message: 'Error registering user', error: err });
    }
  }
});


// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    res.json({
      message: 'Login successful',
      user: {
        _id: user._id,          // ✅ include MongoDB ID
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Get all destinations
app.get('/api/destinations', async (req, res) => {
  try {
    const destinations = await Destination.find();
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { userId, destination, startDate, endDate, travelers } = req.body;
    const booking = new Booking({
      userId,
      destination,
      startDate,
      endDate,
      travelers,
      status: "Confirmed"
    });
    const saved = await booking.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get bookings by user
app.get('/api/bookings/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).populate('destination');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Example user profile update route
app.put('/api/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --------- SERVER START ---------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
