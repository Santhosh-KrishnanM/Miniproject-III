// Get destination ID from URL
const urlParams = new URLSearchParams(window.location.search);
const destinationId = urlParams.get('id');
let currentUser = null;
let destinationData = null;

// Load user and destination data
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is logged in
  const userData = localStorage.getItem('currentUser');
  if (!userData) {
    alert('Please login to book a destination');
    window.location.href = 'travel.html';
    return;
  }

  currentUser = JSON.parse(userData);
  console.log('Current user:', currentUser.username);

  // Check if destination ID exists
  if (!destinationId) {
    alert('No destination selected');
    window.location.href = 'dashboard.html';
    return;
  }

  // Load destination details
  await loadDestinationDetails();
  
  // Setup date restrictions
  setupDateRestrictions();
  
  // Setup form listeners
  setupFormListeners();
});

// Load destination details from API
async function loadDestinationDetails() {
  try {
    console.log('Loading destination:', destinationId);
    
    // Fetch all destinations
    const response = await fetch('/destinations');
    const destinations = await response.json();
    
    // Find the specific destination
    destinationData = destinations.find(d => d._id === destinationId);
    
    if (!destinationData) {
      alert('Destination not found');
      window.location.href = 'dashboard.html';
      return;
    }

    console.log('Destination loaded:', destinationData);
    
    // Populate page with destination data
    populateDestinationDetails();
    
  } catch (error) {
    console.error('Error loading destination:', error);
    alert('Failed to load destination details');
  }
}

// Populate destination details on page
function populateDestinationDetails() {
  // Set destination name
  document.getElementById('destinationName').textContent = destinationData.name;
  
  // Set destination type
  const typeElement = document.getElementById('destinationType');
  typeElement.textContent = destinationData.type ? destinationData.type.replace('-', ' ').toUpperCase() : 'DESTINATION';
  
  // Set destination image
  const imageElement = document.getElementById('destinationImage');
  imageElement.src = destinationData.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80';
  imageElement.alt = destinationData.name;
  
  // Set description
  const descriptionElement = document.getElementById('destinationDescription');
  descriptionElement.textContent = destinationData.description || 
    `Discover the beauty and charm of ${destinationData.name}, one of Tamil Nadu's most captivating destinations. Experience rich culture, stunning landscapes, and unforgettable memories in this incredible location.`;
  
  // Set rating
  const rating = destinationData.rating || 4.5;
  const ratingElement = document.getElementById('destinationRating');
  ratingElement.innerHTML = generateStars(rating);
  
  const ratingText = document.getElementById('ratingText');
  ratingText.textContent = `${rating} / 5.0 (${destinationData.reviews || 0} reviews)`;
  
  // Set location feature
  document.getElementById('featureLocation').textContent = 
    destinationData.location || 'Tamil Nadu, India';
}

// Generate star rating HTML
function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  let starsHTML = '';
  
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star"></i>';
  }
  
  if (hasHalfStar) {
    starsHTML += '<i class="fas fa-star-half-alt"></i>';
  }
  
  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star"></i>';
  }
  
  return starsHTML;
}

// Setup date restrictions
function setupDateRestrictions() {
  const today = new Date().toISOString().split('T')[0];
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  
  // Set minimum dates to today
  startDateInput.min = today;
  endDateInput.min = today;
  
  // When start date changes, update end date minimum
  startDateInput.addEventListener('change', function() {
    endDateInput.min = startDateInput.value;
    
    // Clear end date if it's before new start date
    if (endDateInput.value && endDateInput.value <= startDateInput.value) {
      endDateInput.value = '';
      alert('Please select an end date after the start date');
    }
    
    updateDuration();
  });
  
  // When end date changes, validate
  endDateInput.addEventListener('change', function() {
    if (startDateInput.value && endDateInput.value <= startDateInput.value) {
      alert('End date must be after start date');
      endDateInput.value = '';
      return;
    }
    
    updateDuration();
  });
}

// Setup form listeners
function setupFormListeners() {
  const travelersSelect = document.getElementById('travelers');
  
  // Update travelers display when changed
  travelersSelect.addEventListener('change', function() {
    document.getElementById('travelersDisplay').textContent = travelersSelect.value;
  });
  
  // Handle form submission
  const bookingForm = document.getElementById('bookingForm');
  bookingForm.addEventListener('submit', handleBookingSubmit);
}

// Update duration display
function updateDuration() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (duration > 0) {
      document.getElementById('durationDisplay').textContent = 
        `${duration} ${duration === 1 ? 'day' : 'days'}`;
    } else {
      document.getElementById('durationDisplay').textContent = '-';
    }
  } else {
    document.getElementById('durationDisplay').textContent = '-';
  }
}

// Handle booking form submission
async function handleBookingSubmit(e) {
  e.preventDefault();
  
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const travelers = document.getElementById('travelers').value;
  
  // Validate
  if (!startDate || !endDate || !travelers) {
    alert('Please fill all fields');
    return;
  }
  
  // Validate dates
  const today = new Date().toISOString().split('T')[0];
  if (startDate < today || endDate < today) {
    alert('Please select future dates only');
    return;
  }
  
  if (endDate <= startDate) {
    alert('End date must be after start date');
    return;
  }
  
  // Disable submit button
  const bookNowBtn = document.getElementById('bookNowBtn');
  bookNowBtn.disabled = true;
  bookNowBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  
  try {
    // Create booking
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: currentUser._id,
        destination: destinationId,
        startDate: startDate,
        endDate: endDate,
        travelers: parseInt(travelers)
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Success
      alert(`✅ Booking Confirmed!\n\nDestination: ${destinationData.name}\nDates: ${formatDate(startDate)} to ${formatDate(endDate)}\nTravelers: ${travelers}\n\nYour booking has been successfully created!`);
      
      // Redirect to bookings page
      setTimeout(() => {
        window.location.href = 'dashboard.html#bookings';
      }, 1500);
      
    } else {
      // Error
      alert('Booking failed: ' + (data.error || data.message || 'Unknown error'));
      bookNowBtn.disabled = false;
      bookNowBtn.innerHTML = '<i class="fas fa-ticket-alt"></i> Book Now';
    }
    
  } catch (error) {
    console.error('Booking error:', error);
    alert('Failed to create booking. Please try again.');
    bookNowBtn.disabled = false;
    bookNowBtn.innerHTML = '<i class="fas fa-ticket-alt"></i> Book Now';
  }
}

// Format date for display
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Log page load
console.log(`
📍 Destination Details Page Loaded
🆔 Destination ID: ${destinationId}
👤 User: ${currentUser?.username || 'Not logged in'}
🕐 Time: ${new Date().toLocaleString()}
`);