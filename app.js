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

// New models
const Payment = require('./Payment');       // payment model (single declaration)
const Travel = require('./travels');        // travel vehicles model

const app = express();
app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
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
    if (!userId || !destination || !startDate || !endDate || !travelers) {
      return res.status(400).json({ error: "Missing booking fields" });
    }
    const booking = await Booking.create({
      userId,
      destination,
      startDate,
      endDate,
      travelers,
      status: "confirmed"
    });
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookings/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId })
      .populate("destination")
      .lean();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings", details: err.message });
  }
});

app.put("/api/bookings/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Merge update data safely
    const updateData = req.body;

    // Ensure userId is preserved if missing
    updateData.userame = updateData.username || booking.username;

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).populate("destination");

    await Activity.create({
      userId: booking.userId,
      type: updateData.assignedTravel ? "travel" : "booking",
      content: updateData.assignedTravel
        ? `Assigned ${updateData.assignedTravel.name} to ${updatedBooking.destination?.name}`
        : `Modified booking for ${updatedBooking.destination?.name}`,
      destinationId: booking.destination
    });

    res.json(updatedBooking);
  } catch (err) {
    console.error("Booking update error:", err);
    res
      .status(500)
      .json({ error: "Failed to update booking", details: err.message });
  }
});

// DELETE a booking
app.delete("/api/bookings/:id", async (req, res) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete booking", details: err.message });
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

// POST /favorites - Add to favorites
app.post('/favorites', async (req, res) => {
  try {
    const { userId, destinationId } = req.body;
    
    if (!userId || !destinationId) {
      return res.status(400).json({ 
        error: 'User ID and Destination ID are required' 
      });
    }

    // Check if already exists
    const existing = await Favorite.findOne({ 
      userId: userId, 
      destinationId: destinationId 
    });
    
    if (existing) {
      return res.status(400).json({ 
        message: 'This destination is already in your favorites!' 
      });
    }

    const newFavorite = new Favorite({
      userId: userId,
      destinationId: destinationId
    });

    await newFavorite.save();
    
    res.status(201).json({ 
      message: 'Added to favorites successfully!',
      favorite: newFavorite 
    });
    
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /favorites/:userId - Get user favorites
app.get('/favorites/:userId', async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.params.userId })
      .populate('destinationId')
      .sort({ createdAt: -1 });
    
    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /favorites/:id - Remove from favorites
app.delete('/favorites/:id', async (req, res) => {
  try {
    const favorite = await Favorite.findByIdAndDelete(req.params.id);
    
    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    
    res.json({ message: 'Removed from favorites successfully!' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Server error' });
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
    // Populate 'userId' so you can use username in frontend
    const bookings = await Booking.find({}).populate('userId');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});;

// Delete a booking (admin)
app.delete('/admin/bookings/:id', async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete booking', error: err.message });
  }
});

// Get all destinations for admin view
app.get('/admin/destinations', async (req, res) => {
  try {
    const destinations = await Destination.find();
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch destinations', error: err.message });
  }
});

// ================== ADMIN: GET ALL TRAVEL BOOKINGS ==================
app.get("/api/admin/travels", async (req, res) => {
  try {
    const bookings = await Booking.find({ "assignedTravel.name": { $exists: true } })
      .populate("userId", "username email")
      .populate("destination", "name")
      .lean();
    res.json(bookings);
  } catch (err) {
    console.error("Admin travels fetch error:", err);
    res.status(500).json({ error: "Failed to load travel bookings", details: err.message });
  }
});

// ================== ADMIN: DELETE A TRAVEL BOOKING ==================
app.delete("/api/admin/travels/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || !booking.assignedTravel) {
      return res.status(404).json({ error: "Travel not found for this booking" });
    }

    booking.assignedTravel = undefined; // remove assigned travel
    await booking.save();
    res.json({ success: true, message: "Travel deleted successfully" });
  } catch (err) {
    console.error("Admin delete travel error:", err);
    res.status(500).json({ error: "Failed to delete travel", details: err.message });
  }
});

/* -------------------- NEW: Travels (vehicles) endpoints -------------------- */
// Return available travel vehicles
app.get('/travels', async (req, res) => {
  try {
    const travels = await Travel.find();
    res.json(travels);
  } catch (err) {
    console.error('Error fetching travels:', err);
    res.status(500).json({ message: 'Failed to fetch travels', error: err.message });
  }
});

/* -------------------- NEW: Payments endpoint (simulated, updated) -------------------- */
/*
  Expected body:
  {
    bookingId,
    userId,
    amount,
    method,            // e.g., 'card', 'upi', 'netbanking'
    travelId (opt)     // optional travel vehicle id to attach to booking
  }
*/
app.post('/api/payments', async (req, res) => {
  try {
    const { bookingId, userId, amount, method, travelId } = req.body;
    if (!bookingId || !userId || !amount || !method) {
      return res.status(400).json({ message: 'bookingId, userId, amount and method are required' });
    }

    const booking = await Booking.findById(bookingId).populate('destination');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.userId) !== String(userId)) {
      return res.status(403).json({ message: 'User mismatch for booking' });
    }

    // Create payment record (simulation)
    const payment = new Payment({
      bookingId,
      userId,
      amount,
      method,
      status: 'success',
      metadata: { createdAt: new Date().toISOString() }
    });
    await payment.save();

    // Attach payment reference to booking
    booking.payments = booking.payments || [];
    booking.payments.push(payment._id);
    booking.paymentStatus = 'paid';

    // If travel selected, attach travel details but do NOT auto-approve.
    if (travelId) {
      const travel = await Travel.findById(travelId);
      if (travel) {
        booking.assignedTravel = {
          name: travel.name,
          seats: travel.seats,
          costPerDay: travel.costPerDay,
          totalPrice: req.body.travelTotal || (travel.costPerDay || travel.cost) || 0,
          bookedAt: new Date(),
          approved: false
        };
      } else {
        console.warn('Travel id not found:', travelId);
      }
    }

    // After payment the booking moves to "Pending Approval" (admin must approve if travel assigned)
    booking.status = booking.assignedTravel ? 'Pending Approval' : 'Confirmed';
    booking.approvalStatus = booking.assignedTravel ? 'pending' : 'approved';

    await booking.save();

    // Log activity
    await Activity.create({
      userId,
      type: 'payment',
      content: `Payment of ₹${amount} received for booking ${bookingId}`,
      destinationId: booking.destination
    });

    res.json({ message: 'Payment successful', payment, booking });
  } catch (err) {
    console.error('Payment processing error:', err);
    res.status(500).json({ message: 'Payment failed', error: err.message });
  }
});

/* -------------------- NEW: User booked travels endpoints -------------------- */
// returns bookings belonging to user that have assignedTravel
app.get('/api/travels-booked/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await Booking.find({ userId, 'assignedTravel.name': { $exists: true } })
      .populate('destination')
      .lean();
    res.json(bookings.map(b => ({
      _id: b._id,
      travelName: b.assignedTravel?.name,
      destinationName: b.destination?.name || '',
      bookedAt: b.assignedTravel?.bookedAt || b.createdAt,
      totalPrice: b.assignedTravel?.totalPrice || 0
    })));
  } catch (err) {
    console.error('Error fetching user booked travels:', err);
    res.status(500).json({ message: 'Failed to fetch booked travels', error: err.message });
  }
});

// delete booked travel by booking id (remove assignedTravel)
app.delete('/api/travels-booked/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.assignedTravel = undefined;
    await booking.save();

    res.json({ success: true, message: 'Travel removed from booking' });
  } catch (err) {
    console.error('Error removing booked travel:', err);
    res.status(500).json({ message: 'Failed to remove booked travel', error: err.message });
  }
});

// -------------------- ADMIN: Pending approvals list --------------------
app.get('/admin/bookings/pending-approvals', async (req, res) => {
  try {
    const pending = await Booking.find({
      paymentStatus: 'paid',
      assignedTravel: { $exists: true, $ne: null },
      approvalStatus: 'pending'
    })
      .populate('userId', 'username email')
      .populate('destination', 'name')
      .lean();
    res.json(pending);
  } catch (err) {
    console.error('Failed to fetch pending approvals:', err);
    res.status(500).json({ message: 'Failed to fetch pending approvals', error: err.message });
  }
});

// -------------------- ADMIN: Approve a booked travel --------------------
app.put('/admin/bookings/:id/approve', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (!booking.assignedTravel) {
      return res.status(400).json({ message: 'No travel assigned to approve' });
    }

    if (booking.approvalStatus === 'approved') {
      return res.status(400).json({ message: 'Booking is already approved' });
    }

    booking.approvalStatus = 'approved';
    booking.status = 'Confirmed';
    booking.assignedTravel.approved = true;
    await booking.save();

    await Activity.create({
      userId: booking.userId,
      type: 'approval',
      content: `Admin approved travel ${booking.assignedTravel.name} for booking ${booking._id}`,
      destinationId: booking.destination
    });

    res.json({ message: 'Booking travel approved', booking });
  } catch (err) {
    console.error('Failed to approve booking:', err);
    res.status(500).json({ message: 'Failed to approve booking', error: err.message });
  }
});

// -------------------- ADMIN: Reject a booked travel --------------------
app.put('/admin/bookings/:id/reject', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (!booking.assignedTravel) {
      return res.status(400).json({ message: 'No travel assigned to reject' });
    }

    booking.approvalStatus = 'rejected';
    booking.status = 'Pending';
    booking.assignedTravel = undefined;
    await booking.save();

    await Activity.create({
      userId: booking.userId,
      type: 'approval',
      content: `Admin rejected the assigned travel for booking ${booking._id}`,
      destinationId: booking.destination
    });

    res.json({ message: 'Booking travel rejected', booking });
  } catch (err) {
    console.error('Failed to reject booking:', err);
    res.status(500).json({ message: 'Failed to reject booking', error: err.message });
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