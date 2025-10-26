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
}

// Update the renderDestinations function in dashboard.js
async function renderDestinations() {
  const list = await getDestinations();
  destinations = list;
  const container = document.getElementById('destinationsList');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>
        <h3>No destinations available</h3>
        <p>Please check back later for exciting destinations!</p>
      </div>
    `;
    return;
  }

  list.forEach(dest => {
    const card = document.createElement('div');
    card.className = 'destination-card';
    card.style.cursor = 'pointer';
    
    card.innerHTML = `
      <div class="destination-image" style="background-image: url('${dest.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80'}')"></div>
      <div class="destination-info">
        <h4>${dest.name}</h4>
        <p><i class="fas fa-star"></i> ${dest.rating || '4.5'} (${dest.reviews || 0} reviews)</p>
        <span class="destination-type">${(dest.type || 'destination').replace('-', ' ')}</span>
        <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn-primary" onclick="event.stopPropagation(); viewDestinationDetails('${dest._id}')">
            <i class="fas fa-eye"></i> View Details
          </button>
          <button class="btn-outline" onclick="event.stopPropagation(); addFavorite('${currentUser?._id}', '${dest._id}')">
            <i class="fas fa-heart"></i> Favorite
          </button>
        </div>
      </div>
    `;
    
    // Make entire card clickable
    card.addEventListener('click', () => viewDestinationDetails(dest._id));
    
    container.appendChild(card);
  });
}

// Add this new function to dashboard.js
function viewDestinationDetails(destinationId) {
  console.log('Viewing destination:', destinationId);
  window.location.href = `destination-details.html?id=${destinationId}`;
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

async function renderActivities() {
  const activities = await getUserActivities(currentUser?._id);
  const container = document.getElementById('activityList');
  container.innerHTML = '';

  if (!activities.length) {
    container.innerHTML = `<p style="text-align:center;">No Activity</p>`;
    return;
  }

  activities.forEach(act => {
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

// Add this function to dashboard.js for filtering
function filterDestinations(category) {
  const allDestinations = destinations; // Use the global destinations array
  const container = document.getElementById('destinationsList');
  
  // Update active filter tab
  document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');
  
  // Filter destinations
  let filtered = allDestinations;
  if (category !== 'all') {
    filtered = allDestinations.filter(dest => 
      dest.type && dest.type.toLowerCase().includes(category.toLowerCase())
    );
  }
  
  // Render filtered destinations
  container.innerHTML = '';
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666; grid-column: 1 / -1;">
        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>
        <h3>No destinations found</h3>
        <p>Try selecting a different category</p>
      </div>
    `;
    return;
  }
  
  filtered.forEach(dest => {
    const card = document.createElement('div');
    card.className = 'destination-card';
    card.style.cursor = 'pointer';
    
    card.innerHTML = `
      <div class="destination-image" style="background-image: url('${dest.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80'}')"></div>
      <div class="destination-info">
        <h4>${dest.name}</h4>
        <p><i class="fas fa-star"></i> ${dest.rating || '4.5'} (${dest.reviews || 0} reviews)</p>
        <span class="destination-type">${(dest.type || 'destination').replace('-', ' ')}</span>
        <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn-primary" onclick="event.stopPropagation(); viewDestinationDetails('${dest._id}')">
            <i class="fas fa-eye"></i> View Details
          </button>
          <button class="btn-outline" onclick="event.stopPropagation(); addFavorite('${currentUser?._id}', '${dest._id}')">
            <i class="fas fa-heart"></i> Favorite
          </button>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => viewDestinationDetails(dest._id));
    container.appendChild(card);
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