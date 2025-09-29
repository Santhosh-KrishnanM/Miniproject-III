// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const Destination = require('./Destination');
const Booking = require('./Booking');
const User = require('./User');

const app = express();

// --------- MIDDLEWARE ---------
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files if needed

// --------- DB CONNECTION ---------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// --------- ROUTES ---------

// ----- Signup -----
app.post('/signup', async (req, res) => {
  try {
    const { username, email, phone, address, password } = req.body;

    if (!username || !email || !phone || !address || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      phone,
      address,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully!',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Error registering user', error: err.message });
  }
});

// ----- Login -----
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      message: 'Login successful',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ----- Get all destinations -----
app.get('/api/destinations', async (req, res) => {
  try {
    const destinations = await Destination.find();
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Create booking -----
app.post('/api/bookings', async (req, res) => {
  try {
    const { userId, destination, startDate, endDate, travelers } = req.body;

    if (!userId || !destination || !startDate || !endDate || !travelers) {
      return res.status(400).json({ message: 'All booking fields are required' });
    }

    const booking = new Booking({
      userId,
      destination,
      startDate,
      endDate,
      travelers,
      status: "Confirmed"
    });

    const savedBooking = await booking.save();
    res.status(201).json(savedBooking);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ----- Get bookings by user -----
app.get('/api/bookings/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId })
      .populate('destination')
      .populate('userId', 'username email phone address'); // optional populate user details

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Update user profile -----
app.put('/api/users/:id', async (req, res) => {
  try {
    if (req.body.password) {
      // Hash password if updating
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --------- START SERVER ---------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
