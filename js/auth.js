/**
 * BRAND — Authentication Handlers
 * Manages signup, login forms, token verification, and logout operations.
 */

(function () {
  'use strict';

  // Check existing auth token and redirect if necessary
  function checkAuth() {
    return localStorage.getItem('token');
  }

  // Clear authentication token and return to login screen
  function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }

  // Setup custom desktop cursor glow effect
  function initCursorGlow() {
    const glow = document.querySelector('.cursor-glow');
    if (!glow) return;

    let targetX = -500, targetY = -500;
    let currentX = -500, currentY = -500;

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    });

    function loop() {
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      glow.style.transform = `translate(${currentX}px, ${currentY}px)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // Attach DOM listeners for Signup page
  function initSignupPage() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    const errorContainer = document.getElementById('auth-error');
    const submitBtn = document.getElementById('signup-submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorContainer) {
        errorContainer.style.display = 'none';
        errorContainer.textContent = '';
      }

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const businessName = document.getElementById('business-name').value.trim();
      const businessType = document.getElementById('business-type').value;

      if (!name || !email || !password || !businessName) {
        if (errorContainer) {
          errorContainer.textContent = 'Please complete all fields to proceed.';
          errorContainer.style.display = 'flex';
        }
        return;
      }

      // Enter loading state
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Creating store...';

      try {
        await window.api.signup({
          name,
          email,
          password,
          business_name: businessName,
          business_type: businessType
        });
        window.location.href = 'setup.html';
      } catch (err) {
        if (errorContainer) {
          errorContainer.textContent = err.message || 'An error occurred during registration.';
          errorContainer.style.display = 'flex';
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Attach DOM listeners for Login page
  function initLoginPage() {
    const form = document.getElementById('login-form');
    if (!form) return;

    const errorContainer = document.getElementById('auth-error');
    const submitBtn = document.getElementById('login-submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorContainer) {
        errorContainer.style.display = 'none';
        errorContainer.textContent = '';
      }

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        if (errorContainer) {
          errorContainer.textContent = 'Please enter both email and password.';
          errorContainer.style.display = 'flex';
        }
        return;
      }

      // Enter loading state
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Authenticating...';

      try {
        await window.api.login({ email, password });
        window.location.href = 'dashboard.html';
      } catch (err) {
        if (errorContainer) {
          errorContainer.textContent = err.message || 'Invalid email or password.';
          errorContainer.style.display = 'flex';
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Expose global auth helpers
  window.auth = {
    checkAuth,
    logout
  };

  // Run on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initCursorGlow();
    initSignupPage();
    initLoginPage();
  });
})();
