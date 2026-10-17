/**
 * Auraq — Authentication Handlers
 * Manages signup, login forms, token verification, and logout operations.
 * Implements strict client validation matching the FastAPI backend schema.
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

  // Helper to show/hide inline form error messages
  function setInlineError(fieldId, errorMsg) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    if (errorMsg) {
      el.textContent = errorMsg;
      el.style.display = 'block';
    } else {
      el.textContent = '';
      el.style.display = 'none';
    }
  }

  // Attach DOM listeners for Signup page with backend-aligned validation
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

      // Clear previous inline errors
      setInlineError('name-error', '');
      setInlineError('email-error', '');
      setInlineError('password-error', '');
      setInlineError('business-name-error', '');
      setInlineError('business-type-error', '');

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const businessName = document.getElementById('business-name').value.trim();
      const businessType = document.getElementById('business-type').value;

      let hasError = false;

      // Validation 1: Owner Name required
      if (!name) {
        setInlineError('name-error', 'Owner full name is required.');
        hasError = true;
      }

      // Validation 2: Email format regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        setInlineError('email-error', 'Business email is required.');
        hasError = true;
      } else if (!emailRegex.test(email)) {
        setInlineError('email-error', 'Please enter a valid email address.');
        hasError = true;
      }

      // Validation 3: Password minimum 8 characters (Requirement 8)
      if (!password) {
        setInlineError('password-error', 'Password is required.');
        hasError = true;
      } else if (password.length < 8) {
        setInlineError('password-error', 'Password must be at least 8 characters long.');
        hasError = true;
      }

      // Validation 4: Business name required, max 80 characters (Requirement 8)
      if (!businessName) {
        setInlineError('business-name-error', 'Business / Label name is required.');
        hasError = true;
      } else if (businessName.length > 80) {
        setInlineError('business-name-error', 'Business name must not exceed 80 characters.');
        hasError = true;
      }

      // Validation 5: Business type required (Requirement 8)
      if (!businessType) {
        setInlineError('business-type-error', 'Please select a store category.');
        hasError = true;
      }

      if (hasError) return;

      // Enter loading state
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Creating your assistant...';

      try {
        await window.api.signup({
          name,
          email,
          password,
          business_name: businessName,
          business_type: businessType
        });
        // After signup succeeds, go to setup.html (Requirement 8)
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

  // Attach DOM listeners for Login page with smart onboarding redirect
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

        // Requirement 8: After login succeeds go to dashboard.html,
        // unless the owner has no products yet, in which case go to setup.html
        let products = [];
        try {
          products = await window.api.getProducts();
        } catch (_) {}

        if (!products || products.length === 0) {
          window.location.href = 'setup.html';
        } else {
          window.location.href = 'dashboard.html';
        }
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
