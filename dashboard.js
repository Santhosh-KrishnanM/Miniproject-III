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
  destinations = list;
  const container = document.getElementById('destinationsList');
  container.innerHTML = '';

  list.forEach(dest => {
    const card = document.createElement('div');
    card.className = 'destination-card';
    card.onclick = () => showDestinationDetails(dest._id);
    card.innerHTML = `
      <div class="destination-image" style="background-image: url('${dest.imageUrl || ''}')"></div>
      <div class="destination-info">
        <h4>${dest.name}</h4>
        <p><i class="fas fa-star"></i> ${dest.rating || '0'} (${dest.reviews || 0} reviews)</p>
        <span class="destination-type">${dest.type.replace('-', ' ')}</span>
        <button class="btn-outline" onclick="event.stopPropagation(); addFavorite('${currentUser?._id}', '${dest._id}')">
          <i class="fas fa-heart"></i> Add to Favorites
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// --------- SHOW DESTINATION DETAILS ------------
async function showDestinationDetails(destinationId) {
  try {
    // Find the destination from the loaded destinations array
    const destination = destinations.find(d => d._id === destinationId);
    
    if (!destination) {
      alert("Destination not found");
      return;
    }

    // Create modal
    const existingModal = document.getElementById('destinationDetailsModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'destinationDetailsModal';
    modal.className = 'modal';
    modal.style.display = 'flex';

    // Check if already in favorites
    const favorites = await getUserFavorites(currentUser._id);
    const isFavorite = favorites.some(fav => fav.destinationId?._id === destinationId);

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <span class="close-btn" onclick="closeDestinationDetailsModal()">&times;</span>
        
        <div class="destination-details-header">
          <div class="destination-details-image" style="background-image: url('${destination.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80'}'); height: 250px; background-size: cover; background-position: center; border-radius: 10px; margin-bottom: 20px;"></div>
          
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
            <div>
              <h2 style="margin: 0; color: #333; font-size: 1.8rem;">${destination.name}</h2>
              <span class="destination-type" style="display: inline-block; margin-top: 8px;">${destination.type ? destination.type.replace('-', ' ') : 'Destination'}</span>
            </div>
            ${destination.rating ? `
              <div style="text-align: right;">
                <div style="color: #ffa500; font-size: 1.5rem;">
                  <i class="fas fa-star"></i> ${destination.rating}
                </div>
                <span style="color: #999; font-size: 0.85rem;">${destination.reviews || 0} reviews</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="destination-details-content">
          <div class="detail-section">
            <h3><i class="fas fa-info-circle"></i> About</h3>
            <p style="line-height: 1.6; color: #666;">
              ${destination.description || 'Discover the beauty and culture of ' + destination.name + '. A perfect destination for travelers seeking memorable experiences in Tamil Nadu.'}
            </p>
          </div>

          <div class="detail-section">
            <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
            <p style="color: #666;">
              ${destination.location || 'Tamil Nadu, India'}
            </p>
          </div>

          ${destination.highlights ? `
            <div class="detail-section">
              <h3><i class="fas fa-star"></i> Highlights</h3>
              <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
                ${destination.highlights.split(',').map(h => `<li>${h.trim()}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="detail-section">
            <h3><i class="fas fa-compass"></i> Best Time to Visit</h3>
            <p style="color: #666;">
              ${destination.bestTime || 'October to March (Winter months are ideal for pleasant weather)'}
            </p>
          </div>

          ${destination.activities ? `
            <div class="detail-section">
              <h3><i class="fas fa-hiking"></i> Activities</h3>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${destination.activities.split(',').map(activity => `
                  <span style="background: #e3f2fd; color: #1976d2; padding: 6px 12px; border-radius: 15px; font-size: 0.85rem;">
                    ${activity.trim()}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="modal-actions" style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
          ${isFavorite ? `
            <button class="btn-outline" style="background: #ffebee; color: #c62828; border-color: #c62828;">
              <i class="fas fa-heart"></i> Already in Favorites
            </button>
          ` : `
            <button class="btn-outline" onclick="addFavoriteFromModal('${currentUser._id}', '${destinationId}')">
              <i class="fas fa-heart"></i> Add to Favorites
            </button>
          `}
          
          <button class="btn-primary" onclick="bookFromDestinationModal('${destinationId}', '${destination.name}')">
            <i class="fas fa-calendar-plus"></i> Book This Trip
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    console.log(`✅ Showing details for: ${destination.name}`);
    
  } catch (error) {
    console.error("Error showing destination details:", error);
    alert("Error loading destination details");
  }
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

  const filtered = filterType === 'all' 
    ? destinations 
    : destinations.filter(d => d.type === filterType);

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

  filtered.forEach(dest => {
    const card = document.createElement('div');
    card.className = 'destination-card';
    card.onclick = () => showDestinationDetails(dest._id);
    card.innerHTML = `
      <div class="destination-image" style="background-image: url('${dest.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=300&q=80'}')"></div>
      <div class="destination-info">
        <h4>${dest.name}</h4>
        <p><i class="fas fa-star"></i> ${dest.rating || '0'} (${dest.reviews || 0} reviews)</p>
        <span class="destination-type">${dest.type ? dest.type.replace('-', ' ') : 'Destination'}</span>
        <button class="btn-outline" onclick="event.stopPropagation(); addFavorite('${currentUser?._id}', '${dest._id}')">
          <i class="fas fa-heart"></i> Add to Favorites
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  console.log(`✅ Filtered ${filtered.length} destinations`);
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
    // Exclude activities that mention "Cancelled" or "cancelled"
    if (act.content && act.content.toLowerCase().includes('cancelled')) {
      return false;
    }
    return true;
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

  // Show only the 5 most recent activities
  filteredActivities.slice(0, 5).forEach(act => {
    const icon = act.type === 'favorite' ? 'heart' : act.type === 'booking' ? 'calendar-check' : 'star';
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-icon"><i class="fas fa-${icon}"></i></div>
      <div class="activity-details">
        <p>${act.content || act.type}</p>
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