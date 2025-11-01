const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const User = require('./User');
const Booking = require('./Booking');
const Destination = require('./Destination');
const Favorite = require('./Favorite');
const Activity = require('./Activity');
const Image = require('./Image');
const Page = require('./Page');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept']
}));
app.use(bodyParser.json());

// ✅ Serve static files (HTML, CSS, JS, images) from the same folder
app.use(express.static(__dirname));

// ✅ Serve travel.html as the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'travel.html'));
});

// ---------------------- STATIC ADMIN CREDENTIALS ----------------------
const STATIC_ADMIN = {
  username: 'admin',
  password: 'admin123',
  email: 'admin@travelaura.com',
  _id: 'static-admin-001'
};

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

// ---------------------- STATIC ADMIN LOGIN ----------------------
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔍 Admin login attempt:', username);

    // ✅ Check static admin credentials
    if (username === STATIC_ADMIN.username && password === STATIC_ADMIN.password) {
      console.log('✅ Static admin login successful');
      res.json({
        message: 'Login successful',
        admin: {
          _id: STATIC_ADMIN._id,
          username: STATIC_ADMIN.username,
          email: STATIC_ADMIN.email
        }
      });
    } else {
      console.log('❌ Invalid admin credentials');
      res.status(401).json({ error: 'Invalid admin credentials' });
    }
  } catch (err) {
    console.error('Admin login error:', err);
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

   if (!userId || !destination || !travelId) {
  return res.status(400).json({ error: "Missing required fields: userId, destination, or travelId" });
}


    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { startDate, endDate, travelers },
      { new: true }
    ).populate("destination");

    if (!updatedBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

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

// ✅ UPDATE BOOKING OR ASSIGN TRAVEL
app.put('/api/bookings/:id', async (req, res) => {
  try {
    const updateData = req.body;

    // 🛠️ Only validate if no travel assignment is happening
    if (!updateData.assignedTravel && (!updateData.startDate || !updateData.endDate)) {
      return res.status(400).json({ error: "Start and End dates are required" });
    }

    // ✅ Update booking with travel or date info
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: false }
    ).populate("destination");

    if (!updatedBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // 📝 Log activity (for audit)
    await Activity.create({
      userId: updatedBooking.userId,
      type: updateData.assignedTravel ? "travel" : "booking",
      content: updateData.assignedTravel
        ? `Assigned ${updateData.assignedTravel.name} for ${updatedBooking.destination.name}`
        : `Modified booking for ${updatedBooking.destination.name}`,
      destinationId: updatedBooking.destination._id
    });

    res.json(updatedBooking);
  } catch (err) {
    console.error("Booking update error:", err);
    res.status(500).json({ error: "Failed to update booking", details: err.message });
  }
});



// ---------------------- DESTINATIONS ----------------------

// Create destination
app.post('/destinations', async (req, res) => {
  try {
    const { name, type, rating, description, imageUrl } = req.body;
    
    if (!name || !type || !description || !imageUrl) {
      return res.status(400).json({ message: 'Name, type, description, and imageUrl are required' });
    }

    const destination = new Destination({
      name,
      type,
      rating: rating || 0,
      description,
      imageUrl
    });
    
    await destination.save();
    console.log('✅ Destination created:', destination.name);
    
    res.status(201).json({ 
      message: 'Destination created successfully!', 
      destination 
    });
  } catch (err) {
    console.error('Error creating destination:', err);
    res.status(500).json({ message: 'Error creating destination', error: err.message });
  }
});

// Get all destinations
app.get('/destinations', async (req, res) => {
  try {
    const destinations = await Destination.find({});
    res.json(destinations);
  } catch (err) {
    console.error('Error fetching destinations:', err);
    res.status(500).json({ error: "Failed to fetch destinations" });
  }
});

// Update destination
app.put('/destinations/:id', async (req, res) => {
  try {
    const { name, type, rating, description, imageUrl } = req.body;
    
    const updatedDestination = await Destination.findByIdAndUpdate(
      req.params.id,
      { name, type, rating, description, imageUrl },
      { new: true, runValidators: true }
    );

    if (!updatedDestination) {
      return res.status(404).json({ message: 'Destination not found' });
    }

    console.log('✅ Destination updated:', updatedDestination.name);
    
    res.json({ 
      message: 'Destination updated successfully', 
      destination: updatedDestination 
    });
  } catch (err) {
    console.error('Error updating destination:', err);
    res.status(500).json({ message: 'Error updating destination', error: err.message });
  }
});

// Delete destination
app.delete('/destinations/:id', async (req, res) => {
  try {
    const destination = await Destination.findByIdAndDelete(req.params.id);
    
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }

    console.log('✅ Destination deleted:', destination.name);
    
    res.json({ message: 'Destination deleted successfully' });
  } catch (err) {
    console.error('Error deleting destination:', err);
    res.status(500).json({ message: 'Error deleting destination', error: err.message });
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
    console.log("🔐 Static Admin Credentials:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });
