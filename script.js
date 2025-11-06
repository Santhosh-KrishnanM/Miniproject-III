// Centralized client-side application logic for Travel Aura
// Cleaned up duplicates, fixed inconsistent endpoints, and consolidated event wiring.
// Use relative API endpoints so the app works in local and deployed environments.

(function () {
  // ------------------ Utilities ------------------
  function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  function showToast(message, type = 'info') {
    try {
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.position = 'fixed';
      toast.style.right = '20px';
      toast.style.top = '20px';
      toast.style.background = type === 'error' ? '#f44336' : (type === 'success' ? '#4caf50' : '#333');
      toast.style.color = '#fff';
      toast.style.padding = '10px 14px';
      toast.style.borderRadius = '6px';
      toast.style.zIndex = 99999;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    } catch (e) {
      alert(message);
    }
  }

  // ------------------ Storage & Session ------------------
  function storeUserData(userData, isAdmin = false) {
    const enhancedUserData = {
      ...userData,
      loginTime: getCurrentDateTime(),
      isLoggedIn: true,
      userType: isAdmin ? 'admin' : 'tourist'
    };

    const storageKey = isAdmin ? 'adminUser' : 'currentUser';
    localStorage.setItem(storageKey, JSON.stringify(enhancedUserData));
    sessionStorage.setItem(storageKey, JSON.stringify(enhancedUserData));
    return enhancedUserData;
  }

  function checkExistingLogin() {
    // Prefer admin presence
    const adminRaw = localStorage.getItem('adminUser') || sessionStorage.getItem('adminUser');
    if (adminRaw) {
      try {
        const admin = JSON.parse(adminRaw);
        if (admin.isLoggedIn && admin.userType === 'admin') {
          return { ...admin, isAdmin: true };
        }
      } catch (e) {
        localStorage.removeItem('adminUser'); sessionStorage.removeItem('adminUser');
      }
    }
    const userRaw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        if (user.isLoggedIn && user.userType === 'tourist') {
          return { ...user, isAdmin: false };
        }
      } catch (e) {
        localStorage.removeItem('currentUser'); sessionStorage.removeItem('currentUser');
      }
    }
    return null;
  }

  function refreshSession() {
    const user = checkExistingLogin();
    if (user) {
      user.lastActivity = getCurrentDateTime();
      const storageKey = user.isAdmin ? 'adminUser' : 'currentUser';
      localStorage.setItem(storageKey, JSON.stringify(user));
      sessionStorage.setItem(storageKey, JSON.stringify(user));
    }
  }

  // ------------------ DOM Helpers & Validation ------------------
  function showError(input, message) {
    clearError(input);
    if (!input || !input.parentElement) return;
    let error = document.createElement("div");
    error.className = "error-msg";
    error.innerText = message;
    input.parentElement.appendChild(error);
    input.style.borderColor = "#ffcc00";
  }

  function clearError(input) {
    if (!input || !input.parentElement) return;
    let parent = input.parentElement;
    let error = parent.querySelector(".error-msg");
    if (error) error.remove();
    input.style.borderColor = "";
  }

  // ------------------ Modal controls ------------------
  function openModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
      modal.style.display = "flex";
      setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 100);
    }
  }

  function closeModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
      modal.style.display = "none";
      document.querySelectorAll(".error-msg").forEach(err => err.remove());
      document.querySelectorAll("#loginForm input, #signupForm input").forEach(i => i.style.borderColor = "");
    }
  }

  // Expose open/close globally for inline handlers if any exist
  window.openModal = openModal;
  window.closeModal = closeModal;

  // ------------------ Navigation helpers ------------------
  function showAdventurePage() {
    const sc = document.querySelector('.slideshow-container');
    const ex = document.querySelector('.experiences');
    if (sc) sc.style.display = 'none';
    if (ex) ex.style.display = 'none';
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
    const adv = document.getElementById('adventurePage');
    if (adv) adv.style.display = 'block';
    const food = document.getElementById('foodPage');
    if (food) food.style.display = 'none';
    const main = document.getElementById('mainPage');
    if (main) main.style.display = 'none';
  }

  function showFoodPage() {
    const sc = document.querySelector('.slideshow-container');
    const ex = document.querySelector('.experiences');
    if (sc) sc.style.display = 'none';
    if (ex) ex.style.display = 'none';
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
    const food = document.getElementById('foodPage');
    if (food) food.style.display = 'block';
    const adv = document.getElementById('adventurePage');
    if (adv) adv.style.display = 'none';
    const main = document.getElementById('mainPage');
    if (main) main.style.display = 'none';
  }

  function showMainPage() {
    const sc = document.querySelector('.slideshow-container');
    const ex = document.querySelector('.experiences');
    if (sc) sc.style.display = 'block';
    if (ex) ex.style.display = 'block';
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'flex';
    const adv = document.getElementById('adventurePage');
    if (adv) adv.style.display = 'none';
    const food = document.getElementById('foodPage');
    if (food) food.style.display = 'none';
    const main = document.getElementById('mainPage');
    if (main) main.style.display = 'none';
  }

  function showMainPageAfterAuth(username) {
    const main = document.getElementById("mainPage");
    if (main) main.style.display = "flex";
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
    const sc = document.querySelector('.slideshow-container');
    if (sc) sc.style.display = 'none';
    const ex = document.querySelector('.experiences');
    if (ex) ex.style.display = 'none';
    const adv = document.getElementById('adventurePage');
    if (adv) adv.style.display = 'none';
    const food = document.getElementById('foodPage');
    if (food) food.style.display = 'none';
    const welcome = document.getElementById("welcomePage");
    if (welcome) welcome.style.display = "none";
    const mainWelcome = document.getElementById("mainWelcome");
    if (mainWelcome) mainWelcome.innerText = `Hello, ${username || 'User'}!`;
    closeModal();
  }

  function showMainExperiences() {
    const main = document.getElementById("mainPage");
    if (main) main.style.display = "flex";
    const adv = document.getElementById('adventurePage');
    if (adv) adv.style.display = 'none';
    const food = document.getElementById('foodPage');
    if (food) food.style.display = 'none';
  }

  function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('adminUser');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('adminUser');

    const main = document.getElementById("mainPage");
    if (main) main.style.display = "none";
    const welcome = document.getElementById("welcomePage");
    if (welcome) welcome.style.display = "none";
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'flex';
    const sc = document.querySelector('.slideshow-container');
    if (sc) sc.style.display = 'block';
    const ex = document.querySelector('.experiences');
    if (ex) ex.style.display = 'block';

    if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('adm.html')) {
      window.location.href = 'travel.html';
    }
  }

  // Expose navigation helpers
  window.showAdventurePage = showAdventurePage;
  window.showFoodPage = showFoodPage;
  window.showMainPage = showMainPage;
  window.showMainPageAfterAuth = showMainPageAfterAuth;
  window.showMainExperiences = showMainExperiences;
  window.logout = logout;

  // ------------------ Booking redirect helpers ------------------
  function afterSuccessfulLoginRedirect() {
    const bookingDest = localStorage.getItem('bookingDestination');
    const redirectTo = bookingDest ? 'dashboard.html?openBooking=true' : 'dashboard.html';
    window.location.href = redirectTo;
  }

  function tryOpenBookingFromSavedDestination() {
    const params = new URLSearchParams(window.location.search);
    const openBooking = params.get('openBooking');
    if (!openBooking) return;

    const bookingDestStr = localStorage.getItem('bookingDestination');
    if (!bookingDestStr) return;

    try {
      const bookingDest = JSON.parse(bookingDestStr);
      if (typeof window.openBookingForDestination === 'function') {
        window.openBookingForDestination(bookingDest.id);
      } else {
        window.location.href = `destination-details.html?id=${bookingDest.id}`;
      }
    } catch (e) {
      console.warn('Could not parse bookingDestination', e);
    }
  }

  // Provide function for other scripts to call
  window.openBookingForDestination = function (destinationId) {
    localStorage.setItem('bookingDestination', JSON.stringify({ id: destinationId }));
    if (window.location.pathname.includes('dashboard.html')) {
      const event = new Event('openBookingFromScript');
      window.dispatchEvent(event);
    } else {
      window.location.href = 'dashboard.html?openBooking=true';
    }
  };

  // ------------------ Main DOM wiring (single consolidated listener) ------------------
  document.addEventListener('DOMContentLoaded', function () {
    // Console info
    console.log(`
🌴 Tamil Nadu Tourism Application
📅 Current Date: ${getCurrentDateTime()}
👨‍💻 Developer: sk-krishnan05
🚀 Version: 2.0.0
    `);

    // Wire up login/signup forms if present (use relative endpoints)
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const adminLoginForm = document.getElementById('adminLoginForm');

    // Reuse buttons if present
    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");

    if (signupBtn && signupForm) {
      signupBtn.addEventListener('click', function (e) {
        e.preventDefault();
        const username = document.getElementById("signupUsername");
        const email = document.getElementById("signupEmail");
        const phone = document.getElementById("signupPhone");
        const address = document.getElementById("signupAddress");
        const password = document.getElementById("signupPassword");

        // Clear previous
        [username, email, phone, address, password].forEach(clearError);

        let valid = true;
        if (!username.value.trim()) { showError(username, "Username is required."); valid = false; }
        else if (username.value.trim().length < 3) { showError(username, "Username must be at least 3 characters."); valid = false; }

        if (!email.value.trim()) { showError(email, "Email is required."); valid = false; }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { showError(email, "Please enter a valid email address."); valid = false; }

        if (!phone.value.trim()) { showError(phone, "Phone number is required."); valid = false; }
        else if (!/^\d{10}$/.test(phone.value.trim())) { showError(phone, "Enter a valid 10-digit phone number."); valid = false; }

        if (!address.value.trim()) { showError(address, "Address is required."); valid = false; }
        else if (address.value.trim().length < 10) { showError(address, "Address must be at least 10 characters."); valid = false; }

        if (!password.value.trim()) { showError(password, "Password is required."); valid = false; }
        else if (password.value.length < 6) { showError(password, "Password must be at least 6 characters."); valid = false; }

        if (!valid) return;

        signupBtn.disabled = true;
        signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing up...';

        fetch('/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            username: username.value.trim(),
            email: email.value.trim(),
            phone: phone.value.trim(),
            address: address.value.trim(),
            password: password.value
          })
        })
          .then(async res => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
            return data;
          })
          .then(data => {
            if (data.message === 'User registered!' && data.user) {
              const userData = storeUserData({
                _id: data.user._id,
                username: data.user.username,
                email: data.user.email,
                phone: data.user.phone,
                address: data.user.address,
                registrationDate: getCurrentDateTime()
              }, false);
              showToast(`Welcome ${userData.username}! Registration successful.`, 'success');
              setTimeout(() => afterSuccessfulLoginRedirect(), 1200);
            } else {
              showToast(data.message || 'Registration failed', 'error');
            }
          })
          .catch(err => {
            console.error('Signup error:', err);
            showToast('Signup failed. Please try again.', 'error');
          })
          .finally(() => {
            signupBtn.disabled = false;
            signupBtn.innerHTML = 'Sign Up';
          });
      });
    }

    if (loginBtn && loginForm) {
      loginBtn.addEventListener('click', function (e) {
        e.preventDefault();
        const usernameEl = document.getElementById("loginUsername");
        const passwordEl = document.getElementById("loginPassword");
        clearError(usernameEl); clearError(passwordEl);

        let valid = true;
        if (!usernameEl.value.trim()) { showError(usernameEl, "Username is required."); valid = false; }
        if (!passwordEl.value.trim()) { showError(passwordEl, "Password is required."); valid = false; }
        if (!valid) return;

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        // Try admin login first, then tourist if admin fails
        fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ username: usernameEl.value.trim(), password: passwordEl.value })
        })
          .then(async adminRes => {
            if (adminRes.ok) {
              const data = await adminRes.json().catch(() => ({}));
              return { success: true, isAdmin: true, data };
            }
            // admin failed -> try tourist
            const tourRes = await fetch('/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ username: usernameEl.value.trim(), password: passwordEl.value })
            });
            if (tourRes.ok) {
              const data = await tourRes.json().catch(() => ({}));
              return { success: true, isAdmin: false, data };
            }
            return { success: false };
          })
          .then(result => {
            if (!result.success) {
              showToast('Invalid credentials. Please try again.', 'error');
              return;
            }
            const isAdmin = result.isAdmin;
            const payload = result.data;
            if (isAdmin && payload.admin) {
              const admin = storeUserData({
                _id: payload.admin._id,
                username: payload.admin.username,
                email: payload.admin.email,
                lastLogin: getCurrentDateTime()
              }, true);
              showToast(`Welcome back Admin ${admin.username}!`, 'success');
              setTimeout(() => { window.location.href = 'adm.html'; }, 900);
            } else if (!isAdmin && payload.user) {
              const tourist = storeUserData({
                _id: payload.user._id,
                username: payload.user.username,
                email: payload.user.email,
                phone: payload.user.phone,
                address: payload.user.address,
                lastLogin: getCurrentDateTime()
              }, false);
              showToast(`Welcome back ${tourist.username}!`, 'success');
              setTimeout(() => afterSuccessfulLoginRedirect(), 900);
            } else {
              showToast('Login failed. Invalid server response.', 'error');
            }
          })
          .catch(err => {
            console.error('Login error:', err);
            showToast('Login failed. Please check your connection and try again.', 'error');
          })
          .finally(() => {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
          });
      });
    }

    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('adminUsername')?.value?.trim();
        const password = document.getElementById('adminPassword')?.value;
        if (!username || !password) { showToast('Enter admin credentials', 'error'); return; }
        try {
          const res = await fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.admin) {
            storeUserData({ _id: data.admin._id, username: data.admin.username, email: data.admin.email }, true);
            showToast('Admin login successful', 'success');
            setTimeout(() => { window.location.href = 'adm.html'; }, 700);
          } else {
            showToast(data.error || 'Invalid admin credentials', 'error');
          }
        } catch (err) {
          console.error('Admin login error', err);
          showToast('Admin login error', 'error');
        }
      });
    }

    // Input clear on typing
    document.querySelectorAll("#loginForm input, #signupForm input").forEach((input) => {
      input.addEventListener("input", function () { clearError(input); });
    });

    // Enter support for login/signup
    document.querySelectorAll("#loginForm input").forEach((input) => {
      input.addEventListener("keypress", function (e) {
        if (e.key === 'Enter') {
          const btn = document.getElementById("loginBtn");
          if (btn) btn.click();
        }
      });
    });
    document.querySelectorAll("#signupForm input").forEach((input) => {
      input.addEventListener("keypress", function (e) {
        if (e.key === 'Enter') {
          const btn = document.getElementById("signupBtn");
          if (btn) btn.click();
        }
      });
    });

    // Wire modal close on outside click / ESC
    document.addEventListener('click', function (e) {
      const modal = document.getElementById("loginModal");
      if (modal && e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });

    // Try auto-open booking if redirected after login
    tryOpenBookingFromSavedDestination();

    // Periodic session refresh
    setInterval(refreshSession, 5 * 60 * 1000);
    document.addEventListener('click', refreshSession);
    document.addEventListener('keypress', refreshSession);
  });

  // ------------------ Exports for tests / other scripts ------------------
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      checkExistingLogin,
      storeUserData,
      getCurrentDateTime,
      logout,
      showAdventurePage,
      showFoodPage,
      showMainPage,
      openBookingForDestination: window.openBookingForDestination
    };
  }
})();