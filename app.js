const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const db = require('./db');
const User = require('./User');
const Admin = require('./admin');
const Booking = require('./Booking');
const Destination = require('./Destination');
const Favorite = require('./Favorite');
const Activity = require('./Activity');
const Image = require('./Image');
const Page = require('./Page');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Signup route (with password hashing)
app.post('/signup', async (req, res) => {
  try {
    const { username, email, phone, address, password } = req.body;
    if (!username || !email || !phone || !address || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, phone, address, password: hashedPassword });
    await user.save();
    res.status(201).json({
      message: 'User registered!',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error registering user', error: err });
  }
});

// Login route (with password check)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
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
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error during login', error: err });
  }
});

// Update user profile
app.put('/api/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Booking routes
app.post('/api/bookings', async (req, res) => {
  try {
    const { userId, destination, startDate, endDate, travelers } = req.body;
    const booking = new Booking({
      userId,
      destination,
      startDate,
      endDate,
      travelers
    });
    await booking.save();
    await booking.populate("destination");
    // Log activity
    await Activity.create({
      userId,
      type: 'booking',
      content: `Booked trip to ${booking.destination.name}`,
      destinationId: destination
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: "Failed to create booking", details: err.message });
  }
});

app.get('/api/bookings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await Booking.find({ userId }).populate("destination");
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings", details: err.message });
  }
});

// Destination routes
app.post('/destinations', async (req, res) => {
  try {
    const destination = new Destination(req.body);
    await destination.save();
    res.status(201).json({ message: 'Destination created!', destination });
  } catch (err) {
    res.status(500).json({ message: 'Error creating destination', error: err });
  }
});

app.get('/api/destinations', async (req, res) => {
  try {
    const destinations = await Destination.find({});
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch destinations" });
  }
});

// Favorite routes
app.post('/favorites', async (req, res) => {
  try {
    const { userId, destinationId } = req.body;
    // Prevent duplicate favorites
    const existing = await Favorite.findOne({ userId, destinationId });
    if (existing) {
      return res.status(409).json({ message: 'Already favorited', favorite: existing });
    }
    const favorite = new Favorite({ userId, destinationId });
    await favorite.save();
    // Log activity
    await Activity.create({
      userId,
      type: 'favorite',
      content: `Added favorite for destination ${destinationId}`,
      destinationId
    });
    res.status(201).json({ message: 'Favorite added!', favorite });
  } catch (err) {
    res.status(500).json({ message: 'Error adding favorite', error: err });
  }
});

app.get('/favorites/:userId', async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.params.userId }).populate('destinationId');
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching favorites', error: err });
  }
});

app.delete('/favorites/:id', async (req, res) => {
  try {
    await Favorite.findByIdAndDelete(req.params.id);
    res.json({ message: 'Favorite removed' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing favorite', error: err });
  }
});

// Activity routes
app.post('/activities', async (req, res) => {
  try {
    const activity = new Activity(req.body);
    await activity.save();
    res.status(201).json({ message: 'Activity logged!', activity });
  } catch (err) {
    res.status(500).json({ message: 'Error logging activity', error: err });
  }
});

app.get('/activities/:userId', async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(20).populate('destinationId');
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching activities', error: err });
  }
});

// Image routes
app.post('/images', async (req, res) => {
  try {
    const image = new Image(req.body);
    await image.save();
    res.status(201).json({ message: 'Image uploaded!', image });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading image', error: err });
  }
});

app.get('/images', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const images = await Image.find(filter);
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching images', error: err });
  }
});

// Page routes
app.post('/pages', async (req, res) => {
  try {
    const page = new Page(req.body);
    await page.save();
    res.status(201).json(page);
  } catch (err) {
    res.status(500).json({ message: 'Error creating page', error: err });
  }
});

app.get('/pages', async (req, res) => {
  try {
    const pages = await Page.find();
    res.json(pages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pages', error: err });
  }
});

app.get('/pages/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug });
    if (page) res.json(page);
    else res.status(404).json({ message: 'Page not found' });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching page', error: err });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', dbState: mongoose.connection.readyState });
});

// Start server after DB connection
const PORT = process.env.PORT || 3000;
db.once('open', () => {
  app.listen(PORT, () => {
    console.log(`🚀 Server started at http://localhost:${PORT}`);
  });
});