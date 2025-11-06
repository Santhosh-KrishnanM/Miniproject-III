// Dashboard functionality - COMPLETE FIXED VERSION
let currentUser = null;
let selectedDestinationId = null;
let destinations = [];

// ✅ Prevent back button after logout
function preventBackToProtectedPage() {
  history.pushState(null, null, location.href);
  
  window.onpopstate = function() {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      history.pushState(null, null, location.href);
      window.location.replace('travel.html');
    }
  };
}

// --------- INITIAL LOAD ------------
document.addEventListener('DOMContentLoaded', async function() {
  const userData = localStorage.getItem('currentUser');
  if (userData) {
    try {
      currentUser = JSON.parse(userData);
      updateUserProfile();
      await renderAllSections();
      await loadUserBookings(currentUser._id);
      
      preventBackToProtectedPage();
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      localStorage.removeItem('currentUser');
      window.location.replace('travel.html');
      return;
    }
  } else {
    window.location.replace('travel.html');
    return;
  }
  
  await loadDestinations();
  setupDestinationSearch();
  setupDateRestrictions();
  setupLogoutHandler();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('openBooking') === 'true') {
    const bookingDest = localStorage.getItem('bookingDestination');
    if (bookingDest) {
      const dest = JSON.parse(bookingDest);
      openBookingForm();
      selectedDestinationId = dest.id;
      document.getElementById("destinationSearch").value = dest.name;
      localStorage.removeItem('bookingDestination');
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
    document.getElementById('profilePhone').textContent = currentUser.phone || 'Not provided';
    document.getElementById('profileAddress').textContent = currentUser.address || 'Not provided';
  }
}

// --------- SECTIONS & NAVIGATION ------------
function showSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
  const section = document.getElementById(sectionId);
  if (section) section.classList.add('active');

  document.querySelectorAll('.sidebar-menu li').forEach(item => item.classList.remove('active'));
  const activeMenu = document.querySelector(`[onclick="showSection('${sectionId}')"]`)?.parentElement;
  if (activeMenu) activeMenu.classList.add('active');

  const titles = {
    overview: 'Dashboard',
    destinations: 'Destinations',
    bookings: 'My Bookings',
    travels: 'Travels',
    favorites: 'Favorites',
    profile: 'Profile',
    support: 'Support'
  };
  
  if (titles[sectionId]) {
    document.getElementById('pageTitle').textContent = titles[sectionId];
  }
  
  if (sectionId === 'travels') {
    renderTravelsSection();
  }
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

// --------- RENDER DESTINATIONS ------------
async function renderDestinations() {
  const list = await getDestinations();
  
  destinations = list.sort((a, b) => {
    const ratingA = parseFloat(a.rating) || 0;
    const ratingB = parseFloat(b.rating) || 0;
    return ratingB - ratingA;
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
    
    const imageUrl = dest.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80';
    const typeFormatted = dest.type ? dest.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Destination';
    
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

// --------- SHOW DESTINATION DETAILS ------------
function showDestinationDetails(destinationId) {
  console.log(`🔄 Navigating to destination details: ${destinationId}`);
  window.location.href = `destination-details.html?id=${destinationId}`;
}

// --------- ADD TO FAVORITES (FIXED VERSION) ------------
async function addFavorite(userId, destinationId) {
  console.log('Adding to favorites:', { userId, destinationId });
  
  if (!userId || !destinationId) {
    alert("❌ Error: Please login to add favorites");
    return;
  }

  if (!currentUser || !currentUser._id) {
    alert("❌ Please login to add favorites");
    window.location.href = 'travel.html';
    return;
  }

  try {
    const res = await fetch('/favorites', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        userId: userId, 
        destinationId: destinationId 
      })
    });

    console.log('Add favorite response status:', res.status);

    if (res.ok) {
      const data = await res.json();
      console.log('✅ Add favorite success:', data);
      
      alert('✅ Added to favorites successfully!');
      
      await renderFavorites();
      await updateStats();
      
    } else {
      const errorData = await res.json().catch(() => null);
      const errorMessage = errorData?.message || errorData?.error || 'Failed to add to favorites';
      
      console.error('❌ Add favorite failed:', errorMessage);
      
      if (errorMessage.toLowerCase().includes('already')) {
        alert('ℹ️ This destination is already in your favorites!');
      } else if (res.status === 401 || res.status === 403) {
        alert('❌ Session expired. Please login again.');
        localStorage.removeItem('currentUser');
        window.location.href = 'travel.html';
      } else {
        alert(`❌ Failed to add to favorites: ${errorMessage}`);
      }
    }
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    alert('❌ Network error. Please check your connection and try again.');
  }
}

// --------- REMOVE FROM FAVORITES ------------
async function removeFavorite(favoriteId) {
  if (!confirm("Remove this destination from favorites?")) return;

  console.log('Removing favorite:', favoriteId);

  try {
    const res = await fetch(`/favorites/${favoriteId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Remove favorite response status:', res.status);

    if (res.ok) {
      const data = await res.json().catch(() => null);
      console.log('✅ Remove favorite success:', data);
      
      alert('✅ Removed from favorites successfully!');
      
      await renderFavorites();
      await updateStats();
      
    } else {
      const errorData = await res.json().catch(() => null);
      const errorMessage = errorData?.message || errorData?.error || 'Failed to remove from favorites';
      
      console.error('❌ Remove favorite failed:', errorMessage);
      alert(`❌ Failed to remove from favorites: ${errorMessage}`);
    }
  } catch (error) {
    console.error('❌ Error removing favorite:', error);
    alert('❌ Network error. Please try again.');
  }
}

// --------- SETUP LOGOUT HANDLER ------------
function setupLogoutHandler() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    
    newLogoutBtn.addEventListener("click", function(e) {
      e.preventDefault();
      logout();
    });
    
    console.log("✅ Logout handler attached successfully");
  } else {
    console.error("❌ Logout button not found!");
  }
}

// --------- FILTER DESTINATIONS ------------
function filterDestinations(filterType) {
  console.log(`Filtering destinations by: ${filterType}`);
  
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  const container = document.getElementById('destinationsList');
  container.innerHTML = '';

  let filtered = filterType === 'all' 
    ? destinations 
    : destinations.filter(d => d.type === filterType);

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

// --------- RENDER FAVORITES (FIXED VERSION) ------------
async function renderFavorites() {
  if (!currentUser?._id) {
    console.warn('No user logged in, skipping favorites render');
    return;
  }

  try {
    const favorites = await getUserFavorites(currentUser._id);
    const container = document.getElementById('favoritesGrid');
    
    if (!container) {
      console.error('Favorites container not found');
      return;
    }
    
    container.innerHTML = '';

    if (!favorites || favorites.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #666;">
          <i class="fas fa-heart" style="font-size: 4rem; margin-bottom: 20px; display: block; color: #ddd;"></i>
          <h3>No favorites yet</h3>
          <p style="margin: 10px 0 20px 0;">Start adding destinations to your favorites!</p>
          <button class="btn-primary" onclick="showSection('destinations')" style="margin-top: 15px;">
            <i class="fas fa-compass"></i> Explore Destinations
          </button>
        </div>
      `;
      return;
    }

    favorites.forEach(fav => {
      const dest = fav.destinationId;
      
      if (!dest || !dest._id) {
        console.warn('Invalid favorite destination:', fav);
        return;
      }

      const card = document.createElement('div');
      card.className = 'destination-card';
      card.style.cursor = 'pointer';
      
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
        " onclick="showDestinationDetails('${dest._id}')">
          <div style="
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255, 59, 48, 0.9);
            color: white;
            padding: 6px 10px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            <i class="fas fa-heart"></i> Favorite
          </div>
        </div>
        <div class="destination-info">
          <h4 onclick="showDestinationDetails('${dest._id}')">${dest.name}</h4>
          <p style="color: #666; font-size: 0.9rem; margin: 5px 0;">
            <i class="fas fa-star" style="color: #ffa500;"></i> 
            ${dest.rating || 'Not rated'}
            ${dest.reviews ? ` (${dest.reviews} reviews)` : ''}
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
          <button class="btn-danger" onclick="event.stopPropagation(); removeFavorite('${fav._id}')" style="
            width: 100%;
            margin-top: 10px;
          ">
            <i class="fas fa-heart-broken"></i> Remove from Favorites
          </button>
        </div>
      `;
      container.appendChild(card);
    });
    
    console.log(`✅ Rendered ${favorites.length} favorites`);
    
  } catch (error) {
    console.error('Error rendering favorites:', error);
    const container = document.getElementById('favoritesGrid');
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">
          <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
          <h3>Failed to load favorites</h3>
          <p>Please try refreshing the page</p>
        </div>
      `;
    }
  }
}

// --------- RENDER BOOKINGS ------------
async function renderBookings() {
  const bookings = await getUserBookings(currentUser?._id);
  const container = document.getElementById('bookingsList');
  container.innerHTML = '';

  if (!bookings || bookings.length === 0) {
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
    const card = document.createElement('div');
    card.className = 'booking-card';
    
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
}

// --------- RENDER ACTIVITIES (FIXED) ------------
async function renderActivities() {
  const activities = await getUserActivities(currentUser?._id);
  const container = document.getElementById('activityList');
  container.innerHTML = '';

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

// --------- RENDER TRAVEL INSIGHTS ------------
async function renderTravelInsights() {
  const bookings = await getUserBookings(currentUser?._id);
  const favorites = await getUserFavorites(currentUser?._id);
  
  const container = document.getElementById('travelInsightsWidget');
  if (!container) return;

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

// --------- RENDER ALL SECTIONS ------------
async function renderAllSections() {
  await renderDestinations();
  await renderFavorites();
  await renderBookings();
  await renderActivities();
  await updateStats();
  await renderTravelInsights();
}

// --------- BOOKING FORM (FIXED VERSION) ------------
function openBookingForm() {
  const modal = document.getElementById("bookingModal");
  if (!modal) {
    console.error('❌ Booking modal not found');
    return;
  }
  
  modal.style.display = "flex";
  
  document.getElementById("destinationSearch").value = "";
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("travelers").value = "1";
  document.getElementById("destinationResults").innerHTML = "";
  selectedDestinationId = null;
  
  setupDateRestrictions();
  
  console.log('✅ Booking modal opened');
}

function closeBookingForm() {
  const modal = document.getElementById("bookingModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// --------- SUBMIT BOOKING (FIXED VERSION) ------------
async function submitBooking() {
  console.log('📝 Submitting booking...');
  
  const destInput = document.getElementById("destinationSearch").value.trim();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const travelers = document.getElementById("travelers").value;

  if (!destInput || !startDate || !endDate || !travelers) {
    alert("❌ Please fill all fields.");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  if (startDate < today || endDate < today) {
    alert("❌ Please select future dates only.");
    return;
  }

  if (endDate <= startDate) {
    alert("❌ End date must be after start date.");
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
      alert("❌ Please select a valid destination from the list.");
      return;
    }
  }

  if (!currentUser || !currentUser._id) {
    alert("❌ Please login to make a booking");
    window.location.href = 'travel.html';
    return;
  }

  console.log('📤 Creating booking:', {
    userId: currentUser._id,
    destination: destinationId,
    startDate,
    endDate,
    travelers
  });

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

    const data = await res.json();
    console.log('📥 Booking response:', data);

    if (res.ok) {
      alert(`✅ Booking confirmed for ${data.destination?.name || "your trip"}!`);
      closeBookingForm();
      
      await loadUserBookings(currentUser._id);
      await renderAllSections();
      
      selectedDestinationId = null;
      
      showSection('bookings');
      
    } else {
      alert("❌ Booking failed: " + (data.error || data.message || "Unknown error"));
    }
  } catch (err) {
    console.error("❌ Booking error:", err);
    alert("❌ Failed to save booking. Please try again later.");
  }
}

// --------- DESTINATION SEARCH (FIXED VERSION) ------------
function filterDestinationsList() {
  const input = document.getElementById("destinationSearch").value.toLowerCase();
  const resultsBox = document.getElementById("destinationResults");
  
  if (!resultsBox) {
    console.error('❌ Destination results box not found');
    return;
  }
  
  resultsBox.innerHTML = "";

  if (!input) {
    resultsBox.style.display = "none";
    return;
  }

  const filtered = destinations.filter(dest => 
    dest.name.toLowerCase().includes(input)
  );

  if (filtered.length === 0) {
    resultsBox.innerHTML = '<li style="padding: 10px; color: #999;">No destinations found</li>';
    resultsBox.style.display = "block";
    return;
  }

  filtered.forEach(dest => {
    const li = document.createElement("li");
    li.textContent = dest.name;
    li.style.padding = "10px";
    li.style.cursor = "pointer";
    li.style.borderBottom = "1px solid #eee";
    li.onclick = () => selectDestination(dest);
    resultsBox.appendChild(li);
  });
  
  resultsBox.style.display = "block";
}

function selectDestination(dest) {
  selectedDestinationId = dest._id;
  document.getElementById("destinationSearch").value = dest.name;
  document.getElementById("destinationResults").innerHTML = "";
  document.getElementById("destinationResults").style.display = "none";
  
  console.log('✅ Destination selected:', dest.name);
}

function setupDestinationSearch() {
  const input = document.getElementById("destinationSearch");
  const resultsBox = document.getElementById("destinationResults");

  if (!input || !resultsBox) return;

  input.addEventListener("input", () => {
    const query = input.value.toLowerCase().trim();
    resultsBox.innerHTML = "";

    if (!query) {
      resultsBox.style.display = "none";
      return;
    }

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

// --------- DATE RESTRICTIONS (FIXED VERSION) ------------
function setupDateRestrictions() {
  const today = new Date().toISOString().split("T")[0];
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");

  if (!startInput || !endInput) {
    console.warn('⚠️ Date inputs not found');
    return;
  }

  startInput.min = today;
  endInput.min = today;

  const newStartInput = startInput.cloneNode(true);
  const newEndInput = endInput.cloneNode(true);
  startInput.parentNode.replaceChild(newStartInput, startInput);
  endInput.parentNode.replaceChild(newEndInput, endInput);

  newStartInput.addEventListener("change", function() {
    newEndInput.min = newStartInput.value || today;
    if (newEndInput.value && newEndInput.value <= newStartInput.value) {
      newEndInput.value = "";
      alert("⚠️ Please select an end date after the start date.");
    }
  });

  newEndInput.addEventListener("change", function() {
    if (newStartInput.value && newEndInput.value <= newStartInput.value) {
      alert("⚠️ End date must be after start date.");
      newEndInput.value = "";
    }
  });
  
  console.log('✅ Date restrictions setup complete');
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
      await renderAllSections();
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
    renderBookings(bookings);
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

// --------- LOGOUT (IMPROVED) ------------
function logout() {
  if (confirm("Are you sure you want to log out?")) {
    console.log("Logging out user:", currentUser?.username);
    
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("currentUser");
    localStorage.removeItem("adminUser");
    sessionStorage.removeItem("adminUser");
    localStorage.removeItem("bookingDestination");
    
    console.log("✅ User logged out successfully");
    
    currentUser = null;
    
    history.replaceState(null, null, 'travel.html');
    
    window.location.replace('travel.html');
  }
}

// --------- HEADER SEARCH ------------
function headerSearchDestinations() {
  const searchInput = document.getElementById('headerSearchInput');
  const query = searchInput.value.trim().toLowerCase();
  const resultsContainer = document.getElementById('headerSearchResults');
  const clearBtn = document.querySelector('.header-clear-search');

  if (query) {
    clearBtn.style.display = 'flex';
  } else {
    clearBtn.style.display = 'none';
    resultsContainer.classList.remove('show');
    return;
  }

  const results = destinations.filter(dest => 
    dest.name.toLowerCase().includes(query) ||
    (dest.type && dest.type.toLowerCase().includes(query)) ||
    (dest.description && dest.description.toLowerCase().includes(query))
  );

  results.sort((a, b) => {
    const ratingA = parseFloat(a.rating) || 0;
    const ratingB = parseFloat(b.rating) || 0;
    return ratingB - ratingA;
  });

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

function highlightSearchText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<strong style="color: #667eea;">$1</strong>');
}

function navigateToDestinationFromHeader(destinationId) {
  clearHeaderSearch();
  window.location.href = `destination-details.html?id=${destinationId}`;
}

function viewAllHeaderSearchResults(query) {
  clearHeaderSearch();
  showSection('destinations');
  
  const searchQuery = query.toLowerCase();
  const filtered = destinations.filter(dest => 
    dest.name.toLowerCase().includes(searchQuery) ||
    (dest.type && dest.type.toLowerCase().includes(searchQuery))
  );
  
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
  
  alert(`🔍 Found ${filtered.length} destinations matching "${query}"`);
}

function handleHeaderSearchEnter(event) {
  if (event.key === 'Enter') {
    const resultsContainer = document.getElementById('headerSearchResults');
    const firstResult = resultsContainer.querySelector('.header-search-result-item');
    
    if (firstResult) {
      firstResult.click();
    }
  }
}

function clearHeaderSearch() {
  document.getElementById('headerSearchInput').value = '';
  document.getElementById('headerSearchResults').classList.remove('show');
  document.querySelector('.header-clear-search').style.display = 'none';
}

document.addEventListener('click', function(event) {
  const searchBox = document.querySelector('.header-right .search-box');
  const resultsContainer = document.getElementById('headerSearchResults');
  
  if (searchBox && !searchBox.contains(event.target)) {
    resultsContainer.classList.remove('show');
  }
});

// --------- TRAVELS SECTION ------------
function renderTravelsSection() {
  console.log('✅ Travels section loaded');
}

console.log('✅ Dashboard.js loaded successfully');
console.log(`
📍 Travel Aura Dashboard
🆔 User: ${currentUser?.username || 'Not logged in'}
📅 Date: 2025-11-06
`);