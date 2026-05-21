document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const teacherOnlyNote = document.getElementById("teacher-only-note");

  const adminToggle = document.getElementById("admin-toggle");
  const adminPanel = document.getElementById("admin-panel");
  const openLoginBtn = document.getElementById("open-login");
  const logoutBtn = document.getElementById("logout-btn");
  const adminAuthView = document.getElementById("admin-auth-view");
  const adminUserView = document.getElementById("admin-user-view");
  const adminUserText = document.getElementById("admin-user-text");

  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLoginBtn = document.getElementById("cancel-login");

  let adminToken = localStorage.getItem("adminToken") || "";
  let adminUsername = localStorage.getItem("adminUsername") || "";

  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
    loginForm.reset();
  }

  function applyAdminUiState() {
    const isAdmin = Boolean(adminToken);
    if (isAdmin) {
      adminAuthView.classList.add("hidden");
      adminUserView.classList.remove("hidden");
      adminUserText.textContent = `Logged in as ${adminUsername}`;
      teacherOnlyNote.textContent = "Teacher mode is active.";
      teacherOnlyNote.className = "success";
      signupForm.classList.remove("hidden");
    } else {
      adminAuthView.classList.remove("hidden");
      adminUserView.classList.add("hidden");
      teacherOnlyNote.textContent = "Teacher login required to manage registrations.";
      teacherOnlyNote.className = "info";
      signupForm.classList.add("hidden");
    }
  }

  async function syncAdminStatus() {
    if (!adminToken) {
      applyAdminUiState();
      return;
    }

    try {
      const response = await fetch("/admin/status", {
        headers: {
          "X-Admin-Token": adminToken,
        },
      });
      const status = await response.json();

      if (!status.is_admin) {
        adminToken = "";
        adminUsername = "";
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUsername");
      }
    } catch (_error) {
      adminToken = "";
      adminUsername = "";
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUsername");
    }

    applyAdminUiState();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        adminToken
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!adminToken) {
      showMessage("Teacher login required.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "X-Admin-Token": adminToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!adminToken) {
      showMessage("Teacher login required.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "X-Admin-Token": adminToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  adminToggle.addEventListener("click", () => {
    adminPanel.classList.toggle("hidden");
  });

  openLoginBtn.addEventListener("click", openLoginModal);
  cancelLoginBtn.addEventListener("click", closeLoginModal);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Login failed.", "error");
        return;
      }

      adminToken = result.admin_token;
      adminUsername = result.username;
      localStorage.setItem("adminToken", adminToken);
      localStorage.setItem("adminUsername", adminUsername);
      applyAdminUiState();
      fetchActivities();
      closeLoginModal();
      showMessage("Teacher login successful.", "success");
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    if (!adminToken) {
      return;
    }

    try {
      await fetch("/admin/logout", {
        method: "POST",
        headers: {
          "X-Admin-Token": adminToken,
        },
      });
    } catch (_error) {
      // Ignore network errors and clear local session anyway.
    }

    adminToken = "";
    adminUsername = "";
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUsername");
    applyAdminUiState();
    fetchActivities();
    showMessage("Teacher logged out.", "info");
  });

  // Initialize app
  syncAdminStatus();
  fetchActivities();
});
