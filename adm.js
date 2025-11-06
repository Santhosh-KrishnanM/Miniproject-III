// Cleaned and fixed adm.js - removed duplicate functions and ensured consistent tab handling

let currentAdmin = null;

// Show/hide admin sections (non-tabbed pages)
function showAdminSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
  const el = document.getElementById(sectionId);
  if (el) el.classList.add('active');
  const titleEl = document.getElementById('adminTitle');
  if (titleEl) {
    titleEl.textContent = sectionId === 'destinations'
      ? 'Manage Destinations'
      : sectionId === 'bookings'
      ? 'View Bookings'
      : 'View Users';
  }
}

// On DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const storedAdmin = localStorage.getItem("adminUser");
  if (!storedAdmin) {
    // No admin logged in, redirect to travel.html
    alert("Please login as admin first");
    window.location.href = "travel.html";
  } else {
    try {
      currentAdmin = JSON.parse(storedAdmin);
      console.log("Admin logged in:", currentAdmin.username);
    } catch (e) {
      console.warn("Could not parse stored admin data; clearing", e);
      localStorage.removeItem("adminUser");
      window.location.href = "travel.html";
      return;
    }
    loadAdminData();
    setupDestinationFormHandlers();
  }
});

// --------- LOAD ALL ADMIN DATA ------------
async function loadAdminData() {
  try {
    console.log("Loading admin dashboard data...");
    
    const [users, bookings, destinations, pendingApprovals] = await Promise.all([
      fetch('/admin/users').then(r => r.json()),
      fetch('/admin/bookings').then(r => r.json()),
      fetch('/admin/destinations').then(r => r.json()),
      fetch('/admin/bookings/pending-approvals').then(r => r.json()).catch(() => [])
    ]);

    renderUsers(users || []);
    renderBookings(bookings || []);
    renderDestinations(destinations || []);
    renderPendingApprovals(pendingApprovals || []);
    
    console.log("✅ Admin data loaded successfully");
  } catch (err) {
    console.error("❌ Failed to load admin data:", err);
    alert("Error loading admin data. Please refresh the page.");
  }
}

// --------- RENDER USERS ------------
function renderUsers(users) {
  const tbody = document.querySelector("#usersTable tbody");
  if (!tbody) {
    console.error("Users table body not found");
    return;
  }
  
  tbody.innerHTML = (users || []).map(u => `
    <tr>
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${u.phone || '-'}</td>
      <td>${u.address || '-'}</td>
    </tr>
  `).join('');
  
  console.log(`✅ Rendered ${users.length} users`);
}

// --------- RENDER BOOKINGS ------------
// --------- RENDER BOOKINGS (COMPLETE FIXED VERSION) ------------
function renderBookings(bookings) {
  const tbody = document.querySelector("#bookingsTable tbody");
  if (!tbody) {
    console.error("Bookings table body not found");
    return;
  }
  
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: #666;">
          <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 10px; display: block;"></i>
          <strong>No bookings found</strong>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = (bookings || []).map(b => {
    const username = b.userId?.username || 'Unknown';
    const destinationName = b.destination?.name || 'N/A';
    const start = b.startDate ? new Date(b.startDate).toLocaleDateString() : 'N/A';
    const end = b.endDate ? new Date(b.endDate).toLocaleDateString() : 'N/A';
    
    // Determine booking status
    const bookingStatus = b.status || 'pending';
    const isPending = bookingStatus.toLowerCase() === 'pending';
    const isConfirmed = bookingStatus.toLowerCase() === 'confirmed';
    const isCancelled = bookingStatus.toLowerCase() === 'cancelled';
    
    // Payment status
    const paymentStatus = b.paymentStatus || 'pending';
    
    // Approval status for display
    const approvalStatus = b.approvalStatus || (isConfirmed ? 'approved' : 'pending');
    
    // Travel info
    const assignedTravelName = b.assignedTravel?.name || '-';

    // ✅ Build action buttons based on status
    let actionButtons = '';
    
    if (isPending) {
      // Show Approve and Reject buttons for pending bookings
      actionButtons = `
        <button class="btn-primary" onclick="approveBookingAdmin('${b._id}')" style="margin-right: 5px;">
          <i class="fas fa-check"></i> Approve
        </button>
        <button class="btn-secondary" onclick="rejectBookingAdmin('${b._id}')" style="margin-right: 5px; background: #ff9800;">
          <i class="fas fa-times"></i> Reject
        </button>
        <button class="delete-btn" onclick="deleteBooking('${b._id}')">Delete</button>
      `;
    } else if (isConfirmed) {
      // Show "Approved" status for confirmed bookings
      actionButtons = `
        <span style="color: green; font-weight: 600; margin-right: 10px;">
          <i class="fas fa-check-circle"></i> Approved
        </span>
        <button class="delete-btn" onclick="deleteBooking('${b._id}')">Delete</button>
      `;
    } else if (isCancelled) {
      // Show "Cancelled" status
      actionButtons = `
        <span style="color: red; font-weight: 600; margin-right: 10px;">
          <i class="fas fa-ban"></i> Cancelled
        </span>
        <button class="delete-btn" onclick="deleteBooking('${b._id}')">Delete</button>
      `;
    } else {
      // Default: just delete button
      actionButtons = `
        <button class="delete-btn" onclick="deleteBooking('${b._id}')">Delete</button>
      `;
    }

    return `
      <tr>
        <td>${username}</td>
        <td>${destinationName}</td>
        <td>${start}</td>
        <td>${end}</td>
        <td>${b.travelers}</td>
        <td>${assignedTravelName}</td>
        <td style="text-transform: capitalize;">
          <span style="
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: 600;
            ${paymentStatus === 'paid' || paymentStatus === 'approved' ? 'background: #d4edda; color: #155724;' : 'background: #fff3cd; color: #856404;'}
          ">
            ${paymentStatus}
          </span>
        </td>
        <td style="text-transform: capitalize;">
          <span style="
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: 600;
            ${bookingStatus === 'confirmed' ? 'background: #d4edda; color: #155724;' : 
              bookingStatus === 'cancelled' ? 'background: #f8d7da; color: #721c24;' : 
              'background: #fff3cd; color: #856404;'}
          ">
            ${bookingStatus}
          </span>
        </td>
        <td>
          ${actionButtons}
        </td>
      </tr>
    `;
  }).join('');
  
  console.log(`✅ Rendered ${bookings.length} bookings`);
}

// ✅ APPROVE BOOKING (ADMIN) - Change status from Pending to Confirmed
async function approveBookingAdmin(bookingId) {
  if (!confirm("Approve this booking? Status will change from Pending to Confirmed.")) return;
  
  try {
    const res = await fetch(`/admin/bookings/${bookingId}/approve-booking`, { 
      method: 'PUT' 
    });
    const data = await res.json();
    
    if (res.ok) {
      alert(data.message || 'Booking approved successfully!');
      loadAdminData(); // Refresh all data
    } else {
      alert('Failed to approve booking: ' + (data.message || data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error approving booking:', err);
    alert('Error approving booking');
  }
}

// ✅ REJECT BOOKING (ADMIN) - Change status from Pending to Cancelled
async function rejectBookingAdmin(bookingId) {
  if (!confirm("Reject this booking? Status will change from Pending to Cancelled.")) return;
  
  try {
    const res = await fetch(`/admin/bookings/${bookingId}/reject-booking`, { 
      method: 'PUT' 
    });
    const data = await res.json();
    
    if (res.ok) {
      alert(data.message || 'Booking rejected successfully!');
      loadAdminData(); // Refresh all data
    } else {
      alert('Failed to reject booking: ' + (data.message || data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error rejecting booking:', err);
    alert('Error rejecting booking');
  }
}

// --------- RENDER DESTINATIONS ------------
function renderDestinations(destinations) {
  const tbody = document.querySelector("#destinationsTable tbody");
  if (!tbody) {
    console.error("Destinations table body not found");
    return;
  }
  
  if (!destinations || destinations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
          <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 10px; display: block;"></i>
          <strong>No destinations found</strong>
          <p style="margin: 10px 0 0 0;">Click "Add New Destination" to create your first destination!</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = destinations.map(d => {
    const destinationStr = JSON.stringify(d)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '&quot;');
    
    return `
      <tr>
        <td>
          <img src="${d.imageUrl || 'https://via.placeholder.com/80x60?text=No+Image'}" 
               alt="${d.name}" 
               class="destination-image"
               onerror="this.src='https://via.placeholder.com/80x60?text=Error'">
        </td>
        <td><strong>${d.name}</strong></td>
        <td>
          <span style="text-transform: capitalize; background: #e3f2fd; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">
            ${(d.type || 'N/A').replace('-', ' ')}
          </span>
        </td>
        <td>${d.rating ? '⭐ ' + d.rating : '<span style="color: #999;">Not rated</span>'}</td>
        <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${d.description || ''}">
          ${d.description || 'No description'}
        </td>
        <td>
          <button class="edit-btn" onclick='editDestination(${destinationStr})'>
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="delete-btn" onclick="deleteDestination('${d._id}', '${(d.name || '').replace(/'/g, "\\'")}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  console.log(`✅ Rendered ${destinations.length} destinations`);
}

// --------- DELETE BOOKING ------------
async function deleteBooking(id) {
  if (!confirm("Are you sure you want to delete this booking?")) return;
  
  try {
    const res = await fetch(`/admin/bookings/${id}`, { 
      method: 'DELETE' 
    });
    const data = await res.json();
    
    if (res.ok) {
      alert(data.message || "Booking deleted successfully");
      loadAdminData(); // Refresh all data
    } else {
      alert("Failed to delete booking: " + (data.message || "Unknown error"));
    }
  } catch (err) {
    console.error("Error deleting booking:", err);
    alert("Error deleting booking");
  }
}

// --------- APPROVE / REJECT BOOKING (ADMIN) ------------
async function approveBooking(id) {
  if (!confirm("Approve this travel assignment?")) return;
  try {
    const res = await fetch(`/admin/bookings/${id}/approve`, { method: 'PUT' });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Approved successfully');
      loadAdminData();
    } else {
      alert('Failed to approve: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Approve booking error', err);
    alert('Error approving booking');
  }
}

async function rejectBooking(id) {
  if (!confirm("Reject this travel assignment? This will remove the assigned travel from the booking.")) return;
  try {
    const res = await fetch(`/admin/bookings/${id}/reject`, { method: 'PUT' });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Rejected successfully');
      loadAdminData();
    } else {
      alert('Failed to reject: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Reject booking error', err);
    alert('Error rejecting booking');
  }
}

// --------- TAB SWITCH (Admin dashboard tabs) ------------
function showTab(tabId, btnElement) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  // Remove active class from all buttons
  document.querySelectorAll('.tab-buttons button').forEach(btn => btn.classList.remove('active'));
  // Show selected tab
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  // Add active class to clicked button (if provided)
  if (btnElement && btnElement.classList) {
    btnElement.classList.add('active');
  }
  // Optionally auto-load data for the selected tab
  if (tabId === 'travels') loadTravels();
  if (tabId === 'users') loadAdminData(); // ensure data load
  console.log(`Switched to ${tabId} tab`);
}

// --------- LOGOUT ADMIN ------------
function logoutAdmin() {
  console.log("Logout admin clicked");
  
  if (!confirm("Are you sure you want to logout?")) return;
  
  console.log("Logging out admin:", currentAdmin?.username);
  
  localStorage.removeItem("adminUser");
  sessionStorage.removeItem("adminUser");
  localStorage.removeItem("currentUser");
  sessionStorage.removeItem("currentUser");
  
  console.log("✅ Admin logged out successfully");
  alert("You have been logged out successfully!");
  window.location.href = "travel.html";
}

// --------- DESTINATION MANAGEMENT (Modal handlers etc) ------------
// ... (rest of adm.js remains unchanged) 

// Close modal when clicking outside
window.addEventListener('click', function(event) {
  const modal = document.getElementById('destinationModal');
  if (event.target === modal) {
    closeDestinationModal();
  }
});

// --------- CONSOLE LOG ON LOAD ------------
console.log(`
🔐 Admin Dashboard Loaded
📅 Time: ${new Date().toLocaleString()}
👤 Admin: ${currentAdmin?.username || 'Not logged in'}
`);

// --------- Travels (admin) - load travels for travels tab ------------
async function loadTravels() {
  try {
    const res = await fetch("/api/admin/travels");
    if (!res.ok) {
      console.warn("Failed to load admin travels, status:", res.status);
      return;
    }
    const travels = await res.json();
    const tbody = document.querySelector("#travelsTable tbody");
    if (tbody) tbody.innerHTML = "";

    if (!travels || !travels.length) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No travels booked yet.</td></tr>`;
      return;
    }

    travels.forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.userId?.username || "Unknown"}</td>
        <td>${t.destination?.name || "—"}</td>
        <td>${t.assignedTravel?.name || "—"}</td>
        <td>₹${t.assignedTravel?.totalPrice || 0}</td>
        <td>${t.assignedTravel?.bookedAt ? new Date(t.assignedTravel.bookedAt).toLocaleString() : "—"}</td>
        <td><button class="delete-btn" onclick="deleteTravel('${t._id}')">Delete</button></td>
      `;
      if (tbody) tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading travels", err);
  }
}

async function deleteTravel(id) {
  if (!confirm("Are you sure you want to delete this travel booking?")) return;
  try {
    const res = await fetch(`/api/admin/travels/${id}`, { method: "DELETE" });
    if (res.ok) {
      alert("Travel deleted successfully");
      loadTravels();
    } else {
      const err = await res.text();
      alert("Error deleting travel: " + err);
    }
  } catch (err) {
    console.error("Delete travel failed", err);
  }
}


// --- Edit Destination Modal ---
function editDestination(destinationObj) {
  // Fill modal with current destination data
  document.getElementById('modalTitle').innerHTML = `<i class="fas fa-edit"></i> Edit Destination`;
  document.getElementById('destinationId').value = destinationObj._id || '';
  document.getElementById('destName').value = destinationObj.name || '';
  document.getElementById('destType').value = destinationObj.type || '';
  document.getElementById('destRating').value = destinationObj.rating || '';
  document.getElementById('destDescription').value = destinationObj.description || '';
  document.getElementById('destImageUrl').value = destinationObj.imageUrl || '';
  // Show img preview if available
  const imgPrev = document.getElementById('imagePreview');
  if (destinationObj.imageUrl) {
    imgPrev.src = destinationObj.imageUrl;
    imgPrev.style.display = 'block';
  } else {
    imgPrev.style.display = 'none';
  }
  document.getElementById('destinationModal').style.display = 'flex';
}

// --- Delete Destination ---
async function deleteDestination(id, name) {
  if (!confirm(`Delete destination "${name}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`/destinations/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || "Destination deleted.");
      loadAdminData(); // Refresh the list
    } else {
      alert("Failed to delete destination: " + (data.message || "Unknown error"));
    }
  } catch (err) {
    alert("Error deleting destination.");
  }
}

// --- Modal close helper ---
function closeDestinationModal() {
  document.getElementById('destinationModal').style.display = 'none';
}


// ...previous admin JS code...

// Destination Add/Edit Form handler
document.getElementById('destinationForm').onsubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById('destinationId').value;
  const name = document.getElementById('destName').value;
  const type = document.getElementById('destType').value;
  const rating = document.getElementById('destRating').value;
  const description = document.getElementById('destDescription').value;
  const imageUrl = document.getElementById('destImageUrl').value;

  const payload = { name, type, rating, description, imageUrl };

  try {
    let res, data;
    if (id) {
      res = await fetch(`/destinations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      data = await res.json();
    } else {
      res = await fetch('/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      data = await res.json();
    }

    if (res.ok) {
      alert(data.message || 'Saved!');
      closeDestinationModal();
      loadAdminData();
    } else {
      alert(data.message || data.error || "Save failed");
    }
  } catch (err) {
    alert("Error saving destination");
  }
};
