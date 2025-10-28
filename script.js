// =======================
// 🎥 VIDEO SLIDESHOW LOGIC
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const videos = [
    "videos/4328782-uhd_3840_2160_30fps.mp4",
    "videos/14608262.mp4",
    "videos/4328787.mp4"
  ];

  let videoIndex = 0;
  const videoElement = document.getElementById("videoSlideshow");

  // Fade in/out transition
  function fadeInOut(element, duration, callback) {
    element.style.transition = `opacity ${duration}ms ease-in-out`;
    element.style.opacity = 0;

    setTimeout(() => {
      if (callback) callback();
      element.style.opacity = 1;
    }, duration);
  }

  function playNextVideo() {
    fadeInOut(videoElement, 800, () => {
      videoElement.src = videos[videoIndex];
      videoElement.load();
      videoElement.play();

      videoIndex = (videoIndex + 1) % videos.length;
    });
  }

  // Start slideshow
  playNextVideo();
  setInterval(playNextVideo, 4000);
});

// ============================
// 🌐 PAGE NAVIGATION FUNCTIONS
// ============================
function openModal() {
  document.getElementById("loginModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("loginModal").style.display = "none";
}

function showSignup() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("signupForm").style.display = "block";
}

function showLogin() {
  document.getElementById("signupForm").style.display = "none";
  document.getElementById("loginForm").style.display = "block";
}

function showAdventurePage() {
  document.querySelector(".slideshow-container").style.display = "none";
  document.querySelector(".experiences").style.display = "none";
  document.querySelector("nav").style.display = "none";
  document.getElementById("adventurePage").style.display = "block";
  document.getElementById("foodPage").style.display = "none";
}

function showFoodPage() {
  document.querySelector(".slideshow-container").style.display = "none";
  document.querySelector(".experiences").style.display = "none";
  document.querySelector("nav").style.display = "none";
  document.getElementById("foodPage").style.display = "block";
  document.getElementById("adventurePage").style.display = "none";
}

function showMainPage() {
  document.querySelector(".slideshow-container").style.display = "block";
  document.querySelector(".experiences").style.display = "block";
  document.querySelector("nav").style.display = "flex";
  document.getElementById("adventurePage").style.display = "none";
  document.getElementById("foodPage").style.display = "none";
}

// ==========================
// ⚙️ UTILITY FUNCTIONS
// ==========================
function showError(input, message) {
  clearError(input);
  let error = document.createElement("div");
  error.className = "error-msg";
  error.innerText = message;
  input.parentElement.appendChild(error);
  input.style.borderColor = "#ffcc00";
}

function clearError(input) {
  let parent = input.parentElement;
  let error = parent.querySelector(".error-msg");
  if (error) error.remove();
  input.style.borderColor = "";
}

// ==========================
// 💾 STORE USER DATA LOCALLY
// ==========================
function storeUserData(userData) {
  localStorage.setItem("currentUser", JSON.stringify(userData));
  sessionStorage.setItem("currentUser", JSON.stringify(userData));
}

function checkExistingLogin() {
  const data = localStorage.getItem("currentUser");
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ==========================
// 🧾 SIGNUP FUNCTIONALITY
// ==========================
document.addEventListener("DOMContentLoaded", function () {
  const signupBtn = document.getElementById("signupBtn");
  if (signupBtn) {
    signupBtn.addEventListener("click", function (e) {
      e.preventDefault();
      let username = document.getElementById("signupUsername");
      let email = document.getElementById("signupEmail");
      let phone = document.getElementById("signupPhone");
      let address = document.getElementById("signupAddress");
      let password = document.getElementById("signupPassword");
      let hint = document.getElementById("signupHint");

      let valid = true;
      [username, email, phone, address, password, hint].forEach(clearError);

      if (!username.value.trim()) {
        showError(username, "Username required");
        valid = false;
      }
      if (!email.value.trim()) {
        showError(email, "Email required");
        valid = false;
      }
      if (!phone.value.trim()) {
        showError(phone, "Phone required");
        valid = false;
      }
      if (!address.value.trim()) {
        showError(address, "Address required");
        valid = false;
      }
      if (!password.value.trim()) {
        showError(password, "Password required");
        valid = false;
      }
      if (!hint.value.trim()) {
        showError(hint, "Hint required for password recovery");
        valid = false;
      }

      if (valid) {
        const userData = {
          username: username.value.trim(),
          email: email.value.trim(),
          phone: phone.value.trim(),
          address: address.value.trim(),
          password: password.value.trim(),
          hint: hint.value.trim(),
        };
        storeUserData(userData);
        alert(`Welcome ${userData.username}! Registration successful.`);
        closeModal();
      }
    });
  }

  // ======================
  // 🔐 LOGIN FUNCTIONALITY
  // ======================
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      let username = document.getElementById("loginUsername");
      let password = document.getElementById("loginPassword");
      let valid = true;
      [username, password].forEach(clearError);

      if (!username.value.trim()) {
        showError(username, "Username required");
        valid = false;
      }
      if (!password.value.trim()) {
        showError(password, "Password required");
        valid = false;
      }

      if (valid) {
        const userData = checkExistingLogin();
        if (
          userData &&
          username.value.trim() === userData.username &&
          password.value.trim() === userData.password
        ) {
          alert(`Welcome back ${userData.username}!`);
          closeModal();
        } else {
          alert("Invalid username or password!");
        }
      }
    });
  }

  // Clear error when typing
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => clearError(input));
  });
});

// ==========================
// 🔑 FORGOT PASSWORD LOGIC
// ==========================
function openForgotPassword() {
  document.getElementById("forgotPasswordModal").style.display = "flex";
  document.getElementById("forgotStep1").style.display = "block";
  document.getElementById("forgotStep2").style.display = "none";
}

function closeForgotPassword() {
  document.getElementById("forgotPasswordModal").style.display = "none";
}

function verifyHint() {
  const hintInput = document.getElementById("forgotHint").value.trim();
  const savedUser = JSON.parse(localStorage.getItem("currentUser"));

  if (savedUser && savedUser.hint && hintInput === savedUser.hint) {
    alert("Hint matched! Please set your new password.");
    document.getElementById("forgotStep1").style.display = "none";
    document.getElementById("forgotStep2").style.display = "block";
  } else {
    alert("Hint does not match any account.");
  }
}

function updatePassword() {
  const newPass = document.getElementById("newPassword").value.trim();
  const confirmPass = document.getElementById("confirmPassword").value.trim();

  if (!newPass || !confirmPass) {
    alert("Please fill all fields.");
    return;
  }
  if (newPass !== confirmPass) {
    alert("Passwords do not match.");
    return;
  }

  let user = JSON.parse(localStorage.getItem("currentUser"));
  if (user) {
    user.password = newPass;
    localStorage.setItem("currentUser", JSON.stringify(user));
    alert(`Password changed successfully for ${user.username}!`);
    closeForgotPassword();
    closeModal();
    openModal(); // reopen login modal
  } else {
    alert("User data not found. Please sign up again.");
  }
}

// ==========================
// 🚪 LOGOUT FUNCTION
// ==========================
function logout() {
  localStorage.removeItem("currentUser");
  sessionStorage.removeItem("currentUser");
  alert("You have been logged out!");
  showMainPage();
}
