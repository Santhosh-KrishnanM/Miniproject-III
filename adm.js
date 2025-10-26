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
  }
});

// --------- LOAD ALL ADMIN DATA ------------
async function loadAdminData() {
  try {
    console.log("Loading admin dashboard data...");
    
    const users = await fetch('/admin/users').then(r => r.json());
    const bookings = await fetch('/admin/bookings').then(r => r.json());
    const destinations = await fetch('/admin/destinations').then(r => r.json());

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
  
  tbody.innerHTML = destinations.map(d => `
    <tr>
      <td>${d.name}</td>
      <td>${d.type || 'N/A'}</td>
      <td>${d.description || 'N/A'}</td>
    </tr>
  `).join('');
  
  console.log(`✅ Rendered ${destinations.length} destinations`);
}

// --------- DELETE BOOKING ------------
async function deleteBooking(id) {
  if (!confirm("Are you sure you want to delete this booking?")) return;
  
  try {
    const res = await fetch(`/admin/bookings/${id}`, { method: 'DELETE' });
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

// --------- ALTERNATIVE DESTINATIONS LOADING (if needed) ------------
async function loadDestinations() {
  const res = await fetch('/destinations');
  const data = await res.json();
  const container = document.getElementById('adminDestinationsList');
  
  if (!container) return; // Element doesn't exist on this page
  
  container.innerHTML = data.map(d => `
    <div class="destination-card">
      <div class="destination-info">
        <h4>${d.name}</h4>
        <p>${d.type}</p>
        <button class="btn-danger" onclick="deleteDestination('${d._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// --------- ADD DESTINATION (if modal exists) ------------
async function addDestination() {
  const name = document.getElementById("destName")?.value;
  const type = document.getElementById("destType")?.value;
  const imageUrl = document.getElementById("destImage")?.value;

  if (!name || !type) {
    alert("Please fill required fields");
    return;
  }

  const res = await fetch("/destinations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type, imageUrl })
  });

  if (res.ok) {
    alert("Destination added!");
    closeAddDestinationModal();
    loadDestinations();
  } else {
    alert("Error adding destination");
  }
}

// --------- DELETE DESTINATION ------------
async function deleteDestination(id) {
  if (!confirm("Delete this destination?")) return;
  
  try {
    await fetch(`/destinations/${id}`, { method: "DELETE" });
    alert("Destination deleted");
    loadDestinations();
  } catch (err) {
    console.error("Error deleting destination:", err);
    alert("Error deleting destination");
  }
}

// --------- MODAL CONTROLS (if modals exist) ------------
function openAddDestinationModal() {
  const modal = document.getElementById("addDestinationModal");
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeAddDestinationModal() {
  const modal = document.getElementById("addDestinationModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// --------- CONSOLE LOG ON LOAD ------------
console.log(`
🔐 Admin Dashboard Loaded
📅 Time: ${new Date().toLocaleString()}
👤 Admin: ${currentAdmin?.username || 'Not logged in'}
`);