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

// ---------------------- ADMIN ROUTES ----------------------

app.post('/admin/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const existing = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existing)
      return res.status(409).json({ message: 'Admin already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const admin = new Admin({ username, email, password: hashed });
    await admin.save();

    res.status(201).json({ message: '✅ Admin account created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error creating admin', error: err.message });
  }
});

// ✅ Admin Login (SINGLE DEFINITION)
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: 'Invalid username' });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    res.json({
      message: 'Login successful',
      admin: {
        _id: admin._id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// ---------------------- UPDATE USER PROFILE ----------------------
app.put('/api/users/:id', async (req, res) => {
  try {
    const { username, email, phone, address } = req.body;

    if (!username || !email || !phone || !address) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, phone, address },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile", details: err.message });
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

// ---------------------- UPDATE BOOKING ----------------------
app.put('/api/bookings/:id', async (req, res) => {
  try {
    const { startDate, endDate, travelers } = req.body;

    // Validate
    if (!startDate || !endDate || !travelers) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Find and update booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { startDate, endDate, travelers },
      { new: true }
    ).populate("destination");

    if (!updatedBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Log activity for user
    await Activity.create({
      userId: updatedBooking.userId,
      type: 'booking',
      content: `Modified booking for ${updatedBooking.destination.name}`,
      destinationId: updatedBooking.destination._id
    });

    res.json(updatedBooking);
  } catch (err) {
    res.status(500).json({ error: "Failed to update booking", details: err.message });
  }
});

// ---------------------- DELETE BOOKING ----------------------
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Log activity when user cancels booking
    await Activity.create({
      userId: booking.userId,
      type: 'booking',
      content: `Cancelled booking for ${booking.destination}`,
      destinationId: booking.destination
    });

    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete booking", details: err.message });
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

// ---------------------- ADMIN DATA ROUTES ----------------------

// Get all users
app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});

// Get all bookings
app.get('/admin/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().populate('destination');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bookings', error: err.message });
  }
});

// Delete a booking
app.delete('/admin/bookings/:id', async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete booking', error: err.message });
  }
});

// Get all destinations
app.get('/admin/destinations', async (req, res) => {
  try {
    const destinations = await Destination.find();
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch destinations', error: err.message });
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