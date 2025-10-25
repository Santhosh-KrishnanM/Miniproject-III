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
    window.location.href = "admin_login.html";
  } else {
    currentAdmin = JSON.parse(storedAdmin);
    loadDestinations();
    loadBookings();
    loadUsers();
  }
});

async function loadDestinations() {
  const res = await fetch('/destinations');
  const data = await res.json();
  const container = document.getElementById('adminDestinationsList');
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

async function addDestination() {
  const name = document.getElementById("destName").value;
  const type = document.getElementById("destType").value;
  const imageUrl = document.getElementById("destImage").value;

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

async function deleteDestination(id) {
  if (!confirm("Delete this destination?")) return;
  await fetch(`/destinations/${id}`, { method: "DELETE" });
  loadDestinations();
}

function openAddDestinationModal() {
  document.getElementById("addDestinationModal").style.display = "flex";
}
function closeAddDestinationModal() {
  document.getElementById("addDestinationModal").style.display = "none";
}

async function loadBookings() {
  const res = await fetch("/api/bookings");
  const data = await res.json();
  document.getElementById("adminBookingsList").innerHTML =
    data.map(b => `<p>${b.userId} → ${b.destination?.name} (${b.startDate.slice(0,10)} to ${b.endDate.slice(0,10)})</p>`).join('');
}

async function loadUsers() {
  const res = await fetch("/api/users");
  const data = await res.json();
  document.getElementById("adminUsersList").innerHTML =
    data.map(u => `<p>${u.username} - ${u.email}</p>`).join('');
}

function logoutAdmin() {
  localStorage.removeItem("adminUser");
  window.location.href = "admin_login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  loadAdminData();
});

async function loadAdminData() {
  try {
    const users = await fetch('/admin/users').then(r => r.json());
    const bookings = await fetch('/admin/bookings').then(r => r.json());
    const destinations = await fetch('/admin/destinations').then(r => r.json());

    renderUsers(users);
    renderBookings(bookings);
    renderDestinations(destinations);
  } catch (err) {
    console.error("Failed to load admin data", err);
  }
}

function renderUsers(users) {
  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${u.phone || '-'}</td>
      <td>${u.address || '-'}</td>
    </tr>
  `).join('');
}

function renderBookings(bookings) {
  const tbody = document.querySelector("#bookingsTable tbody");
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
}

function renderDestinations(destinations) {
  const tbody = document.querySelector("#destinationsTable tbody");
  tbody.innerHTML = destinations.map(d => `
    <tr>
      <td>${d.name}</td>
      <td>${d.category}</td>
      <td>${d.location}</td>
    </tr>
  `).join('');
}

async function deleteBooking(id) {
  if (!confirm("Are you sure you want to delete this booking?")) return;
  try {
    const res = await fetch(`/admin/bookings/${id}`, { method: 'DELETE' });
    const data = await res.json();
    alert(data.message);
    loadAdminData(); // refresh after deletion
  } catch (err) {
    alert("Error deleting booking");
  }
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-buttons button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
}

function logoutAdmin() {
  localStorage.removeItem("admin");
  window.location.href = "admin_login.html";
}

