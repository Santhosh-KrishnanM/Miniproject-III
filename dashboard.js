// Dashboard functionality
let currentUser = null;
let selectedDestinationId = null;
let destinations = []; // store destinations from backend

// --------- INITIAL LOAD ------------
document.addEventListener('DOMContentLoaded', async function() {
  const userData = localStorage.getItem('currentUser');
  if (userData) {
    currentUser = JSON.parse(userData);
    updateUserProfile();
    await renderAllSections();
    await loadUserBookings(currentUser._id);
  }
  await loadDestinations();
  setupDestinationSearch();
  setupDateRestrictions();
  setupLogoutHandler();

  // ✅ Check if coming from destination details page
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('openBooking') === 'true') {
    const bookingDest = localStorage.getItem('bookingDestination');
    if (bookingDest) {
      const dest = JSON.parse(bookingDest);
      openBookingForm();
      selectedDestinationId = dest.id;
      document.getElementById("destinationSearch").value = dest.name;
      localStorage.removeItem('bookingDestination'); // Clean up
      console.log('✅ Booking form opened with pre-filled destination');
    }
  }
});

// --------- USER PROFILE ------------
function updateUserProfile() {
  if (currentUser) {
    document.getElementById('userName').textContent = `Welcome, ${currentUser.username}!`;
    document.getElementById('profileName').textContent = currentUser.username;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profileEmailDetail').textContent = currentUser.email;
    document.getElementById('profilePhone').textContent = currentUser.phone;
    document.getElementById('profileAddress').textContent = currentUser.address;
  }
}

// --------- SECTIONS & NAVIGATION ------------
function showSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');

  document.querySelectorAll('.sidebar-menu li').forEach(item => item.classList.remove('active'));
  const activeMenu = document.querySelector(`[onclick="showSection('${sectionId}')"]`)?.parentElement;
  if (activeMenu) activeMenu.classList.add('active');

  const titles = {
    overview: 'Dashboard',
    destinations: 'Destinations',
    bookings: 'My Bookings',
    favorites: 'Favorites',
    profile: 'Profile',
    support: 'Support'
  };
  if (titles[sectionId]) document.getElementById('pageTitle').textContent = titles[sectionId];
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// --------- API INTEGRATION ------------
async function getDestinations() {
  const res = await fetch('/destinations');
  return res.json();
}

async function getUserFavorites(userId) {
  if (!userId) return [];
  const res = await fetch(`/favorites/${userId}`);
  return res.json();
}

async function getUserBookings(userId) {
  if (!userId) return [];
  const res = await fetch(`/api/bookings/${userId}`);
  return res.json();
}

async function getUserActivities(userId) {
  if (!userId) return [];
  const res = await fetch(`/activities/${userId}`);
  return res.json();
}

// --------- LOAD DESTINATIONS ------------
async function loadDestinations() {
  try {
    const list = await getDestinations();
    destinations = list;
    return list;
  } catch (err) {
    console.error("Error loading destinations:", err);
    return [];
  }
}

// --------- RENDER FUNCTIONS ------------
async function renderAllSections() {
  await renderDestinations();
  await renderFavorites();
  await renderBookings();
  await renderActivities();
  await updateStats();
  await renderTravelInsights(); // New: Travel insights widget
}

async function renderDestinations() {
  const list = await getDestinations();
  
  // ✅ Sort destinations by rating (highest first)
  destinations = list.sort((a, b) => {
    const ratingA = parseFloat(a.rating) || 0;
    const ratingB = parseFloat(b.rating) || 0;
    return ratingB - ratingA; // Descending order
  });
  
  const container = document.getElementById('destinationsList');
  
  if (!container) {
    console.error('Destinations container not found');
    return;
  }
  
  container.innerHTML = '';

  if (!destinations || destinations.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666; grid-column: 1 / -1;">
        <i class="fas fa-map-marker-alt" style="font-size: 3rem; margin-bottom: 15px; display: block; color: #ccc;"></i>
        <h3 style="color: #666;">No destinations available</h3>
        <p>Check back later for amazing destinations!</p>
      </div>
    `;
    return;
  }

  destinations.forEach((dest, index) => {
    const card = document.createElement('div');
    card.className = 'destination-card';
    card.onclick = () => showDestinationDetails(dest._id);
    
    // Use the imageUrl from database, fallback to placeholder
    const imageUrl = dest.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80';
    
    // Format the type nicely
    const typeFormatted = dest.type ? dest.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Destination';
    
    // Add badge for top 3 rated destinations
    let badge = '';
    if (index === 0) {
      badge = '<div class="top-badge" style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);"><i class="fas fa-crown"></i> #1 Top Rated</div>';
    } else if (index === 1) {
      badge = '<div class="top-badge" style="background: linear-gradient(135deg, #C0C0C0 0%, #808080 100%);"><i class="fas fa-medal"></i> #2</div>';
    } else if (index === 2) {
      badge = '<div class="top-badge" style="background: linear-gradient(135deg, #CD7F32 0%, #8B4513 100%);"><i class="fas fa-award"></i> #3</div>';
    }
    
    card.innerHTML = `
      <div class="destination-image" style="
        background-image: url('${imageUrl}');
        background-size: cover;
        background-position: center;
        height: 200px;
        border-radius: 12px 12px 0 0;
        position: relative;
      ">
        ${badge}
        <div style="
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.95);
          padding: 5px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.9rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          ${dest.rating ? '⭐ ' + dest.rating : 'New'}
        </div>
      </div>
      <div class="destination-info">
        <h4>${dest.name}</h4>
        <p style="color: #666; font-size: 0.9rem; margin: 5px 0;">
          <i class="fas fa-star" style="color: #ffa500;"></i> 
          ${dest.rating || 'Not rated'} 
          ${dest.reviews ? `(${dest.reviews} reviews)` : ''}
        </p>
        <span class="destination-type" style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 4px 12px;
          border-radius: 15px;
          font-size: 0.8rem;
          display: inline-block;
          margin: 8px 0;
        ">${typeFormatted}</span>
        <button class="btn-outline" onclick="event.stopPropagation(); addFavorite('${currentUser?._id}', '${dest._id}')" style="
          width: 100%;
          margin-top: 10px;
        ">
          <i class="fas fa-heart"></i> Add to Favorites
        </button>
      </div>
    `;
    container.appendChild(card);
  });
  
  console.log(`✅ Rendered ${destinations.length} destinations sorted by rating`);
}

// --------- SHOW DESTINATION DETAILS (Navigate to separate page) ------------
function showDestinationDetails(destinationId) {
  console.log(`🔄 Navigating to destination details: ${destinationId}`);
  window.location.href = `destination-details.html?id=${destinationId}`;
}

// --------- CLOSE DESTINATION DETAILS MODAL ------------
function closeDestinationDetailsModal() {
  const modal = document.getElementById('destinationDetailsModal');
  if (modal) {
    modal.remove();
  }
}

// --------- ADD TO FAVORITES FROM MODAL ------------
async function addFavoriteFromModal(userId, destinationId) {
  try {
    const res = await fetch('/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, destinationId })
    });

    const data = await res.json();

    if (res.ok) {
      alert('✅ Added to favorites!');
      closeDestinationDetailsModal();
      await renderAllSections(); // Refresh to update favorites count
    } else {
      alert(data.message || 'Failed to add to favorites');
    }
  } catch (error) {
    console.error('Error adding to favorites:', error);
    alert('Error adding to favorites');
  }
}

// --------- BOOK FROM DESTINATION MODAL ------------
function bookFromDestinationModal(destinationId, destinationName) {
  // Close destination modal
  closeDestinationDetailsModal();
  
  // Open booking modal
  openBookingForm();
  
  // Pre-fill destination
  selectedDestinationId = destinationId;
  document.getElementById("destinationSearch").value = destinationName;
  
  console.log(`✅ Booking form opened for: ${destinationName}`);
}

// --------- ADD TO FAVORITES (for destination cards) ------------
async function addFavorite(userId, destinationId) {
  if (!userId || !destinationId) {
    alert("Please login to add favorites");
    return;
  }

  try {
    const res = await fetch('/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, destinationId })
    });

    const data = await res.json();

    if (res.ok) {
      alert('✅ Added to favorites!');
      await renderAllSections(); // Refresh all sections
    } else {
      alert(data.message || 'Failed to add to favorites');
    }
  } catch (error) {
    console.error('Error adding to favorites:', error);
    alert('Error adding to favorites');
  }
}

// --------- REMOVE FROM FAVORITES ------------
async function removeFavorite(favoriteId) {
  if (!confirm("Remove from favorites?")) return;

  try {
    const res = await fetch(`/favorites/${favoriteId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      alert('✅ Removed from favorites');
      await renderAllSections(); // Refresh all sections
    } else {
      alert('Failed to remove from favorites');
    }
  } catch (error) {
    console.error('Error removing favorite:', error);
    alert('Error removing favorite');
  }
}

// --------- FILTER DESTINATIONS ------------
function filterDestinations(filterType) {
  console.log(`Filtering destinations by: ${filterType}`);
  
  // Update active filter button
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Filter destinations
  const container = document.getElementById('destinationsList');
  container.innerHTML = '';

  let filtered = filterType === 'all' 
    ? destinations 
    : destinations.filter(d => d.type === filterType);

  // ✅ Sort filtered results by rating
  filtered.sort((a, b) => {
    const ratingA = parseFloat(a.rating) || 0;
    const ratingB = parseFloat(b.rating) || 0;
    return ratingB - ratingA;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">
        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
        <h3>No destinations found</h3>
        <p>Try a different filter</p>
      </div>
    `;
    return;
  }

  filtered.forEach((dest, index) => {
    const card = document.createElement('div');
    card.className = 'destination-card';
    card.onclick = () => showDestinationDetails(dest._id);
    
    const imageUrl = dest.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80';
    const typeFormatted = dest.type ? dest.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Destination';
    
    // Add badge for top 3 in filtered results
    let badge = '';
    if (index === 0) {
      badge = '<div class="top-badge" style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);"><i class="fas fa-crown"></i> Top Rated</div>';
    }
    
    card.innerHTML = `
      <div class="destination-image" style="
        background-image: url('${imageUrl}');
        background-size: cover;
        background-position: center;
        height: 200px;
        border-radius: 12px 12px 0 0;
        position: relative;
      ">
        ${badge}
        <div style="
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.95);
          padding: 5px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.9rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          ${dest.rating ? '⭐ ' + dest.rating : 'New'}
        </div>
      </div>
      <div class="destination-info">
        <h4>${dest.name}</h4>
        <p style="color: #666; font-size: 0.9rem; margin: 5px 0;">
          <i class="fas fa-star" style="color: #ffa500;"></i> 
          ${dest.rating || 'Not rated'} 
          ${dest.reviews ? `(${dest.reviews} reviews)` : ''}
        </p>
        <span class="destination-type" style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 4px 12px;
          border-radius: 15px;
          font-size: 0.8rem;
          display: inline-block;
          margin: 8px 0;
        ">${typeFormatted}</span>
        <button class="btn-outline" onclick="event.stopPropagation(); addFavorite('${currentUser?._id}', '${dest._id}')" style="
          width: 100%;
          margin-top: 10px;
        ">
          <i class="fas fa-heart"></i> Add to Favorites
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  console.log(`✅ Filtered ${filtered.length} destinations sorted by rating`);
}


async function renderFavorites() {
  const favorites = await getUserFavorites(currentUser?._id);
  const container = document.getElementById('favoritesGrid');
  container.innerHTML = '';

  favorites.forEach(fav => {
    const dest = fav.destinationId;
    const card = document.createElement('div');
    card.className = 'destination-card';
    card.innerHTML = `
      <div class="destination-image" style="background-image: url('${dest?.imageUrl || ''}')"></div>
      <div class="destination-info">
        <h4>${dest?.name || 'Unknown'}</h4>
        <button class="btn-danger" onclick="event.stopPropagation(); removeFavorite('${fav._id}')">
          <i class="fas fa-heart-broken"></i> Remove
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function renderBookings() {
  const bookings = await getUserBookings(currentUser?._id);
  const container = document.getElementById('bookingsList');
  container.innerHTML = '';

  bookings.forEach(booking => {
    const card = document.createElement('div');
    card.className = 'booking-card';
    card.innerHTML = `
      <div class="booking-header">
        <h3>${booking.destination?.name || "Unknown"}</h3>
        <span class="booking-status ${booking.status.toLowerCase()}">${booking.status}</span>
      </div>
      <div class="booking-details">
        <div class="detail-item"><i class="fas fa-calendar"></i> <span>${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}</span></div>
        <div class="detail-item"><i class="fas fa-users"></i> <span>${booking.travelers || 1} Travelers</span></div>
      </div>
      <div class="booking-actions">
        <button class="btn-outline" onclick="viewBookingDetails('${booking._id}')">View Details</button>
        <button class="btn-outline" onclick='openModifyForm(${JSON.stringify({
          _id: booking._id,
          startDate: booking.startDate,
          endDate: booking.endDate,
          travelers: booking.travelers,
          destination: booking.destination
        })})'>Modify</button>
        <button class="btn-danger" onclick="cancelBooking('${booking._id}')">Cancel</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// --------- RENDER ACTIVITIES (FIXED - NO CANCELLED BOOKINGS) ------------
async function renderActivities() {
  const activities = await getUserActivities(currentUser?._id);
  const container = document.getElementById('activityList');
  container.innerHTML = '';

  // ✅ Filter out cancelled booking activities
  const filteredActivities = activities.filter(act => {
    return !(act.content && act.content.toLowerCase().includes('cancelled'));
  });

  if (!filteredActivities.length) {
    container.innerHTML = `
      <div class="activity-item" style="justify-content: center;">
        <div class="activity-details" style="text-align: center;">
          <p style="color: #999;"><i class="fas fa-inbox"></i> No recent activity</p>
          <span style="font-size: 0.85em;">Start exploring destinations to see your activity here!</span>
        </div>
      </div>
    `;
    return;
  }

  // ✅ Display username instead of ID
  filteredActivities.slice(0, 5).forEach(act => {
    const icon = act.type === 'favorite' ? 'heart' : act.type === 'booking' ? 'calendar-check' : 'star';
    const userName = currentUser?.username || 'You';

    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-icon"><i class="fas fa-${icon}"></i></div>
      <div class="activity-details">
        <p><strong>${userName}</strong> ${act.content || act.type}</p>
        <span>${formatDateTime(act.createdAt)}</span>
      </div>
    `;
    container.appendChild(item);
  });
}


// --------- NEW: RENDER TRAVEL INSIGHTS WIDGET ------------
async function renderTravelInsights() {
  const bookings = await getUserBookings(currentUser?._id);
  const favorites = await getUserFavorites(currentUser?._id);
  
  const container = document.getElementById('travelInsightsWidget');
  if (!container) return;

  // Calculate insights
  const upcomingTrips = bookings.filter(b => 
    b.status.toLowerCase() === 'confirmed' && 
    new Date(b.startDate) > new Date()
  );

  const completedTrips = bookings.filter(b => 
    b.status.toLowerCase() === 'completed' || 
    new Date(b.endDate) < new Date()
  );

  const nextTrip = upcomingTrips.sort((a, b) => 
    new Date(a.startDate) - new Date(b.startDate)
  )[0];

  const totalTravelers = bookings.reduce((sum, b) => sum + (b.travelers || 1), 0);

  // Popular destination types from favorites
  const favoriteTypes = favorites.map(f => f.destinationId?.type).filter(Boolean);
  const typeCount = {};
  favoriteTypes.forEach(type => {
    typeCount[type] = (typeCount[type] || 0) + 1;
  });
  const topType = Object.keys(typeCount).sort((a, b) => typeCount[b] - typeCount[a])[0];

  container.innerHTML = `
    <h3><i class="fas fa-chart-line"></i> Travel Insights</h3>
    <div class="insight-grid">
      ${nextTrip ? `
        <div class="insight-item">
          <div class="insight-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <i class="fas fa-calendar-alt"></i>
          </div>
          <div class="insight-info">
            <h4>Next Trip</h4>
            <p>${nextTrip.destination?.name || 'Unknown'}</p>
            <span>${formatDate(nextTrip.startDate)}</span>
          </div>
        </div>
      ` : ''}
      
      <div class="insight-item">
        <div class="insight-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <i class="fas fa-plane-departure"></i>
        </div>
        <div class="insight-info">
          <h4>Total Trips</h4>
          <p style="font-size: 1.5rem; font-weight: bold; color: #333;">${completedTrips.length}</p>
          <span>Completed journeys</span>
        </div>
      </div>

      <div class="insight-item">
        <div class="insight-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <i class="fas fa-users"></i>
        </div>
        <div class="insight-info">
          <h4>Travel Companions</h4>
          <p style="font-size: 1.5rem; font-weight: bold; color: #333;">${totalTravelers}</p>
          <span>Total travelers</span>
        </div>
      </div>

      ${topType ? `
        <div class="insight-item">
          <div class="insight-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
            <i class="fas fa-heart"></i>
          </div>
          <div class="insight-info">
            <h4>Favorite Type</h4>
            <p style="text-transform: capitalize;">${topType.replace('-', ' ')}</p>
            <span>Most preferred</span>
          </div>
        </div>
      ` : ''}
    </div>

    ${upcomingTrips.length > 0 ? `
      <div class="upcoming-trips-preview">
        <h4><i class="fas fa-suitcase-rolling"></i> Upcoming Trips (${upcomingTrips.length})</h4>
        <div class="trips-list">
          ${upcomingTrips.slice(0, 3).map(trip => {
            const daysUntil = Math.ceil((new Date(trip.startDate) - new Date()) / (1000 * 60 * 60 * 24));
            return `
              <div class="trip-preview-item">
                <i class="fas fa-map-marker-alt" style="color: #667eea;"></i>
                <div>
                  <strong>${trip.destination?.name || 'Unknown'}</strong>
                  <span style="color: #999; font-size: 0.85em;">in ${daysUntil} days</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${upcomingTrips.length > 3 ? `
          <button class="btn-outline" onclick="showSection('bookings')" style="margin-top: 10px; width: 100%;">
            View All Trips <i class="fas fa-arrow-right"></i>
          </button>
        ` : ''}
      </div>
    ` : `
      <div class="no-trips-message">
        <i class="fas fa-calendar-plus" style="font-size: 2rem; color: #ccc; margin-bottom: 10px;"></i>
        <p style="color: #999;">No upcoming trips planned</p>
        <button class="btn-primary" onclick="showSection('destinations')" style="margin-top: 10px;">
          <i class="fas fa-compass"></i> Explore Destinations
        </button>
      </div>
    `}
  `;
}

// --------- BOOKING FORM ------------
function openBookingForm() {
  document.getElementById("bookingModal").style.display = "flex";
  document.getElementById("destinationSearch").value = "";
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("travelers").value = "1";
  document.getElementById("destinationResults").innerHTML = "";
  selectedDestinationId = null;
  setupDateRestrictions();
}

function closeBookingForm() {
  document.getElementById("bookingModal").style.display = "none";
}

async function submitBooking() {
  const destInput = document.getElementById("destinationSearch").value.trim();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const travelers = document.getElementById("travelers").value;

  if (!destInput || !startDate || !endDate || !travelers) {
    alert("Please fill all fields.");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  if (startDate < today || endDate < today) {
    alert("Please select future dates only.");
    return;
  }

  if (endDate <= startDate) {
    alert("End date must be after start date.");
    return;
  }

  let destinationId = selectedDestinationId;
  if (!destinationId) {
    const match = destinations.find(
      (d) => d.name.toLowerCase() === destInput.toLowerCase()
    );
    if (match) {
      destinationId = match._id;
    } else {
      alert("Please select a valid destination from the list.");
      return;
    }
  }

  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser._id,
        destination: destinationId,
        startDate,
        endDate,
        travelers,
      }),
    });

    const newBooking = await res.json();

    if (res.ok) {
      alert(`✅ Booking confirmed for ${newBooking.destination?.name || "your trip"}!`);
      closeBookingForm();
      await loadUserBookings(currentUser._id);
      await renderAllSections(); // Refresh all sections including insights
      selectedDestinationId = null;
    } else {
      alert("Booking failed: " + (newBooking.error || newBooking.message || "Unknown error"));
    }
  } catch (err) {
    console.error("Booking error:", err);
    alert("Failed to save booking. Please try again later.");
  }
}

// --------- MODIFY BOOKING ------------
function openModifyForm(booking) {
  const modal = document.getElementById("modifyBookingModal");
  
  document.getElementById("modifyBookingId").value = booking._id;
  document.getElementById("modifyStartDate").value = booking.startDate.slice(0,10);
  document.getElementById("modifyEndDate").value = booking.endDate.slice(0,10);
  document.getElementById("modifyTravelers").value = booking.travelers;
  
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("modifyStartDate").setAttribute("min", today);
  document.getElementById("modifyEndDate").setAttribute("min", today);
  
  modal.style.display = "flex";
}

function closeModifyForm() {
  document.getElementById("modifyBookingModal").style.display = "none";
}

async function submitBookingModification() {
  const bookingId = document.getElementById("modifyBookingId").value;
  const startDate = document.getElementById("modifyStartDate").value;
  const endDate = document.getElementById("modifyEndDate").value;
  const travelers = document.getElementById("modifyTravelers").value;

  if (!startDate || !endDate || !travelers) {
    alert("Please fill all fields.");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  if (startDate < today || endDate < today) {
    alert("Please select future dates only.");
    return;
  }

  if (endDate <= startDate) {
    alert("End date must be after start date.");
    return;
  }

  try {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, travelers }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("✅ Booking updated successfully!");
      closeModifyForm();
      await loadUserBookings(currentUser._id);
      await updateStats();
      await renderAllSections(); // Refresh insights too
    } else {
      alert("Failed to update booking: " + (data.error || data.message || "Unknown error"));
    }
  } catch (err) {
    console.error("Update booking error:", err);
    alert("Error updating booking. Please try again later.");
  }
}

// --------- CANCEL BOOKING ------------
async function cancelBooking(bookingId) {
  const bookings = await getUserBookings(currentUser._id);
  const booking = bookings.find(b => b._id === bookingId);
  
  if (!booking) {
    alert("Booking not found.");
    return;
  }

  const bookingDate = new Date(booking.startDate);
  const today = new Date();
  const daysUntilTrip = Math.ceil((bookingDate - today) / (1000 * 60 * 60 * 24));

  let confirmMessage = `Are you sure you want to cancel your booking for "${booking.destination?.name || 'Unknown'}"?`;
  
  if (daysUntilTrip > 0) {
    confirmMessage += `\n\nYour trip is in ${daysUntilTrip} days.`;
  }
  
  confirmMessage += "\n\nThis action cannot be undone.";

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();

    if (res.ok) {
      alert(`✅ Booking cancelled successfully!\n\nBooking for "${booking.destination?.name || 'Unknown'}" has been cancelled.`);
      await loadUserBookings(currentUser._id);
      await updateStats();
      await renderAllSections(); // Refresh all sections
    } else {
      alert("Failed to cancel booking: " + (data.error || data.message || "Unknown error"));
    }
  } catch (err) {
    console.error("Cancel booking error:", err);
    alert("Error cancelling booking. Please try again later.");
  }
}

// --------- VIEW BOOKING DETAILS ------------
async function viewBookingDetails(bookingId) {
  try {
    const bookings = await getUserBookings(currentUser._id);
    const booking = bookings.find(b => b._id === bookingId);
    
    if (booking) {
      showBookingDetailsModal(booking);
    } else {
      alert("Booking not found.");
    }
  } catch (err) {
    console.error("Error loading booking details:", err);
    alert("Error loading booking details.");
  }
}

function showBookingDetailsModal(booking) {
  const existingModal = document.getElementById('bookingDetailsModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'bookingDetailsModal';
  modal.className = 'modal';
  modal.style.display = 'flex';

  const bookingDate = new Date(booking.startDate);
  const endDate = new Date(booking.endDate);
  const today = new Date();
  const isUpcoming = bookingDate > today;
  const duration = Math.ceil((endDate - bookingDate) / (1000 * 60 * 60 * 24));

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <span class="close-btn" onclick="closeBookingDetailsModal()">&times;</span>
      <h2><i class="fas fa-info-circle"></i> Booking Details</h2>
      
      
      <div class="booking-details-content">
        <div class="detail-section">
          <h3><i class="fas fa-map-marker-alt"></i> Destination</h3>
          <p><strong>${booking.destination?.name || 'Unknown Destination'}</strong></p>
          ${booking.destination?.type ? `<span class="destination-type">${booking.destination.type.replace('-', ' ')}</span>` : ''}
        </div>

        <div class="detail-section">
          <h3><i class="fas fa-calendar"></i> Travel Dates</h3>
          <p><strong>Start:</strong> ${formatDetailDate(booking.startDate)}</p>
          <p><strong>End:</strong> ${formatDetailDate(booking.endDate)}</p>
          <p><strong>Duration:</strong> ${duration} day${duration > 1 ? 's' : ''}</p>
        </div>

        <div class="detail-section">
          <h3><i class="fas fa-users"></i> Travelers</h3>
          <p><strong>${booking.travelers}</strong> ${booking.travelers > 1 ? 'people' : 'person'}</p>
        </div>

        <div class="detail-section">
          <h3><i class="fas fa-info"></i> Booking Information</h3>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Status:</strong> <span class="booking-status ${booking.status.toLowerCase()}">${booking.status}</span></p>
          <p><strong>Created:</strong> ${booking.createdAt ? formatDetailDate(booking.createdAt) : 'Not available'}</p>
        </div>

        ${isUpcoming ? `
          <div class="detail-section">
            <h3><i class="fas fa-clock"></i> Countdown</h3>
            <p><strong>${Math.ceil((bookingDate - today) / (1000 * 60 * 60 * 24))} days</strong> until your trip!</p>
          </div>
        ` : ''}

        ${booking.destination?.rating ? `
          <div class="detail-section">
            <h3><i class="fas fa-star"></i> Destination Rating</h3>
            <p><strong>${booking.destination.rating}</strong> / 5.0</p>
          </div>
        ` : ''}
      </div>

      <div class="modal-actions" style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end;">
        ${isUpcoming && booking.status.toLowerCase() === 'confirmed' ? `
          <button class="btn-outline" onclick="closeBookingDetailsModal(); openModifyForm(${JSON.stringify({
            _id: booking._id,
            startDate: booking.startDate,
            endDate: booking.endDate,
            travelers: booking.travelers,
            destination: booking.destination
          })})">
            <i class="fas fa-edit"></i> Modify Booking
          </button>
        ` : ''}
        <button class="btn-primary" onclick="closeBookingDetailsModal()">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeBookingDetailsModal() {
  const modal = document.getElementById('bookingDetailsModal');
  if (modal) {
    modal.remove();
  }
}

// --------- LOAD USER BOOKINGS ------------
async function loadUserBookings(userId) {
  try {
    const res = await fetch(`/api/bookings/${userId}`);
    const bookings = await res.json();
    const container = document.getElementById("bookingsList");
    container.innerHTML = "";

    if (!bookings.length) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>
          <h3>No bookings found</h3>
          <p>Start planning your next adventure!</p>
          <button class="btn-primary" onclick="openBookingForm()" style="margin-top: 15px;">
            <i class="fas fa-plus"></i> Create New Booking
          </button>
        </div>
      `;
      return;
    }

    bookings.forEach(booking => {
      const card = document.createElement("div");
      card.className = "booking-card";
      
      const bookingDate = new Date(booking.startDate);
      const today = new Date();
      const canModify = bookingDate > today && booking.status.toLowerCase() === 'confirmed';
      const canCancel = bookingDate > today && booking.status.toLowerCase() !== 'cancelled';
      
      card.innerHTML = `
        <div class="booking-header">
          <h3>${booking.destination?.name || "Unknown"} Trip</h3>
          <span class="booking-status ${booking.status.toLowerCase()}">${booking.status}</span>
        </div>
        <div class="booking-details">
          <div class="detail-item">
            <i class="fas fa-calendar"></i>
            <span>${booking.startDate.slice(0,10)} → ${booking.endDate.slice(0,10)}</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-users"></i>
            <span>${booking.travelers} Travelers</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-info-circle"></i>
            <span>Booking ID: ${booking._id.slice(-8)}</span>
          </div>
        </div>
        <div class="booking-actions">
          <button class="btn-outline" onclick="viewBookingDetails('${booking._id}')">
            <i class="fas fa-eye"></i> View Details
          </button>
          ${canModify ? 
            `<button class="btn-outline" onclick='openModifyForm(${JSON.stringify({
              _id: booking._id,
              startDate: booking.startDate,
              endDate: booking.endDate,
              travelers: booking.travelers,
              destination: booking.destination
            })})'>
              <i class="fas fa-edit"></i> Modify
            </button>` 
            : 
            `<button class="btn-outline" disabled style="opacity: 0.5;">
              <i class="fas fa-edit"></i> Modify
            </button>`
          }
          ${canCancel ? 
            `<button class="btn-danger" onclick="cancelBooking('${booking._id}')">
              <i class="fas fa-times"></i> Cancel
            </button>` 
            : 
            `<button class="btn-danger" disabled style="opacity: 0.5;">
              <i class="fas fa-times"></i> Cancel
            </button>`
          }
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading bookings:", err);
    alert("Failed to load bookings.");
  }
}

// --------- UPDATE STATS ------------
async function updateStats() {
  try {
    if (!currentUser?._id) return;

    const [destinations, favorites, bookings] = await Promise.all([
      getDestinations(),
      getUserFavorites(currentUser._id),
      getUserBookings(currentUser._id)
    ]);

    const visitedCount = bookings.filter(b => 
      b.status.toLowerCase() === 'completed' || 
      new Date(b.endDate) < new Date()
    ).length;

    const upcomingCount = bookings.filter(b => 
      b.status.toLowerCase() === 'confirmed' && 
      new Date(b.startDate) > new Date()
    ).length;

    const favoriteCount = favorites.length;
    
    const completedBookings = bookings.filter(b => 
      b.status.toLowerCase() === 'completed' || 
      new Date(b.endDate) < new Date()
    );
    
    let totalRating = 0;
    let ratedBookings = 0;
    completedBookings.forEach(booking => {
      if (booking.destination?.rating) {
        totalRating += booking.destination.rating;
        ratedBookings++;
      }
    });
    
    const averageRating = ratedBookings > 0 ? (totalRating / ratedBookings).toFixed(1) : '0';

    document.getElementById('visitedCount').textContent = visitedCount;
    document.getElementById('upcomingCount').textContent = upcomingCount;
    document.getElementById('favoriteCount').textContent = favoriteCount;
    document.getElementById('averageRating').textContent = averageRating;

  } catch (err) {
    console.error('Error updating stats:', err);
  }
}

// --------- DESTINATION SEARCH ------------
function filterDestinationsList() {
  const input = document.getElementById("destinationSearch").value.toLowerCase();
  const resultsBox = document.getElementById("destinationResults");
  resultsBox.innerHTML = "";

  destinations
    .filter(dest => dest.name.toLowerCase().includes(input))
    .forEach(dest => {
      const li = document.createElement("li");
      li.textContent = dest.name;
      li.onclick = () => selectDestination(dest);
      resultsBox.appendChild(li);
    });
}

function selectDestination(dest) {
  selectedDestinationId = dest._id;
  document.getElementById("destinationSearch").value = dest.name;
  document.getElementById("destinationResults").innerHTML = "";
}

function setupDestinationSearch() {
  const input = document.getElementById("destinationSearch");
  const resultsBox = document.getElementById("destinationResults");

  input.addEventListener("input", () => {
    const query = input.value.toLowerCase().trim();
    resultsBox.innerHTML = "";

    if (!query) return;

    const filtered = destinations.filter(d => d.name.toLowerCase().includes(query));

    filtered.forEach(dest => {
      const li = document.createElement("li");
      li.textContent = dest.name;
      li.classList.add("suggestion-item");
      li.onclick = () => selectDestination(dest);
      resultsBox.appendChild(li);
    });

    resultsBox.style.display = filtered.length ? "block" : "none";
  });

  document.addEventListener("click", (e) => {
    if (!resultsBox.contains(e.target) && e.target !== input) {
      resultsBox.style.display = "none";
    }
  });
}

// --------- DATE RESTRICTIONS ------------
function setupDateRestrictions() {
  const today = new Date().toISOString().split("T")[0];
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");

  if (!startInput || !endInput) return;

  startInput.min = today;
  endInput.min = today;

  startInput.removeEventListener("change", startInputHandler);
  endInput.removeEventListener("change", endInputHandler);

  function startInputHandler() {
    endInput.min = startInput.value || today;
    if (endInput.value && endInput.value <= startInput.value) {
      endInput.value = "";
      alert("Please select an end date after the start date.");
    }
  }

  function endInputHandler() {
    if (startInput.value && endInput.value <= startInput.value) {
      alert("End date must be after start date.");
      endInput.value = "";
    }
  }

  startInput.addEventListener("change", startInputHandler);
  endInput.addEventListener("change", endInputHandler);
}

// --------- EDIT PROFILE ------------
function editProfile() {
  document.getElementById("editProfileModal").style.display = "flex";
  document.getElementById("editUsername").value = currentUser.username;
  document.getElementById("editEmail").value = currentUser.email;
  document.getElementById("editPhone").value = currentUser.phone;
  document.getElementById("editAddress").value = currentUser.address;
}

function closeEditProfileForm() {
  document.getElementById("editProfileModal").style.display = "none";
}

async function submitProfileEdit() {
  const username = document.getElementById("editUsername").value.trim();
  const email = document.getElementById("editEmail").value.trim();
  const phone = document.getElementById("editPhone").value.trim();
  const address = document.getElementById("editAddress").value.trim();

  if (!username || !email || !phone || !address) {
    alert("Please fill all fields");
    return;
  }

  try {
    const res = await fetch(`/api/users/${currentUser._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, phone, address }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("✅ Profile updated successfully!");
      currentUser = data.user;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      updateUserProfile();
      closeEditProfileForm();
    } else {
      alert("Failed to update profile: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    console.error("Profile update error:", error);
    alert("Error updating profile");
  }
}

// --------- UTILITY FUNCTIONS ------------
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatDetailDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return 'Invalid Date';
  
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', options);
}

// --------- LOGOUT ------------
function logout() {
  if (confirm("Are you sure you want to log out?")) {
    localStorage.removeItem("currentUser");
    window.location.href = "travel.html";
  }
}

function setupLogoutHandler() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
}

// --------- SHOW ADVENTURE/FOOD PAGE ------------
function showAdventurePage() {
  window.location.href = "travel.html#adventure";
}

function showFoodPage() {
  window.location.href = "travel.html#food";
}

// ========== SUPPORT SECTION FUNCTIONS (SIMPLIFIED) ==========

// Email Support
function openEmailForm() {
  document.getElementById('emailModal').style.display = 'flex';
  
  // Pre-fill user data
  if (currentUser) {
    document.getElementById('supportName').value = currentUser.username || '';
    document.getElementById('supportEmail').value = currentUser.email || '';
  }
}

function closeEmailForm() {
  document.getElementById('emailModal').style.display = 'none';
}

function submitEmailSupport(event) {
  event.preventDefault();
  
  const name = document.getElementById('supportName').value;
  const email = document.getElementById('supportEmail').value;
  const subject = document.getElementById('supportSubject').value;
  const message = document.getElementById('supportMessage').value;
  const attachment = document.getElementById('supportAttachment').files[0];
  
  // Generate ticket ID
  const ticketId = 'TKT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  
  // In real implementation, send to backend
  console.log('Email support request:', { 
    ticketId, 
    name, 
    email, 
    subject, 
    message,
    attachment: attachment ? attachment.name : 'None'
  });
  
  alert(`✅ Your support request has been sent!\n\nTicket ID: ${ticketId}\n\nWe will respond to your email within 2 hours.`);
  closeEmailForm();
  document.getElementById('emailSupportForm').reset();
}

// WhatsApp Support
function openWhatsApp() {
  const userName = currentUser ? currentUser.username : 'User';
  const message = encodeURIComponent(`Hi, I'm ${userName} from Travel Aura. I need help with:`);
  window.open(`https://wa.me/919876543210?text=${message}`, '_blank');
}

// FAQ Functions
function openFAQ(question) {
  document.getElementById('faqModal').style.display = 'flex';
  document.getElementById('faqQuestion').textContent = question;
  
  // FAQ answers database
  const faqAnswers = {
    'How do I book a trip?': `
      <p><strong>Booking a trip is easy! Follow these steps:</strong></p>
      <ol style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Go to the <strong>Destinations</strong> section</li>
        <li>Browse destinations or use filters (Beach, Hill Station, etc.)</li>
        <li>Click on a destination card to view details</li>
        <li>Click the <strong>"Book This Trip"</strong> button</li>
        <li>Fill in your travel dates and number of travelers</li>
        <li>Review your booking details</li>
        <li>Click <strong>"Confirm Booking"</strong></li>
      </ol>
      <p>You'll receive a confirmation email immediately!</p>
    `,
    'Can I modify my booking?': `
      <p><strong>Yes, you can modify your booking!</strong></p>
      <p>Here's how:</p>
      <ol style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Go to <strong>My Bookings</strong> section</li>
        <li>Find the booking you want to modify</li>
        <li>Click the <strong>"Modify"</strong> button</li>
        <li>Update your travel dates or number of travelers</li>
        <li>Save changes</li>
      </ol>
      <p><strong>Important:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Modifications must be made at least 24 hours before departure</li>
        <li>You can only modify dates and number of travelers</li>
        <li>To change destination, cancel and create a new booking</li>
      </ul>
    `,
    'What is the cancellation policy?': `
      <p><strong>Our flexible cancellation policy:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>✅ <strong>Free cancellation</strong> - 48+ hours before departure</li>
        <li>⚠️ <strong>25% cancellation fee</strong> - 24-48 hours before departure</li>
        <li>❌ <strong>No refund</strong> - Less than 24 hours before departure</li>
      </ul>
      <p><strong>Refund Processing:</strong></p>
      <p>Refunds are processed within 5-7 business days to your original payment method.</p>
      <p><strong>How to cancel:</strong></p>
      <ol style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Go to My Bookings</li>
        <li>Find your booking</li>
        <li>Click "Cancel" button</li>
        <li>Confirm cancellation</li>
      </ol>
    `,
    'How do I get my booking confirmation?': `
      <p><strong>Booking confirmations are sent automatically!</strong></p>
      <p><strong>Email Confirmation:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Sent to your registered email immediately after booking</li>
        <li>Contains booking ID, destination, dates, and traveler details</li>
        <li>Check your spam folder if you don't see it</li>
      </ul>
      <p><strong>View in Dashboard:</strong></p>
      <ol style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Go to <strong>My Bookings</strong> section</li>
        <li>Find your booking</li>
        <li>Click <strong>"View Details"</strong> to see full confirmation</li>
      </ol>
      <p><strong>Print or Save:</strong></p>
      <p>You can print the confirmation or save it as PDF from your email.</p>
    `,
    'What payment methods do you accept?': `
      <p><strong>We accept multiple payment methods:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>💳 <strong>Credit Cards</strong> - Visa, MasterCard, American Express</li>
        <li>💳 <strong>Debit Cards</strong> - All major banks</li>
        <li>📱 <strong>UPI</strong> - Google Pay, PhonePe, Paytm, BHIM</li>
        <li>🏦 <strong>Net Banking</strong> - All major banks</li>
        <li>💰 <strong>Digital Wallets</strong> - Paytm, Amazon Pay, Mobikwik</li>
      </ul>
      <p><strong>International Payments:</strong></p>
      <p>We accept international credit/debit cards with proper authorization.</p>
    `,
    'Is my payment information secure?': `
      <p><strong>Yes! Your payment security is our top priority.</strong></p>
      <p><strong>Security Measures:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>🔒 <strong>256-bit SSL Encryption</strong> - Bank-grade security</li>
        <li>🛡️ <strong>PCI DSS Compliant</strong> - Industry standard compliance</li>
        <li>🔐 <strong>Secure Payment Gateway</strong> - Razorpay/Stripe integration</li>
        <li>❌ <strong>We NEVER store</strong> your complete card details</li>
        <li>✅ <strong>3D Secure</strong> authentication for added protection</li>
      </ul>
      <p><strong>Your data is encrypted and protected at all times!</strong></p>
    `,
    'How do I get a refund?': `
      <p><strong>Refund Process:</strong></p>
      <ol style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Cancel your booking (following cancellation policy)</li>
        <li>Refund is automatically initiated</li>
        <li>You'll receive a refund confirmation email</li>
        <li>Amount credited within 5-7 business days</li>
      </ol>
      <p><strong>Refund Method:</strong></p>
      <p>Refunds are processed to your original payment method:</p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>💳 Card payments → Same card</li>
        <li>📱 UPI → Same UPI ID</li>
        <li>🏦 Net Banking → Same bank account</li>
      </ul>
      <p><strong>Timeline:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Credit/Debit Card: 5-7 business days</li>
        <li>UPI/Wallets: 3-5 business days</li>
        <li>Net Banking: 5-7 business days</li>
      </ul>
    `,
    'Can I pay in installments?': `
      <p><strong>Yes! EMI options are available.</strong></p>
      <p><strong>Eligibility:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Minimum booking amount: ₹10,000</li>
        <li>Valid credit card required</li>
        <li>Available from select banks</li>
      </ul>
      <p><strong>EMI Options:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>3 months - 0% interest</li>
        <li>6 months - Low interest</li>
        <li>9 months - Standard interest</li>
        <li>12 months - Standard interest</li>
      </ul>
      <p><strong>How to choose EMI:</strong></p>
      <ol style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Proceed to payment</li>
        <li>Select "EMI" option</li>
        <li>Choose your preferred tenure</li>
        <li>Complete payment</li>
      </ol>
    `,
    'How do I choose the right destination?': `
      <p><strong>Finding your perfect destination:</strong></p>
      <p><strong>Use Filters:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>🏖️ Beach - Marina Beach, Kochi</li>
        <li>⛰️ Hill Station - Ooty, Kodaikanal</li>
        <li>🛕 Temple - Meenakshi Temple, Rameshwaram</li>
        <li>🏛️ Heritage - Historical sites</li>
      </ul>
      <p><strong>Consider:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>✈️ Travel distance and time</li>
        <li>🌦️ Weather and season</li>
        <li>👨‍👩‍👧‍👦 Group composition (family/friends/solo)</li>
        <li>💰 Budget</li>
        <li>🎯 Interests (adventure, relaxation, culture)</li>
      </ul>
      <p><strong>Check Reviews:</strong></p>
      <p>Read ratings and reviews from other travelers!</p>
    `,
    'What documents do I need?': `
      <p><strong>Required Documents:</strong></p>
      <p><strong>For All Travelers:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>📋 Valid government-issued photo ID (Aadhaar/PAN/Passport/Driving License)</li>
        <li>📱 Booking confirmation (print or digital)</li>
      </ul>
      <p><strong>For Specific Destinations:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>🏔️ Hill stations may require permits</li>
        <li>🏛️ Heritage sites may have entry restrictions</li>
        <li>🌊 Beach destinations usually don't need special permits</li>
      </ul>
      <p><strong>For Minors:</strong></p>
      <p>Minors (under 18) traveling without parents need:</p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Birth certificate or school ID</li>
        <li>Parental consent letter (if traveling with others)</li>
      </ul>
    `,
    'Are destinations family-friendly?': `
      <p><strong>Yes! Most destinations are family-friendly.</strong></p>
      <p><strong>Family-Friendly Features:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>👶 Child-friendly accommodations</li>
        <li>🎡 Activities for all ages</li>
        <li>🍽️ Family restaurants available</li>
        <li>🚗 Easy accessibility</li>
        <li>⚕️ Medical facilities nearby</li>
      </ul>
      <p><strong>Best for Families:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>🏖️ Marina Beach - Safe, open beach</li>
        <li>⛰️ Ooty - Pleasant weather, toy train</li>
        <li>🏞️ Kodaikanal - Beautiful lake, boating</li>
      </ul>
      <p><strong>Age Recommendations:</strong></p>
      <p>Check individual destination pages for age-specific recommendations and activities!</p>
    `,
    'What is the best time to visit?': `
      <p><strong>Best Time to Visit Tamil Nadu:</strong></p>
      <p><strong>Generally:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>🌤️ <strong>October to March</strong> - Pleasant weather (15-30°C)</li>
        <li>☀️ <strong>April to June</strong> - Hot summer (30-40°C)</li>
        <li>🌧️ <strong>July to September</strong> - Monsoon season</li>
      </ul>
      <p><strong>Destination-Specific:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>🏖️ <strong>Beaches</strong> - November to February</li>
        <li>⛰️ <strong>Hill Stations</strong> - March to June & September to November</li>
        <li>🛕 <strong>Temples</strong> - Year-round (avoid major festivals for less crowd)</li>
      </ul>
      <p><strong>Festival Season:</strong></p>
      <p>Visit during festivals like Pongal (Jan), Navarathri (Sep/Oct) for cultural experiences!</p>
      <p><strong>Pro Tip:</strong> Check destination-specific details on the destination page!</p>
    `,
    'How do I reset my password?': `
      <p><strong>Password Reset Process:</strong></p>
      <ol style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Click <strong>"Forgot Password"</strong> on the login page</li>
        <li>Enter your registered email address</li>
        <li>Check your email for reset link</li>
        <li>Click the link (valid for 1 hour)</li>
        <li>Create a new password</li>
        <li>Confirm your new password</li>
        <li>Login with your new password</li>
      </ol>
      <p><strong>Password Requirements:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Minimum 8 characters</li>
        <li>At least one uppercase letter</li>
        <li>At least one number</li>
        <li>At least one special character</li>
      </ul>
      <p><strong>Didn't receive email?</strong> Check spam folder or contact support.</p>
    `,
    'How do I update my profile?': `
      <p><strong>Updating Your Profile:</strong></p>
      <ol style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Go to <strong>Profile</strong> section in dashboard</li>
        <li>Click <strong>"Edit Profile"</strong> button</li>
        <li>Update your information:
          <ul style="margin-top: 10px;">
            <li>Username</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Address</li>
          </ul>
        </li>
        <li>Click <strong>"Save Changes"</strong></li>
      </ol>
      <p><strong>Important Notes:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Email changes require verification</li>
        <li>Phone number updates may need OTP verification</li>
        <li>Changes are instant except email (needs verification)</li>
      </ul>
    `,
    'How do I delete my account?': `
      <p><strong>Account Deletion:</strong></p>
      <p><strong>⚠️ Warning:</strong> Account deletion is <strong>permanent and irreversible!</strong></p>
      <p><strong>What gets deleted:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Your profile information</li>
        <li>Booking history</li>
        <li>Favorites</li>
        <li>Activity logs</li>
      </ul>
      <p><strong>How to delete:</strong></p>
      <ol style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Contact support at <strong>support@travelaura.com</strong></li>
        <li>Subject: "Account Deletion Request"</li>
        <li>Include your registered email and username</li>
        <li>Verify your identity</li>
        <li>Confirm deletion request</li>
      </ol>
      <p><strong>Processing Time:</strong> 7-14 business days</p>
      <p><strong>Alternative:</strong> Consider deactivating instead of deleting!</p>
    `,
    'How do I change my email?': `
      <p><strong>Changing Email Address:</strong></p>
      <ol style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Go to <strong>Profile</strong> section</li>
        <li>Click <strong>"Edit Profile"</strong></li>
        <li>Update email address field</li>
        <li>Click <strong>"Save Changes"</strong></li>
        <li>Verify new email (check inbox for verification link)</li>
        <li>Click verification link</li>
        <li>Email updated!</li>
      </ol>
      <p><strong>Important:</strong></p>
      <ul style="line-height: 2; color: #666; padding-left: 20px;">
        <li>Old email remains active until new one is verified</li>
        <li>Verification link expires in 24 hours</li>
        <li>Use a valid, active email address</li>
      </ul>
    `
  };
  
  document.getElementById('faqAnswer').innerHTML = faqAnswers[question] || '<p>Answer coming soon...</p>';
}

function closeFAQModal() {
  document.getElementById('faqModal').style.display = 'none';
}

function faqFeedback(feedback) {
  if (feedback === 'yes') {
    alert('✅ Thanks for your feedback!\n\nWe\'re glad we could help!');
  } else {
    alert('📝 Thanks for your feedback!\n\nWe\'ll work on improving this answer.\n\nPlease contact support if you need more help.');
  }
  closeFAQModal();
}

function viewAllFAQs() {
  alert('📚 Complete FAQ Center Coming Soon!\n\nFor now:\n• Browse FAQ categories above\n• Contact email support\n• Message us on WhatsApp\n\nWe\'re here to help 24/7!');
}

// Resources
// Resources
function openResource(resourceType) {
  switch(resourceType) {
    case 'travel-guide':
      alert('📚 Travel Guides\n\n' +
            'Comprehensive travel guides for all destinations:\n\n' +
            '🏖️ Beach Destinations\n' +
            '• Marina Beach - Chennai\'s iconic beach\n' +
            '• Rameshwaram - Sacred coastal town\n' +
            '• Kanyakumari - Where three seas meet\n\n' +
            '⛰️ Hill Stations\n' +
            '• Ooty - Queen of Hill Stations\n' +
            '• Kodaikanal - Princess of Hill Stations\n' +
            '• Yercaud - Poor Man\'s Ooty\n\n' +
            '🛕 Temple Destinations\n' +
            '• Meenakshi Temple - Madurai\n' +
            '• Rameshwaram Temple - Sacred pilgrimage\n' +
            '• Thanjavur - Brihadeeswarar Temple\n\n' +
            '🏛️ Heritage Sites\n' +
            '• Mahabalipuram - UNESCO World Heritage\n' +
            '• Thanjavur - Cultural capital\n' +
            '• Chettinad - Architectural marvel\n\n' +
            '💡 Tip: Click on any destination in the Destinations tab for detailed guides!');
      break;
    case 'safety-tips':
      alert('🛡️ Travel Safety Tips:\n\n' +
            '1. Keep your valuables secure\n' +
            '2. Stay in groups, especially at night\n' +
            '3. Carry valid ID at all times\n' +
            '4. Keep emergency contacts handy\n' +
            '5. Follow local guidelines and rules\n' +
            '6. Inform someone about your travel plans\n' +
            '7. Keep copies of important documents\n' +
            '8. Stay hydrated and carry medicines\n' +
            '9. Use trusted transportation\n' +
            '10. Trust your instincts!\n\n' +
            'Have a safe journey! 🌟');
      break;
    case 'blog':
      alert('📝 Travel Aura Blog\n\n' +
            'Coming Soon!\n\n' +
            'We\'re creating amazing travel content:\n' +
            '• Destination guides\n' +
            '• Travel tips & hacks\n' +
            '• Local food recommendations\n' +
            '• Budget travel ideas\n' +
            '• Photography tips\n' +
            '• Traveler stories\n\n' +
            'Stay tuned! 🌍✈️');
      break;
    case 'destination-finder':
      showSection('destinations');
      alert('🧭 Destination Finder\n\nUse the filters and search to find your perfect destination!\n\n' +
            'Try filtering by:\n' +
            '• Beach\n' +
            '• Hill Station\n' +
            '• Temple\n' +
            '• Heritage\n' +
            '• And more!');
      break;
  }
}

// Feedback
function openFeedbackForm() {
  const feedback = prompt('💬 We\'d love to hear from you!\n\nWhat do you think about Travel Aura?\nShare your thoughts, suggestions, or ideas:');
  
  if (feedback && feedback.trim()) {
    const ticketId = 'FBK-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    console.log('User feedback:', { ticketId, userId: currentUser?._id, feedback });
    alert(`✅ Thank you for your feedback!\n\nTicket ID: ${ticketId}\n\nYour input helps us improve Travel Aura for everyone! 🌟`);
  }
}

function openBugReportForm() {
  const bug = prompt('🐛 Report a Bug\n\nPlease describe the issue you encountered:\n\n' +
                     'Include:\n' +
                     '• What you were trying to do\n' +
                     '• What happened instead\n' +
                     '• Any error messages');
  
  if (bug && bug.trim()) {
    const ticketId = 'BUG-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    console.log('Bug report:', { ticketId, userId: currentUser?._id, bug });
    alert(`✅ Bug report submitted!\n\nTicket ID: ${ticketId}\n\nOur tech team will investigate this issue ASAP.\n\nWe appreciate your help in making Travel Aura better! 🛠️`);
  }
}

// Close modals on outside click
window.addEventListener('click', function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
});

console.log('✅ Support section loaded successfully');
// --------- SEARCH DESTINATIONS (REAL-TIME) ------------
function searchDestinations() {
  const searchInput = document.getElementById('destinationSearchInput');
  const query = searchInput.value.trim().toLowerCase();
  const resultsContainer = document.getElementById('destinationSearchResults');
  const clearBtn = document.querySelector('.clear-search-btn');

  // Show/hide clear button
  if (query) {
    clearBtn.style.display = 'flex';
  } else {
    clearBtn.style.display = 'none';
    resultsContainer.classList.remove('show');
    return;
  }

  // Filter destinations based on search query
  const results = destinations.filter(dest => 
    dest.name.toLowerCase().includes(query) ||
    (dest.type && dest.type.toLowerCase().includes(query)) ||
    (dest.description && dest.description.toLowerCase().includes(query))
  );

  // Sort results by rating
  results.sort((a, b) => {
    const ratingA = parseFloat(a.rating) || 0;
    const ratingB = parseFloat(b.rating) || 0;
    return ratingB - ratingA;
  });

  // Display results
  if (results.length > 0) {
    resultsContainer.innerHTML = results.map(dest => `
      <div class="search-result-item" onclick="navigateToDestination('${dest._id}')">
        <img src="${dest.imageUrl || 'https://via.placeholder.com/60'}" 
             alt="${dest.name}" 
             class="search-result-image"
             onerror="this.src='https://via.placeholder.com/60?text=No+Image'">
        <div class="search-result-info">
          <h4>${highlightText(dest.name, query)}</h4>
          <p>
            <span class="search-result-rating">⭐ ${dest.rating || 'N/A'}</span>
            <span style="text-transform: capitalize;">${dest.type ? dest.type.replace('-', ' ') : 'Destination'}</span>
          </p>
        </div>
        <i class="fas fa-arrow-right" style="color: #999;"></i>
      </div>
    `).join('');
    resultsContainer.classList.add('show');
  } else {
    resultsContainer.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <p>No destinations found for "<strong>${query}</strong>"</p>
        <small>Try searching for Marina Beach, Ooty, Kodaikanal, etc.</small>
      </div>
    `;
    resultsContainer.classList.add('show');
  }
}

// --------- HIGHLIGHT SEARCH TEXT ------------
function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<strong style="color: #667eea;">$1</strong>');
}

// --------- NAVIGATE TO DESTINATION ------------
function navigateToDestination(destinationId) {
  // Clear search
  clearDestinationSearch();
  
  // Navigate to destination details page
  window.location.href = `destination-details.html?id=${destinationId}`;
}

// --------- HANDLE ENTER KEY IN SEARCH ------------
function handleDestinationSearchEnter(event) {
  if (event.key === 'Enter') {
    const resultsContainer = document.getElementById('destinationSearchResults');
    const firstResult = resultsContainer.querySelector('.search-result-item');
    
    if (firstResult) {
      // Click the first search result
      firstResult.click();
    }
  }
}

// --------- CLEAR SEARCH ------------
function clearDestinationSearch() {
  document.getElementById('destinationSearchInput').value = '';
  document.getElementById('destinationSearchResults').classList.remove('show');
  document.querySelector('.clear-search-btn').style.display = 'none';
}

// --------- CLOSE SEARCH RESULTS ON OUTSIDE CLICK ------------
document.addEventListener('click', function(event) {
  const searchContainer = document.querySelector('.destination-search-container');
  const resultsContainer = document.getElementById('destinationSearchResults');
  
  if (searchContainer && !searchContainer.contains(event.target)) {
    resultsContainer.classList.remove('show');
  }
});

// ========== HEADER SEARCH FUNCTIONALITY ==========

// Header Search for Destinations
function headerSearchDestinations() {
  const searchInput = document.getElementById('headerSearchInput');
  const query = searchInput.value.trim().toLowerCase();
  const resultsContainer = document.getElementById('headerSearchResults');
  const clearBtn = document.querySelector('.header-clear-search');

  // Show/hide clear button
  if (query) {
    clearBtn.style.display = 'flex';
  } else {
    clearBtn.style.display = 'none';
    resultsContainer.classList.remove('show');
    return;
  }

  // Filter destinations based on search query
  const results = destinations.filter(dest => 
    dest.name.toLowerCase().includes(query) ||
    (dest.type && dest.type.toLowerCase().includes(query)) ||
    (dest.description && dest.description.toLowerCase().includes(query))
  );

  // Sort results by rating
  results.sort((a, b) => {
    const ratingA = parseFloat(a.rating) || 0;
    const ratingB = parseFloat(b.rating) || 0;
    return ratingB - ratingA;
  });

  // Display results
  if (results.length > 0) {
    resultsContainer.innerHTML = results.slice(0, 5).map(dest => `
      <div class="header-search-result-item" onclick="navigateToDestinationFromHeader('${dest._id}')">
        <img src="${dest.imageUrl || 'https://via.placeholder.com/50'}" 
             alt="${dest.name}" 
             class="header-search-result-image"
             onerror="this.src='https://via.placeholder.com/50?text=No+Image'">
        <div class="header-search-result-info">
          <h4>${highlightSearchText(dest.name, query)}</h4>
          <p>
            <span class="header-search-result-rating">⭐ ${dest.rating || 'N/A'}</span>
            <span style="text-transform: capitalize;">${dest.type ? dest.type.replace('-', ' ') : 'Destination'}</span>
          </p>
        </div>
        <i class="fas fa-arrow-right" style="color: #999; font-size: 0.9rem;"></i>
      </div>
    `).join('');
    
    // Show "View all results" if more than 5 results
    if (results.length > 5) {
      resultsContainer.innerHTML += `
        <div class="header-search-view-all" onclick="viewAllHeaderSearchResults('${query}')">
          <i class="fas fa-search"></i>
          View all ${results.length} results
        </div>
      `;
    }
    
    resultsContainer.classList.add('show');
  } else {
    resultsContainer.innerHTML = `
      <div class="header-no-results">
        <i class="fas fa-search"></i>
        <p>No destinations found for "<strong>${query}</strong>"</p>
        <small>Try searching for Marina Beach, Ooty, Kodaikanal, etc.</small>
      </div>
    `;
    resultsContainer.classList.add('show');
  }
}

// Highlight search text
function highlightSearchText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<strong style="color: #667eea;">$1</strong>');
}

// Navigate to destination from header search
function navigateToDestinationFromHeader(destinationId) {
  clearHeaderSearch();
  window.location.href = `destination-details.html?id=${destinationId}`;
}

// View all search results
function viewAllHeaderSearchResults(query) {
  clearHeaderSearch();
  showSection('destinations');
  
  // Filter destinations based on query
  const searchQuery = query.toLowerCase();
  const filtered = destinations.filter(dest => 
    dest.name.toLowerCase().includes(searchQuery) ||
    (dest.type && dest.type.toLowerCase().includes(searchQuery))
  );
  
  // Display filtered results
  const container = document.getElementById('destinationsList');
  container.innerHTML = '';
  
  if (filtered.length > 0) {
    filtered.forEach((dest, index) => {
      const card = document.createElement('div');
      card.className = 'destination-card';
      card.onclick = () => showDestinationDetails(dest._id);
      
      const imageUrl = dest.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80';
      const typeFormatted = dest.type ? dest.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Destination';
      
      card.innerHTML = `
        <div class="destination-image" style="
          background-image: url('${imageUrl}');
          background-size: cover;
          background-position: center;
          height: 200px;
          border-radius: 12px 12px 0 0;
          position: relative;
        ">
          <div style="
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(255, 255, 255, 0.95);
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          ">
            ${dest.rating ? '⭐ ' + dest.rating : 'New'}
          </div>
        </div>
        <div class="destination-info">
          <h4>${dest.name}</h4>
          <p style="color: #666; font-size: 0.9rem; margin: 5px 0;">
            <i class="fas fa-star" style="color: #ffa500;"></i> 
            ${dest.rating || 'Not rated'} 
            ${dest.reviews ? `(${dest.reviews} reviews)` : ''}
          </p>
          <span class="destination-type" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.8rem;
            display: inline-block;
            margin: 8px 0;
          ">${typeFormatted}</span>
          <button class="btn-outline" onclick="event.stopPropagation(); addFavorite('${currentUser?._id}', '${dest._id}')" style="
            width: 100%;
            margin-top: 10px;
          ">
            <i class="fas fa-heart"></i> Add to Favorites
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  }
  
  // Show notification
  alert(`🔍 Found ${filtered.length} destinations matching "${query}"`);
}

// Handle Enter key in header search
function handleHeaderSearchEnter(event) {
  if (event.key === 'Enter') {
    const resultsContainer = document.getElementById('headerSearchResults');
    const firstResult = resultsContainer.querySelector('.header-search-result-item');
    
    if (firstResult) {
      firstResult.click();
    }
  }
}

// Clear header search
function clearHeaderSearch() {
  document.getElementById('headerSearchInput').value = '';
  document.getElementById('headerSearchResults').classList.remove('show');
  document.querySelector('.header-clear-search').style.display = 'none';
}

// Close search results on outside click
document.addEventListener('click', function(event) {
  const searchBox = document.querySelector('.header-right .search-box');
  const resultsContainer = document.getElementById('headerSearchResults');
  
  if (searchBox && !searchBox.contains(event.target)) {
    resultsContainer.classList.remove('show');
  }
});

console.log('✅ Header search functionality loaded');
/* ================= TRAVELS FEATURE ================= */
// vehicles data (images should be in your project root or adjust paths)
const TRAVEL_VEHICLES = [
  { id: 'tempo', name: 'Tempo Traveller', seats: 17, cost: 600, img: 'tempo.jpg' },
  { id: 'thar', name: 'Thar', seats: 6, cost: 450, img: 'thar.jpg' },
  { id: 'travels', name: 'Travels', seats: 60, cost: 1000, img: 'travels.jpg' }
];

function renderTravelsSection() {
  const container = document.getElementById('travelsGrid');
  if (!container) return;
  container.innerHTML = '';
  TRAVEL_VEHICLES.forEach(v => {
    const card = document.createElement('div');
    card.className = 'travel-card';
    card.dataset.name = v.name;
    card.dataset.seats = v.seats;
    card.dataset.cost = v.cost;
    card.innerHTML = `
      <img src="${v.img}" alt="${v.name}">
      <div class="travel-info">
        <h4>${v.name}</h4>
        <div class="meta">Seats: ${v.seats} · ₹${v.cost} / day</div>
      </div>
    `;
    card.addEventListener('click', () => openTravelPopup(v));
    container.appendChild(card);
  });
}

// open the popup and populate the booking select
async function openTravelPopup(vehicle) {
  const popup = document.getElementById('travelPopup');
  if (!popup) return;
  document.getElementById('popupImage').src = vehicle.img;
  document.getElementById('popupName').textContent = vehicle.name;
  document.getElementById('popupSeats').textContent = `Seats: ${vehicle.seats}`;
  document.getElementById('popupCost').textContent = `Per Day Cost: ₹${vehicle.cost}`;
  document.getElementById('totalPrice').textContent = `₹0`;
  popup.style.display = 'flex';

  // populate user's bookings (filter by selectedDestinationId if available)
  let bookings = [];
  try {
    if (currentUser && currentUser._id) {
      bookings = await getUserBookings(currentUser._id);
    }
  } catch (err) {
    console.error('Error fetching user bookings for travels popup', err);
  }

  const select = document.getElementById('userBookingsSelect');
  select.innerHTML = '<option value="">— Select booking —</option>';
  // Filter bookings (if selectedDestinationId present, show bookings for that dest)
  const filtered = selectedDestinationId ? bookings.filter(b => {
    // booking.destination may be object or id depending on your API
    const bid = b.destination?._id || b.destination;
    return bid === selectedDestinationId;
  }) : bookings;

  if (filtered.length === 0) {
    // show all bookings but indicate none for this destination
    select.innerHTML += `<option value="" disabled>No bookings for this destination</option>`;
  } else {
    filtered.forEach(b => {
      const start = b.startDate ? b.startDate.slice(0,10) : '';
      const end = b.endDate ? b.endDate.slice(0,10) : '';
      const title = `${b.destination?.name || 'Booking'} — ${start} → ${end} (${b._id.slice(-6)})`;
      select.innerHTML += `<option value="${b._id}" data-start="${b.startDate}" data-end="${b.endDate}">${escapeHtml(title)}</option>`;
    });
  }

  // on booking selection, calculate total
  select.onchange = function() {
    const opt = select.options[select.selectedIndex];
    if (!opt || !opt.value) {
      document.getElementById('totalPrice').textContent = `₹0`;
      return;
    }
    const start = opt.dataset.start;
    const end = opt.dataset.end;
    if (!start || !end) {
      document.getElementById('totalPrice').textContent = `₹0`;
      return;
    }
    const days = calcDaysInclusive(start, end);
    const total = days * vehicle.cost;
    document.getElementById('totalPrice').textContent = `₹${total}`;
    // store selection temporarily
    popup.dataset.selectedBooking = opt.value;
    popup.dataset.selectedVehicle = JSON.stringify(vehicle);
    popup.dataset.selectedTotal = total;
  };

  // bind confirm button
  document.getElementById('confirmBooking').onclick = confirmTravelBooking;
}

function closeTravelPopup() {
  const popup = document.getElementById('travelPopup');
  if (popup) popup.style.display = 'none';
}

// Helper: calculate inclusive days between ISO dates
function calcDaysInclusive(startISO, endISO) {
  const s = new Date(startISO.slice(0,10));
  const e = new Date(endISO.slice(0,10));
  const diff = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

// Helper: escape text for safety in option values
function escapeHtml(txt) {
  if (!txt) return '';
  return txt.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Confirm booking — updates server booking with assigned travel info
async function confirmTravelBooking() {
  const popup = document.getElementById('travelPopup');
  const bookingId = popup.dataset.selectedBooking;
  const vehicle = popup.dataset.selectedVehicle ? JSON.parse(popup.dataset.selectedVehicle) : null;
  const total = popup.dataset.selectedTotal ? parseInt(popup.dataset.selectedTotal) : 0;

  if (!bookingId || !vehicle) {
    alert('Please select one of your bookings to assign this vehicle.');
    return;
  }

  // Prepare payload (add assignedTravel field). Adjust if your backend expects other shape.
  const payload = {
    assignedTravel: {
      name: vehicle.name,
      costPerDay: vehicle.cost,
      totalPrice: total
    }
  };

  try {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      // success: update UI and activities
      closeTravelPopup();
      showSuccessToast('Travel assigned to booking!');
      await loadUserBookings(currentUser._id);
      await renderAllSections();

      // try to add a simple activity (if your /activities endpoint exists)
      try {
        await fetch('/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser._id,
            type: 'booking',
            content: `${currentUser.username} assigned ${vehicle.name} to a booking for ${bookingId}`,
            createdAt: new Date().toISOString()
          })
        });
      } catch (err) {
        // ignore if backend not available
        console.warn('Activities endpoint not available or failed', err);
      }
    } else {
      const errText = await res.text();
      alert('Failed to save travel data: ' + errText);
    }
  } catch (err) {
    console.error('confirmTravelBooking error', err);
    alert('Error assigning travel. See console.');
  }
}

// small toast helper
function showSuccessToast(msg) {
  const t = document.getElementById('successPopup');
  if (!t) return;
  t.textContent = msg || 'Saved!';
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 2200);
}

// When showing the Dashboard or when DOM content loads, render travels grid
document.addEventListener('DOMContentLoaded', () => {
  renderTravelsSection();
});

// Also re-render travels grid when user logs in / sections update (call when appropriate)

/* ===================== TRAVELS: Confirm & UI update (Fixed Version) ===================== */
async function confirmTravelBooking() {
  const popup =
    document.getElementById("travelPopup") ||
    document.getElementById("travelModal") ||
    document.getElementById("travelModalAlt");

  const bookingId = popup?.dataset?.selectedBooking;
  const vehicle = popup?.dataset?.selectedVehicle
    ? JSON.parse(popup.dataset.selectedVehicle)
    : null;
  const total = popup?.dataset?.selectedTotal
    ? parseInt(popup.dataset.selectedTotal)
    : 0;

  if (!bookingId || !vehicle) {
    alert("Please select a booking from the dropdown before confirming.");
    return;
  }

  // ✅ Step 1: Fetch the full booking details from backend
  let currentBooking;
  try {
    const resGet = await fetch(`/api/bookings/${bookingId}`);
    if (!resGet.ok) {
      const t = await resGet.text().catch(() => null);
      alert("Unable to load booking details: " + (t || resGet.status));
      return;
    }
    currentBooking = await resGet.json();
  } catch (err) {
    console.error("Error fetching booking", err);
    alert("Error fetching booking details from server.");
    return;
  }

  // ✅ Step 2: Validate booking date (block past trips)
  try {
  // ✅ Skip date validation if missing, just log warning instead
  if (!currentBooking.startDate || !currentBooking.endDate) {
    console.warn("⚠️ Booking missing start/end date — proceeding without validation.");
  } else {
    const now = new Date();
    const bookingEnd = new Date(currentBooking.endDate);
    if (bookingEnd < now.setHours(0, 0, 0, 0)) {
      alert("This trip has already ended. Cannot assign travel for completed trips.");
      return;
    }
  }
} catch (err) {
  console.warn("Date validation warning", err);
}


  // ✅ Step 3: Prepare safe update payload with required fields
  const updatePayload = {
    startDate: currentBooking.startDate,
    endDate: currentBooking.endDate,
    travelers: currentBooking.travelers || 1,
    assignedTravel: {
      name: vehicle.name,
      seats: vehicle.seats,
      costPerDay: vehicle.costPerDay || vehicle.cost,
      totalPrice: total,
      bookedAt: new Date().toISOString(),
    },
  };

  // ✅ Step 4: PUT updated booking back to server
  try {
    const resPut = await fetch(`/api/bookings/${bookingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
    });

    if (!resPut.ok) {
      const text = await resPut.text().catch(() => null);
      alert("Failed to save travel data: " + (text || resPut.status));
      console.error("PUT /api/bookings error:", text || resPut.status);
      return;
    }

    // ✅ Step 5: Success — show popup & update UI
    closeTravelPopup?.() || closeTravelModal?.();
    const destName =
      currentBooking.destination?.name ||
      currentBooking.destination ||
      "your destination";
    showCenteredSuccess(`${vehicle.name} booked for ${destName}`);

    // ✅ Step 6: Update bookings UI
    try {
      if (
        typeof loadUserBookings === "function" &&
        typeof renderAllSections === "function"
      ) {
        await loadUserBookings(currentUser?._id || currentUser?.id);
        await renderAllSections();
      } else {
        refreshBookingsList();
      }
    } catch (err) {
      console.warn("Could not reload bookings", err);
      refreshBookingsList();
    }

    // ✅ Step 7: Add to recent activities
    try {
      await fetch("/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?._id || currentUser?.id,
          type: "travel",
          content: `${vehicle.name} booked for ${destName}`,
          createdAt: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn("Activity logging failed", e);
    }
  } catch (err) {
    console.error("confirmTravelBooking error", err);
    alert("Error saving travel — check console for details.");
  }
}

/* ---------- helper: show centered success popup (vehicle booked) ---------- */
function showCenteredSuccess(message) {
  let s = document.getElementById("centeredSuccessToast");
  if (!s) {
    s = document.createElement("div");
    s.id = "centeredSuccessToast";
    Object.assign(s.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%,-50%)",
      background: "rgba(17, 25, 40, 0.95)",
      color: "#5ec5ff",
      padding: "18px 26px",
      borderRadius: "12px",
      zIndex: 99999,
      boxShadow: "0 0 30px rgba(94,197,255,0.45)",
      fontWeight: "700",
      fontSize: "1.05rem",
      textAlign: "center",
    });
    document.body.appendChild(s);
  }
  s.textContent = message;
  s.style.display = "block";
  setTimeout(() => {
    s.style.display = "none";
  }, 2200);
}

/* ---------- fallback: refresh bookings ---------- */
async function refreshBookingsList() {
  const bookingsListEl =
    document.getElementById("bookingsList") ||
    document.getElementById("bookingsListContainer");
  if (!bookingsListEl) return;

  try {
    const res = await fetch("/api/bookings");
    if (!res.ok) {
      console.warn("Could not refresh bookings list - server returned", res.status);
      return;
    }
    const allBookings = await res.json();
    bookingsListEl.innerHTML = "";
    (allBookings || []).forEach((b) => {
      const card = document.createElement("div");
      card.className = "booking-card";
      const destName =
        b.destination?.name || b.destination || "Destination";
      let travelInfo = "";
      if (b.assignedTravel) {
        travelInfo = `<div class="assigned-travel">Travels: ${escapeHtml(
          b.assignedTravel.name
        )} — ₹${b.assignedTravel.totalPrice}</div>`;
      }
      card.innerHTML = `
        <h3>${escapeHtml(destName)}</h3>
        <p>From: ${escapeHtml(
          b.startDate?.slice(0, 10) || ""
        )} To: ${escapeHtml(b.endDate?.slice(0, 10) || "")}</p>
        ${travelInfo}
        <div style="margin-top:8px;"><button onclick="openTravelFromBooking('${
          b._id
        }')">Book/Change Travels</button></div>
      `;
      bookingsListEl.appendChild(card);
    });
  } catch (err) {
    console.error("refreshBookingsList error", err);
  }
}

/* ---------- open travel popup preselect booking ---------- */
function openTravelFromBooking(bookingId) {
  try {
    showSection && showSection("travels");
  } catch (e) {}
  if (typeof renderTravelsSection === "function") renderTravelsSection();

  setTimeout(() => {
    const popup =
      document.getElementById("travelPopup") ||
      document.getElementById("travelModal");
    if (popup) popup.dataset.preselectBooking = bookingId;
  }, 200);
}
