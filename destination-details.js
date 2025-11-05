// Fixed destination-details.js - Tourists can now successfully book destinations

const urlParams = new URLSearchParams(window.location.search);
const destinationId = urlParams.get('id');
let currentUser = null;
let destinationData = null;
let lastCreatedBooking = null;
const PER_PERSON_PER_DAY = 1000; // base trip cost per person per day (adjustable)

document.addEventListener('DOMContentLoaded', async function() {
  // Try to read the currentUser but do NOT force-redirect if missing.
  const userData = localStorage.getItem('currentUser');
  if (userData) {
    try {
      currentUser = JSON.parse(userData);
      console.log('✅ User logged in:', currentUser.username);
    } catch (e) {
      console.warn('Could not parse currentUser from storage', e);
      localStorage.removeItem('currentUser');
    }
  }

  if (!destinationId) {
    alert('No destination specified');
    window.location.href = 'dashboard.html';
    return;
  }

  await loadDestinationDetails(destinationId);
  setupDateRestrictions();
  setupFormListeners();

  // ✅ Check if user just logged in to book this destination
  checkAndOpenBookingModal();

  // Attach Book button behavior:
  const bookBtn = document.getElementById('bookBtn');
  if (bookBtn) {
    bookBtn.addEventListener('click', function () {
      // If user is logged in, open booking modal
      if (currentUser && currentUser._id) {
        const modal = document.getElementById('bookingModal');
        if (modal) modal.style.display = 'flex';
      } else {
        // User not logged in: save destination to localStorage and send to login/home.
        localStorage.setItem('bookingDestination', JSON.stringify({ id: destinationId, name: destinationData?.name || '' }));
        // Redirect user to the public login page (travel.html) to sign in / sign up
        window.location.href = 'travel.html';
      }
    }, { passive: true });
  }
});

// ✅ Auto-open booking modal if user returned from login
function checkAndOpenBookingModal() {
  const bookingDestStr = localStorage.getItem('bookingDestination');
  if (!bookingDestStr) return;

  try {
    const bookingDest = JSON.parse(bookingDestStr);
    // If the saved destination matches current page AND user is now logged in
    if (bookingDest.id === destinationId && currentUser && currentUser._id) {
      console.log('🎯 Auto-opening booking modal for:', bookingDest.name);
      // Open the booking modal automatically
      setTimeout(() => {
        const modal = document.getElementById('bookingModal');
        if (modal) {
          modal.style.display = 'flex';
          // Clear the saved destination since we're showing it now
          localStorage.removeItem('bookingDestination');
        }
      }, 500);
    }
  } catch (e) {
    console.warn('Could not parse bookingDestination', e);
    localStorage.removeItem('bookingDestination');
  }
}

async function loadDestinationDetails(destinationId) {
  try {
    const response = await fetch('/destinations');
    const destinations = await response.json();

    destinationData = destinations.find(d => d._id === destinationId);
    
    if (!destinationData) {
      alert('Destination not found');
      window.location.href = 'dashboard.html';
      return;
    }

    // Populate UI
    document.getElementById('destinationName').textContent = destinationData.name;
    document.getElementById('destinationType').textContent = (destinationData.type || 'Destination').replace('-', ' ');
    document.getElementById('destinationRating').textContent = destinationData.rating || '0';
    document.getElementById('destinationReviews').textContent = destinationData.reviews || 0;
    const heroImage = document.getElementById('heroImage');
    heroImage.style.backgroundImage = `url('${destinationData.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80'}')`;
    document.getElementById('destinationDescription').textContent = destinationData.description || `Discover ${destinationData.name}.`;
    document.getElementById('destinationLocation').textContent = destinationData.location || 'Tamil Nadu, India';
    document.getElementById('destinationBestTime').textContent = destinationData.bestTime || 'October to March';
    
    if (destinationData.highlights) {
      const highlightsList = document.getElementById('destinationHighlights');
      highlightsList.innerHTML = '';
      destinationData.highlights.split(',').forEach(highlight => {
        const li = document.createElement('li');
        li.textContent = highlight.trim();
        highlightsList.appendChild(li);
      });
      document.getElementById('highlightsSection').style.display = 'block';
    }
    
    if (destinationData.activities) {
      const activitiesGrid = document.getElementById('destinationActivities');
      activitiesGrid.innerHTML = '';
      destinationData.activities.split(',').forEach(activity => {
        const tag = document.createElement('div');
        tag.className = 'activity-tag';
        tag.textContent = activity.trim();
        activitiesGrid.appendChild(tag);
      });
      document.getElementById('activitiesSection').style.display = 'block';
    }
    
    document.getElementById('quickType').textContent = (destinationData.type || 'Destination').replace('-', ' ');
    document.getElementById('quickRating').textContent = `${destinationData.rating || '0'} / 5.0`;
    document.getElementById('quickReviews').textContent = `${destinationData.reviews || 0} travelers`;
  } catch (error) {
    console.error('Error loading destination:', error);
    alert('Error loading destination details');
    window.location.href = 'dashboard.html';
  }
}

function setupDateRestrictions() {
  const today = new Date().toISOString().split('T')[0];
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  if (!startDateInput || !endDateInput) return;
  startDateInput.min = today;
  endDateInput.min = today;

  startDateInput.addEventListener('change', function() {
    endDateInput.min = startDateInput.value;
    if (endDateInput.value && endDateInput.value <= startDateInput.value) {
      endDateInput.value = '';
      alert('Please select an end date after the start date');
    }
  });

  endDateInput.addEventListener('change', function() {
    if (startDateInput.value && endDateInput.value <= startDateInput.value) {
      alert('End date must be after start date');
      endDateInput.value = '';
      return;
    }
  });
}

function setupFormListeners() {
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', handleBookingSubmit);
  }
}

async function handleBookingSubmit(e) {
  e.preventDefault();
  
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const travelers = parseInt(document.getElementById('travelers').value || '1', 10);
  
  if (!startDate || !endDate || !travelers) {
    alert('Please fill all fields');
    return;
  }
  
  const today = new Date().toISOString().split('T')[0];
  if (startDate < today || endDate < today) {
    alert('Please select future dates only');
    return;
  }
  
  if (endDate <= startDate) {
    alert('End date must be after start date');
    return;
  }

  const bookNowBtn = document.getElementById('bookNowBtn');
  if (bookNowBtn) {
    bookNowBtn.disabled = true;
    bookNowBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  }

  try {
    // ✅ Ensure user is logged in before creating booking
    const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user || !user._id) {
      // save destination and redirect to login flow
      localStorage.setItem('bookingDestination', JSON.stringify({ id: destinationId, name: destinationData?.name || '' }));
      window.location.href = 'travel.html';
      return;
    }

    console.log('📤 Creating booking:', { 
      userId: user._id, 
      destination: destinationId, 
      startDate, 
      endDate, 
      travelers 
    });

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user._id,
        destination: destinationId,
        startDate,
        endDate,
        travelers
      })
    });
    
    const data = await response.json();
    
    console.log('📥 Booking response:', response.status, data);
    
    if (response.ok) {
      // ✅ FIXED: Save booking and show success message
      lastCreatedBooking = data;
      
      // Close booking modal
      document.getElementById('bookingModal').style.display = 'none';
      
      // Show success message
      alert(`✅ Booking created successfully!\n\nDestination: ${destinationData.name}\nDates: ${startDate} to ${endDate}\nTravelers: ${travelers}\n\nRedirecting to your bookings...`);
      
      // ✅ FIXED: Try to open payment modal, but don't fail if it doesn't work
      try {
        openPaymentModalForBooking(data);
      } catch (paymentError) {
        console.warn('Payment modal failed to open, redirecting to dashboard:', paymentError);
        // If payment modal fails, just redirect to dashboard
        setTimeout(() => {
          window.location.href = 'dashboard.html#bookings';
        }, 1500);
      }
    } else {
      alert('Booking failed: ' + (data.error || data.message || 'Unknown error'));
      if (bookNowBtn) {
        bookNowBtn.disabled = false;
        bookNowBtn.innerHTML = '<i class="fas fa-ticket-alt"></i> Book Now';
      }
    }
  } catch (error) {
    console.error('Booking error:', error);
    alert('Failed to create booking. Please try again.');
    if (bookNowBtn) {
      bookNowBtn.disabled = false;
      bookNowBtn.innerHTML = '<i class="fas fa-ticket-alt"></i> Book Now';
    }
  }
}

/* -------------------- Payment Modal & Flow -------------------- */
function openPaymentModalForBooking(booking) {
  try {
    // Populate summary
    const start = booking.startDate.slice(0,10);
    const end = booking.endDate.slice(0,10);
    const days = Math.ceil((new Date(end) - new Date(start)) / (1000*60*60*24));
    const travelers = booking.travelers || 1;
    const tripCost = days * PER_PERSON_PER_DAY * travelers;

    document.getElementById('payDestinationName').textContent = destinationData.name;
    document.getElementById('payDates').textContent = `${start} → ${end} (${days} ${days===1?'day':'days'})`;
    document.getElementById('payTravelers').textContent = travelers;
    document.getElementById('payTripCost').textContent = tripCost;

    // populate travel select with server travels
    fetch('/travels')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch travels');
        return r.json();
      })
      .then(travels => {
        const sel = document.getElementById('paymentTravelSelect');
        if (!sel) throw new Error('Payment travel select not found');
        
        sel.innerHTML = '<option value="">— No transport —</option>';
        travels.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t._id;
          // compute travel price for booking days
          const travelTotal = (t.costPerDay || t.cost || 0) * (days || 1);
          opt.textContent = `${t.name} — ₹${travelTotal} (${t.seats} seats)`;
          opt.dataset.total = travelTotal;
          sel.appendChild(opt);
        });
        updatePaymentTotal(tripCost);
      })
      .catch(err => {
        console.warn('Could not load travels for payment:', err);
        updatePaymentTotal(tripCost);
      });

    // bind selection changes
    const travelSelect = document.getElementById('paymentTravelSelect');
    if (travelSelect) {
      travelSelect.onchange = function() {
        const sel = this;
        const travelTotal = parseInt(sel.options[sel.selectedIndex]?.dataset?.total || '0', 10) || 0;
        updatePaymentTotal(tripCost, travelTotal);
      };
    }

    const confirmBtn = document.getElementById('confirmPaymentBtn');
    if (confirmBtn) {
      confirmBtn.onclick = () => confirmPayment(booking, tripCost);
    }

    // Show modal
    const modal = document.getElementById('paymentModal');
    if (modal) {
      modal.style.display = 'flex';
    } else {
      throw new Error('Payment modal not found');
    }
  } catch (error) {
    console.error('Error opening payment modal:', error);
    // If payment modal fails, redirect to dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html#bookings';
    }, 1000);
  }
}

function updatePaymentTotal(tripCost, travelTotal = 0) {
  const total = tripCost + travelTotal;
  const totalEl = document.getElementById('paymentTotal');
  if (totalEl) {
    totalEl.textContent = `₹${total}`;
  }
  
  // attach computed values to modal for later use
  const modal = document.getElementById('paymentModal');
  if (modal) {
    modal.dataset.tripCost = tripCost;
    modal.dataset.travelTotal = travelTotal;
    modal.dataset.total = total;
  }
}

function closePaymentModal() {
  const modal = document.getElementById('paymentModal');
  if (modal) modal.style.display = 'none';

  // redirect user to dashboard bookings after closing to show booking
  setTimeout(() => {
    window.location.href = 'dashboard.html#bookings';
  }, 500);
}

async function confirmPayment(booking, tripCost) {
  const modal = document.getElementById('paymentModal');
  const travelSel = document.getElementById('paymentTravelSelect');
  const travelId = travelSel?.value || null;
  const travelTotal = parseInt(travelSel?.options[travelSel?.selectedIndex]?.dataset?.total || '0', 10) || 0;
  const method = document.getElementById('paymentMethod')?.value || 'card';
  const total = parseInt(modal?.dataset?.total || (tripCost + travelTotal), 10) || (tripCost + travelTotal);

  const btn = document.getElementById('confirmPaymentBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  }

  try {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: booking._id,
        userId: currentUser._id,
        amount: total,
        method,
        travelId,
        travelTotal
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      alert('✅ Payment successful! Your booking is confirmed.');
      localStorage.removeItem('bookingDestination'); // clear saved selection
      closePaymentModal();
    } else {
      alert('Payment failed: ' + (data.message || data.error || 'Unknown error'));
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Pay Now';
      }
    }
  } catch (err) {
    console.error('Payment error:', err);
    alert('Payment failed. Please try again later.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Pay Now';
    }
  }
}

/* -------------------- Utilities -------------------- */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

console.log(`
📍 Destination Details Page loaded (with payment)
🆔 Destination ID: ${destinationId}
👤 User: ${currentUser?.username || 'Not logged in'}
`);