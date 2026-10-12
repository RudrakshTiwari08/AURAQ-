/**
 * BRAND — Merchant Dashboard Engine (js/dashboard.js)
 * Coordinates analytics charts with Chart.js, orders approval workflow,
 * customer chat transcript inspection, inventory management, and agent testing.
 */

(function () {
  'use strict';

  let currentTab = 'overview';
  let chartInstance = null;
  let allOrders = [];
  let currentOrderFilter = 'all';

  // Global toast notification helper
  function showToast(message, isError = false) {
    const toast = document.getElementById('dash-global-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = isError ? 'alert-box alert-error' : 'alert-box alert-success';
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }

  // Tab switching manager
  function initTabNavigation() {
    const navButtons = document.querySelectorAll('.dash-nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (!targetTab) return;

        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.dash-section').forEach(sec => sec.classList.remove('active'));
        const targetSection = document.getElementById(`sec-${targetTab}`);
        if (targetSection) {
          targetSection.classList.add('active');
        }

        currentTab = targetTab;
        loadSectionData(targetTab);
      });
    });
  }

  // Dispatch data loader for active section
  function loadSectionData(tab) {
    switch (tab) {
      case 'overview':
        loadOverviewStats();
        break;
      case 'orders':
        loadOrders();
        break;
      case 'conversations':
        loadConversations();
        break;
      case 'products':
        loadProducts();
        break;
      case 'faqs':
        loadFaqs();
        break;
      case 'settings':
        loadSettings();
        break;
    }
  }

  // Load and render Overview stats and 14-day Chart.js line chart
  async function loadOverviewStats() {
    try {
      const stats = await window.api.getDashboardStats();
      if (!stats) return;

      document.getElementById('stat-convos').textContent = (stats.conversations || 0).toLocaleString();
      document.getElementById('stat-interest').textContent = (stats.interested || 0).toLocaleString();
      document.getElementById('stat-buy').textContent = (stats.wants_to_buy || 0).toLocaleString();
      document.getElementById('stat-confirmed').textContent = (stats.confirmed_orders || 0).toLocaleString();

      // Render Top Inquired Products
      const topList = document.getElementById('top-products-list');
      if (topList && stats.top_products) {
        topList.innerHTML = '';
        const maxCount = Math.max(...stats.top_products.map(p => p.count), 1);
        stats.top_products.forEach((prod, i) => {
          const pct = Math.round((prod.count / maxCount) * 100);
          const item = document.createElement('div');
          item.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 0.3rem;">
              <span style="color: var(--bone); font-weight: 600;">${i + 1}. ${prod.name}</span>
              <span style="color: var(--champagne); font-weight: 700;">${prod.count} inquiries</span>
            </div>
            <div class="funnel-bar-track">
              <div class="funnel-bar-fill ${i === 0 ? 'active' : ''}" style="width: ${pct}%;"></div>
            </div>
          `;
          topList.appendChild(item);
        });
      }

      // Render 14-Day Velocity Chart
      const canvas = document.getElementById('velocity-chart');
      if (canvas && stats.daily && typeof Chart !== 'undefined') {
        const ctx = canvas.getContext('2d');
        const labels = stats.daily.map(d => d.date);
        const dataPoints = stats.daily.map(d => d.conversations);

        if (chartInstance) {
          chartInstance.destroy();
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, 'rgba(255, 77, 61, 0.28)');
        gradient.addColorStop(0.6, 'rgba(122, 15, 31, 0.12)');
        gradient.addColorStop(1, 'rgba(11, 3, 6, 0.0)');

        chartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Nocturnal Conversations',
              data: dataPoints,
              borderColor: '#FF4D3D',
              borderWidth: 2.5,
              backgroundColor: gradient,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#FF4D3D',
              pointBorderColor: '#0B0306',
              pointRadius: 4,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: '#F4EAE6'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(24, 4, 10, 0.95)',
                borderColor: 'rgba(244, 234, 230, 0.15)',
                borderWidth: 1,
                titleColor: '#F4EAE6',
                bodyColor: '#B89A9A',
                padding: 10,
                displayColors: false
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(244, 234, 230, 0.04)' },
                ticks: { color: '#B89A9A', font: { family: 'Manrope', size: 11 } }
              },
              y: {
                grid: { color: 'rgba(244, 234, 230, 0.04)' },
                ticks: { color: '#B89A9A', font: { family: 'Manrope', size: 11 } },
                beginAtZero: true
              }
            }
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load dashboard metrics', e);
    }
  }

  // Load and render Orders section
  async function loadOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 2.5rem;"><span class="spinner spinner-light"></span> Loading order requests...</div>';

    try {
      allOrders = await window.api.getOrders();
      renderOrdersTable();
      updatePendingSidebarBadge();
    } catch (err) {
      container.innerHTML = `<div class="alert-box alert-error" style="margin: 1.5rem;">${err.message}</div>`;
    }
  }

  // Update badge count in sidebar
  function updatePendingSidebarBadge() {
    const badge = document.getElementById('sidebar-pending-badge');
    if (!badge) return;
    const pendingCount = allOrders.filter(o => o.status === 'pending').length;
    if (pendingCount > 0) {
      badge.textContent = pendingCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  // Render orders table with filtering and confirm/reject triggers
  function renderOrdersTable() {
    const container = document.getElementById('orders-container');
    if (!container) return;

    const filtered = allOrders.filter(o => {
      if (currentOrderFilter === 'all') return true;
      return o.status === currentOrderFilter;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <h4 class="empty-state-title">No orders yet</h4>
          <p class="empty-state-text">Put your link in your Instagram bio and check back.</p>
        </div>
      `;
      return;
    }

    let rowsHtml = '';
    filtered.forEach(o => {
      let statusClass = 'status-pending';
      let statusLabel = 'Awaiting Confirm';
      if (o.status === 'confirmed') {
        statusClass = 'status-confirmed';
        statusLabel = 'Confirmed';
      } else if (o.status === 'rejected') {
        statusClass = 'status-rejected';
        statusLabel = 'Rejected';
      }

      let actionsHtml = '<span class="text-muted" style="font-size: 0.8rem;">Completed</span>';
      if (o.status === 'pending') {
        actionsHtml = `
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" data-order-reject="${o.id}">Reject</button>
            <button class="btn btn-ember btn-sm" data-order-confirm="${o.id}">Confirm</button>
          </div>
        `;
      }

      rowsHtml += `
        <tr>
          <td>
            <strong>${o.customer_name}</strong>
            <div style="font-size: 0.775rem; color: var(--champagne);">${o.contact}</div>
          </td>
          <td>
            <strong>${o.product}</strong>
            <div style="font-size: 0.775rem; color: var(--muted-rose);">${o.size} · ${o.colour} (Qty: ${o.quantity})</div>
          </td>
          <td><span class="status-chip ${statusClass}">${statusLabel}</span></td>
          <td style="color: var(--muted-rose); font-size: 0.8125rem;">${o.created_at}</td>
          <td>${actionsHtml}</td>
        </tr>
      `;
    });

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Customer & Contact</th>
            <th>Item & Variant</th>
            <th>Status</th>
            <th>Received</th>
            <th>Owner Decision</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    // Attach Confirm handlers
    container.querySelectorAll('[data-order-confirm]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-order-confirm');
        try {
          await window.api.confirmOrder(id);
          const order = allOrders.find(o => o.id === id);
          if (order) order.status = 'confirmed';
          renderOrdersTable();
          updatePendingSidebarBadge();
          showToast('Order confirmed! Customer notified on Telegram.');
        } catch (err) {
          showToast('Failed to confirm order: ' + err.message, true);
        }
      });
    });

    // Attach Reject handlers
    container.querySelectorAll('[data-order-reject]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-order-reject');
        try {
          await window.api.rejectOrder(id);
          const order = allOrders.find(o => o.id === id);
          if (order) order.status = 'rejected';
          renderOrdersTable();
          updatePendingSidebarBadge();
          showToast('Order marked rejected.');
        } catch (err) {
          showToast('Failed to reject order: ' + err.message, true);
        }
      });
    });
  }

  // Setup order filter tab buttons
  function initOrderFilters() {
    const filterBtns = document.querySelectorAll('#order-filter-buttons button');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentOrderFilter = btn.getAttribute('data-filter');
        renderOrdersTable();
      });
    });
  }

  // Load and render Customer Conversations
  async function loadConversations() {
    const threadsContainer = document.getElementById('convos-threads');
    if (!threadsContainer) return;

    threadsContainer.innerHTML = '<div style="text-align: center; padding: 1.5rem;"><span class="spinner spinner-light"></span> Loading threads...</div>';

    try {
      const convos = await window.api.getConversations();
      if (!convos || convos.length === 0) {
        threadsContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--muted-rose);">No customer conversations logged yet.</div>';
        return;
      }

      threadsContainer.innerHTML = '';
      convos.forEach((c, idx) => {
        const threadBtn = document.createElement('button');
        threadBtn.className = `thread-item ${idx === 0 ? 'active' : ''}`;
        const lastMsg = (c.messages && c.messages.length > 0) ? c.messages[c.messages.length - 1].text : '';

        threadBtn.innerHTML = `
          <div class="thread-header">
            <span class="thread-name">${c.customer_label}</span>
            <span class="thread-time">${c.last_message_at}</span>
          </div>
          <div class="thread-preview">${lastMsg}</div>
          ${c.escalated ? '<span class="status-chip status-pending" style="margin-top: 0.35rem; font-size: 0.65rem;">Escalated</span>' : ''}
        `;

        threadBtn.addEventListener('click', () => {
          document.querySelectorAll('.thread-item').forEach(b => b.classList.remove('active'));
          threadBtn.classList.add('active');
          displayConversation(c);
        });

        threadsContainer.appendChild(threadBtn);
      });

      // Display first conversation by default
      if (convos.length > 0) {
        displayConversation(convos[0]);
      }
    } catch (err) {
      threadsContainer.innerHTML = `<div class="alert-box alert-error">${err.message}</div>`;
    }
  }

  // Display specific conversation transcript in right pane
  function displayConversation(convo) {
    const titleEl = document.getElementById('active-chat-title');
    const subEl = document.getElementById('active-chat-sub');
    const escPill = document.getElementById('active-chat-escalated-pill');
    const feed = document.getElementById('chat-messages-feed');

    if (titleEl) titleEl.textContent = convo.customer_label;
    if (subEl) subEl.textContent = `Last activity: ${convo.last_message_at}`;
    if (escPill) escPill.style.display = convo.escalated ? 'block' : 'none';

    if (feed) {
      feed.innerHTML = '';
      (convo.messages || []).forEach(m => {
        const isUser = m.role === 'customer';
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${isUser ? 'customer' : 'assistant'}`;
        bubble.innerHTML = `
          <div style="font-size: 0.725rem; font-weight: 700; color: ${isUser ? 'var(--bone)' : 'var(--champagne)'}; margin-bottom: 0.2rem;">
            ${isUser ? 'Customer' : 'Auraq Assistant'}
          </div>
          <div>${m.text}</div>
          <div class="chat-meta">${m.time || ''}</div>
        `;
        feed.appendChild(bubble);
      });
      feed.scrollTop = feed.scrollHeight;
    }
  }

  // Load and manage Products tab in Dashboard
  async function loadProducts() {
    const container = document.getElementById('dash-products-stream');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 2rem;"><span class="spinner spinner-light"></span> Loading catalog...</div>';

    try {
      const products = await window.api.getProducts();
      if (!products || products.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            </svg>
            <h4 class="empty-state-title">No products in inventory</h4>
            <p class="empty-state-text">Add your items to let your nocturnal assistant answer size and stock questions.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      products.forEach(p => {
        const variantsSummary = (p.variants || [])
          .map(v => `${v.size} / ${v.colour} (${v.stock} in stock)`)
          .join(' · ');

        const formattedPrice = window.formatCurrency ? window.formatCurrency(p.price) : `${window.CONFIG?.CURRENCY || '₹'}${p.price}`;

        const card = document.createElement('div');
        card.className = 'item-chip-card';
        card.innerHTML = `
          <div class="item-title-col">
            <strong>${p.name} — ${formattedPrice} <span class="text-champagne" style="font-size: 0.8rem;">(${p.category})</span></strong>
            <span>${variantsSummary || 'No variants registered'}</span>
          </div>
          <button class="btn btn-ghost btn-sm" data-del-dash-prod="${p.id}" title="Delete item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        `;
        container.appendChild(card);
      });

      // Attach delete handlers
      container.querySelectorAll('[data-del-dash-prod]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-del-dash-prod');
          try {
            await window.api.deleteProduct(id);
            showToast('Product removed from catalog.');
            loadProducts();
          } catch (err) {
            showToast('Failed to delete: ' + err.message, true);
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="alert-box alert-error">${err.message}</div>`;
    }
  }

  // Quick add product trigger
  function initAddProductButton() {
    const btn = document.getElementById('btn-open-add-product');
    if (btn) {
      btn.addEventListener('click', async () => {
        const name = prompt('Product Name:');
        if (!name) return;
        const priceCurrency = (window.CONFIG && window.CONFIG.CURRENCY) ? window.CONFIG.CURRENCY : '₹';
        const price = parseFloat(prompt(`Price in ${priceCurrency}:`)) || 0;
        const category = prompt('Category (e.g. Hoodies, Jeans, Tees):') || 'Garments';
        try {
          await window.api.createProduct({
            name,
            price,
            category,
            variants: [{ size: 'M', colour: 'Black', stock: 10 }]
          });
          showToast('Product added to live stock.');
          loadProducts();
        } catch (err) {
          showToast('Failed to add product: ' + err.message, true);
        }
      });
    }
  }

  // Load and manage FAQs tab in Dashboard
  async function loadFaqs() {
    const container = document.getElementById('dash-faqs-stream');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 2rem;"><span class="spinner spinner-light"></span> Loading FAQs...</div>';

    try {
      const faqs = await window.api.getFaqs();
      if (!faqs || faqs.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <h4 class="empty-state-title">No FAQs configured</h4>
            <p class="empty-state-text">Teach the assistant your boutique rules to answer delivery and exchange questions.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      faqs.forEach(f => {
        const card = document.createElement('div');
        card.className = 'item-chip-card';
        card.innerHTML = `
          <div class="item-title-col">
            <strong>${f.question}</strong>
            <span>${f.answer}</span>
          </div>
          <button class="btn btn-ghost btn-sm" data-del-dash-faq="${f.id}" title="Delete FAQ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        `;
        container.appendChild(card);
      });

      // Attach delete handlers
      container.querySelectorAll('[data-del-dash-faq]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-del-dash-faq');
          try {
            await window.api.deleteFaq(id);
            showToast('FAQ removed.');
            loadFaqs();
          } catch (err) {
            showToast('Failed to delete FAQ: ' + err.message, true);
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="alert-box alert-error">${err.message}</div>`;
    }
  }

  // Quick add FAQ trigger
  function initAddFaqButton() {
    const btn = document.getElementById('btn-open-add-faq');
    if (btn) {
      btn.addEventListener('click', async () => {
        const question = prompt('Question:');
        if (!question) return;
        const answer = prompt('Answer:');
        if (!answer) return;
        try {
          await window.api.createFaq({ question, answer });
          showToast('FAQ memorized.');
          loadFaqs();
        } catch (err) {
          showToast('Failed to save FAQ: ' + err.message, true);
        }
      });
    }
  }

  // Setup Test Chat Simulator form
  function initTestChat() {
    const form = document.getElementById('test-chat-form');
    const input = document.getElementById('test-chat-input');
    const feed = document.getElementById('test-chat-feed');

    if (!form || !input || !feed) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      input.value = '';

      // Append user bubble
      const userBubble = document.createElement('div');
      userBubble.className = 'chat-bubble customer';
      userBubble.innerHTML = `
        <div style="font-size: 0.725rem; font-weight: 700; margin-bottom: 0.2rem;">You (Test Customer)</div>
        <div>${text}</div>
      `;
      feed.appendChild(userBubble);
      feed.scrollTop = feed.scrollHeight;

      // Append typing indicator
      const typingBubble = document.createElement('div');
      typingBubble.className = 'chat-bubble assistant';
      typingBubble.innerHTML = '<span class="spinner spinner-light"></span> <em>Agent is typing...</em>';
      feed.appendChild(typingBubble);
      feed.scrollTop = feed.scrollHeight;

      try {
        const res = await window.api.testChat(text);
        typingBubble.innerHTML = `
          <div>${res.reply}</div>
          <div class="chat-meta">Autonomous Agent · Instant</div>
        `;
      } catch (err) {
        typingBubble.innerHTML = `<div style="color: #ffadb6;">Error: ${err.message}</div>`;
      } finally {
        feed.scrollTop = feed.scrollHeight;
      }
    });
  }

  // Load and update Settings section
  async function loadSettings() {
    try {
      const biz = await window.api.getBusiness();
      if (!biz) return;

      document.getElementById('settings-name').value = biz.name || '';
      document.getElementById('settings-desc').value = biz.description || '';
      document.getElementById('settings-hours').value = biz.hours || '';
      document.getElementById('settings-city').value = biz.city || '';
      document.getElementById('settings-contact').value = biz.contact || '';
      
      const linkInput = document.getElementById('settings-tg-link');
      const openTgBtn = document.getElementById('btn-open-settings-telegram');

      if (biz.telegram_link && biz.telegram_link.trim() !== '') {
        if (linkInput) linkInput.value = biz.telegram_link;
        if (openTgBtn) {
          openTgBtn.href = biz.telegram_link;
          openTgBtn.style.display = 'inline-flex';
        }
      } else {
        if (linkInput) {
          linkInput.value = '';
          linkInput.placeholder = 'Your link is being prepared...';
        }
        if (openTgBtn) openTgBtn.style.display = 'none';
      }

      const sidebarStore = document.getElementById('sidebar-store-name');
      if (sidebarStore) {
        if (biz.name) {
          sidebarStore.textContent = biz.name;
        } else if (window.CONFIG && window.CONFIG.USE_MOCK) {
          sidebarStore.textContent = window.CONFIG.DEMO_STORE_NAME || 'ATELIER NOIR';
        } else {
          sidebarStore.textContent = '';
        }
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  }

  // Setup Settings form submission and copy link button
  function initSettingsForm() {
    const form = document.getElementById('settings-form');
    const copyBtn = document.getElementById('btn-copy-settings-link');
    const linkInput = document.getElementById('settings-tg-link');
    const connectAlertsBtn = document.getElementById('btn-settings-connect-alerts');
    const logoutBtn = document.getElementById('btn-settings-logout');
    const sidebarLogout = document.getElementById('btn-sidebar-logout');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await window.api.updateBusiness({
            description: document.getElementById('settings-desc').value.trim(),
            hours: document.getElementById('settings-hours').value.trim(),
            city: document.getElementById('settings-city').value.trim(),
            contact: document.getElementById('settings-contact').value.trim()
          });
          showToast('Store settings saved successfully.');
        } catch (err) {
          showToast('Failed to save settings: ' + err.message, true);
        }
      });
    }

    if (copyBtn && linkInput) {
      copyBtn.addEventListener('click', () => {
        linkInput.select();
        navigator.clipboard.writeText(linkInput.value).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        });
      });
    }

    if (connectAlertsBtn) {
      connectAlertsBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          const alertLink = await window.api.getTelegramConnectLink();
          if (alertLink && alertLink.link) {
            window.open(alertLink.link, '_blank');
          }
        } catch (err) {
          showToast('Failed to retrieve alert link: ' + err.message, true);
        }
      });
    }

    const handleLogout = () => {
      window.auth.logout();
    };

    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (sidebarLogout) sidebarLogout.addEventListener('click', handleLogout);
  }

  // Initialize on DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    initTabNavigation();
    initOrderFilters();
    initAddProductButton();
    initAddFaqButton();
    initTestChat();
    initSettingsForm();

    // Default load Overview
    loadOverviewStats();
    // Preload orders to set pending badge
    window.api.getOrders().then(orders => {
      allOrders = orders;
      updatePendingSidebarBadge();
    }).catch(() => {});

    // Preload business details to set sidebar boutique name
    window.api.getBusiness().then(biz => {
      const sidebarStore = document.getElementById('sidebar-store-name');
      if (sidebarStore) {
        if (biz && biz.name) {
          sidebarStore.textContent = biz.name;
        } else if (window.CONFIG && window.CONFIG.USE_MOCK) {
          sidebarStore.textContent = window.CONFIG.DEMO_STORE_NAME || 'ATELIER NOIR';
        } else {
          sidebarStore.textContent = '';
        }
      }
    }).catch(() => {});
  });
})();
