let currentAdmin = null;

// Show/hide sections
function showAdminSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  document.getElementById('adminTitle').textContent = sectionId === 'destinations'
    ? 'Manage Destinations'
    : sectionId === 'bookings'
    ? 'View Bookings'
    : 'View Users';
}

// Load data on startup
document.addEventListener("DOMContentLoaded", () => {
  const storedAdmin = localStorage.getItem("adminUser");
  if (!storedAdmin) {
    // No admin logged in, redirect to travel.html
    alert("Please login as admin first");
    window.location.href = "travel.html";
  } else {
    currentAdmin = JSON.parse(storedAdmin);
    console.log("Admin logged in:", currentAdmin.username);
    loadAdminData();
    setupDestinationFormHandlers();
  }
});

// --------- LOAD ALL ADMIN DATA ------------
async function loadAdminData() {
  try {
    console.log("Loading admin dashboard data...");
    
    const users = await fetch('https://travel-aura-enb6.onrender.com/admin/users').then(r => r.json());
    const bookings = await fetch('https://travel-aura-enb6.onrender.com/admin/bookings').then(r => r.json());
    const destinations = await fetch('https://travel-aura-enb6.onrender.com/admin/destinations').then(r => r.json());

    renderUsers(users);
    renderBookings(bookings);
    renderDestinations(destinations);
    
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
  
  tbody.innerHTML = users.map(u => `
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
function renderBookings(bookings) {
  const tbody = document.querySelector("#bookingsTable tbody");
  if (!tbody) {
    console.error("Bookings table body not found");
    return;
  }
  
  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td>${b.userId}</td>
      <td>${b.destination?.name || 'N/A'}</td>
      <td>${new Date(b.startDate).toLocaleDateString()}</td>
      <td>${new Date(b.endDate).toLocaleDateString()}</td>
      <td>${b.travelers}</td>
      <td><button class="delete-btn" onclick="deleteBooking('${b._id}')">Delete</button></td>
    </tr>
  `).join('');
  
  console.log(`✅ Rendered ${bookings.length} bookings`);
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
    // Properly escape the destination object for onclick
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
          <button class="delete-btn" onclick="deleteDestination('${d._id}', '${d.name.replace(/'/g, "\\'")}')">
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
    const res = await fetch(`https://travel-aura-enb6.onrender.com/admin/bookings/${id}`, { 
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

// --------- SHOW TAB ------------
function showTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all buttons
  document.querySelectorAll('.tab-buttons button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Add active class to clicked button
  event.target.classList.add('active');
  
  console.log(`Switched to ${tabId} tab`);
}

// --------- LOGOUT ADMIN ------------
function logoutAdmin() {
  console.log("Logout admin clicked");
  
  // Confirm logout
  if (!confirm("Are you sure you want to logout?")) {
    return;
  }
  
  console.log("Logging out admin:", currentAdmin?.username);
  
  // Clear all admin data from storage
  localStorage.removeItem("adminUser");
  sessionStorage.removeItem("adminUser");
  
  // Also clear any other stored data
  localStorage.removeItem("currentUser");
  sessionStorage.removeItem("currentUser");
  
  console.log("✅ Admin logged out successfully");
  
  // Show logout message
  alert("You have been logged out successfully!");
  
  // Redirect to main page
  window.location.href = "travel.html";
}

// --------- DESTINATION MANAGEMENT ------------

// Open Add Destination Modal
function openAddDestinationModal() {
  document.getElementById('destinationModal').style.display = 'flex';
  document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add New Destination';
  document.getElementById('destinationForm').reset();
  document.getElementById('destinationId').value = '';
  document.getElementById('imagePreview').style.display = 'none';
  console.log('✅ Add destination modal opened');
}

// Close Destination Modal
function closeDestinationModal() {
  document.getElementById('destinationModal').style.display = 'none';
  document.getElementById('destinationForm').reset();
  document.getElementById('imagePreview').style.display = 'none';
  console.log('✅ Destination modal closed');
}

// Setup form handlers
function setupDestinationFormHandlers() {
  // Image URL Preview
  const imageUrlInput = document.getElementById('destImageUrl');
  const imagePreview = document.getElementById('imagePreview');
  
  if (imageUrlInput) {
    imageUrlInput.addEventListener('input', function() {
      const url = this.value.trim();
      if (url) {
        imagePreview.src = url;
        imagePreview.style.display = 'block';
        imagePreview.onerror = function() {
          this.style.display = 'none';
          console.warn('Invalid image URL');
        };
      } else {
        imagePreview.style.display = 'none';
      }
    });
  }

  // Form submission
  const destinationForm = document.getElementById('destinationForm');
  if (destinationForm) {
    destinationForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const destinationId = document.getElementById('destinationId').value;
      const name = document.getElementById('destName').value.trim();
      const type = document.getElementById('destType').value;
      const ratingValue = document.getElementById('destRating').value;
      const rating = ratingValue ? parseFloat(ratingValue) : 0;
      const description = document.getElementById('destDescription').value.trim();
      const imageUrl = document.getElementById('destImageUrl').value.trim();

      // Validation
      if (!name || !type || !description || !imageUrl) {
        alert('Please fill all required fields (Name, Type, Description, and Image URL)');
        return;
      }

      // Validate rating if provided
      if (rating && (rating < 1 || rating > 5)) {
        alert('Rating must be between 1 and 5');
        return;
      }

      const destinationData = {
        name,
        type,
        rating,
        description,
        imageUrl
      };

      try {
        const url = destinationId 
          ? `https://travel-aura-enb6.onrender.com/destinations/${destinationId}` 
          : 'https://travel-aura-enb6.onrender.com/destinations';
        const method = destinationId ? 'PUT' : 'POST';

        console.log(`${method} ${url}`, destinationData);

        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(destinationData)
        });

        // Get response text first
        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response text:', responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('Invalid server response: ' + responseText);
        }

        if (response.ok) {
          alert(destinationId ? '✅ Destination updated successfully!' : '✅ Destination added successfully!');
          closeDestinationModal();
          loadAdminData(); // Refresh data
          console.log('✅ Destination saved:', data);
        } else {
          const errorMsg = data.message || data.error || 'Unknown error';
          alert('Failed to save destination: ' + errorMsg);
          console.error('Save failed:', data);
        }
      } catch (error) {
        console.error('Error saving destination:', error);
        alert('Error saving destination: ' + error.message);
      }
    });
  }
}

// Edit Destination
function editDestination(destination) {
  console.log('Editing destination:', destination);
  
  document.getElementById('destinationModal').style.display = 'flex';
  document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Destination';
  
  document.getElementById('destinationId').value = destination._id;
  document.getElementById('destName').value = destination.name;
  document.getElementById('destType').value = destination.type || '';
  document.getElementById('destRating').value = destination.rating || '';
  document.getElementById('destDescription').value = destination.description || '';
  document.getElementById('destImageUrl').value = destination.imageUrl || '';
  
  if (destination.imageUrl) {
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.src = destination.imageUrl;
    imagePreview.style.display = 'block';
  }
}

// Delete Destination
async function deleteDestination(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    console.log('Deleting destination:', id);
    
    const response = await fetch(`https://travel-aura-enb6.onrender.com/destinations/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok) {
      alert('✅ Destination deleted successfully!');
      loadAdminData(); // Refresh data
      console.log('✅ Destination deleted');
    } else {
      alert('Failed to delete destination: ' + (data.message || 'Unknown error'));
      console.error('Delete failed:', data);
    }
  } catch (error) {
    console.error('Error deleting destination:', error);
    alert('Error deleting destination. Please try again.');
  }
}

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