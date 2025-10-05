const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
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

// ✅ Serve static files (HTML, CSS, JS, images) from the same folder
app.use(express.static(__dirname));

// ✅ Serve travel.html as the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'travel.html'));
});

// ---------------------- AUTH ROUTES ----------------------

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
    res.status(500).json({ message: 'Error registering user', error: err.message });
  }
});

// Login route
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
    res.status(500).json({ message: 'Error during login', error: err.message });
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

// ---------------------- BOOKINGS ----------------------

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
    const bookings = await Booking.find({ userId: req.params.userId }).populate("destination");
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings", details: err.message });
  }
});

// ---------------------- DESTINATIONS ----------------------

app.post('/destinations', async (req, res) => {
  try {
    const destination = new Destination(req.body);
    await destination.save();
    res.status(201).json({ message: 'Destination created!', destination });
  } catch (err) {
    res.status(500).json({ message: 'Error creating destination', error: err.message });
  }
});

app.get('/destinations', async (req, res) => {
  try {
    const destinations = await Destination.find({});
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch destinations" });
  }
});

// ---------------------- FAVORITES ----------------------

app.post('/favorites', async (req, res) => {
  try {
    const { userId, destinationId } = req.body;
    const existing = await Favorite.findOne({ userId, destinationId });
    if (existing) {
      return res.status(409).json({ message: 'Already favorited', favorite: existing });
    }
    const favorite = new Favorite({ userId, destinationId });
    await favorite.save();

    await Activity.create({
      userId,
      type: 'favorite',
      content: `Added favorite for destination ${destinationId}`,
      destinationId
    });

    res.status(201).json({ message: 'Favorite added!', favorite });
  } catch (err) {
    res.status(500).json({ message: 'Error adding favorite', error: err.message });
  }
});

app.get('/favorites/:userId', async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.params.userId }).populate('destinationId');
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching favorites', error: err.message });
  }
});

app.delete('/favorites/:id', async (req, res) => {
  try {
    await Favorite.findByIdAndDelete(req.params.id);
    res.json({ message: 'Favorite removed' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing favorite', error: err.message });
  }
});

// ---------------------- ACTIVITIES ----------------------

app.post('/activities', async (req, res) => {
  try {
    const activity = new Activity(req.body);
    await activity.save();
    res.status(201).json({ message: 'Activity logged!', activity });
  } catch (err) {
    res.status(500).json({ message: 'Error logging activity', error: err.message });
  }
});

app.get('/activities/:userId', async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('destinationId');
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching activities', error: err.message });
  }
});

// ---------------------- IMAGES ----------------------

app.post('/images', async (req, res) => {
  try {
    const image = new Image(req.body);
    await image.save();
    res.status(201).json({ message: 'Image uploaded!', image });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading image', error: err.message });
  }
});

app.get('/images', async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const images = await Image.find(filter);
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching images', error: err.message });
  }
});

// ---------------------- PAGES ----------------------

app.post('/pages', async (req, res) => {
  try {
    const page = new Page(req.body);
    await page.save();
    res.status(201).json(page);
  } catch (err) {
    res.status(500).json({ message: 'Error creating page', error: err.message });
  }
});

app.get('/pages', async (req, res) => {
  try {
    const pages = await Page.find();
    res.json(pages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pages', error: err.message });
  }
});

app.get('/pages/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug });
    if (page) res.json(page);
    else res.status(404).json({ message: 'Page not found' });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching page', error: err.message });
  }
});

// ---------------------- HEALTH CHECK ----------------------

app.get('/health', (req, res) => {
  res.json({ status: 'ok', dbState: mongoose.connection.readyState });
});

// ---------------------- START SERVER ----------------------

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Atlas connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });
