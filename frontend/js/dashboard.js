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
              label: 'Conversations',
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

    // Attach Confirm and Reject handlers
    attachOrderActionHandlers(container);
  }

  // Open confirmation dialog for Reject with Cancel and Reject buttons
  function openRejectOrderDialog() {
    return new Promise((resolve) => {
      const modal = document.getElementById('reject-order-modal');
      const cancelBtn = document.getElementById('reject-order-cancel-btn');
      const confirmBtn = document.getElementById('reject-order-confirm-btn');

      if (!modal || !cancelBtn || !confirmBtn) {
        // Fallback to window.confirm if modal element is not in DOM
        const ok = window.confirm('Reject this order? The customer will be told it could not be fulfilled.');
        resolve(ok);
        return;
      }

      modal.style.display = 'flex';

      function cleanUp() {
        modal.style.display = 'none';
        cancelBtn.removeEventListener('click', onCancel);
        confirmBtn.removeEventListener('click', onConfirm);
      }

      function onCancel() {
        cleanUp();
        resolve(false);
      }

      function onConfirm() {
        cleanUp();
        resolve(true);
      }

      cancelBtn.addEventListener('click', onCancel);
      confirmBtn.addEventListener('click', onConfirm);
    });
  }

  // Handle order confirmation
  async function handleOrderConfirm(orderId, buttonEl) {
    const row = buttonEl.closest('tr');
    const buttons = row ? row.querySelectorAll('button') : [];
    buttons.forEach(b => { b.disabled = true; });

    const prevErr = row ? row.querySelector('.order-inline-error') : null;
    if (prevErr) prevErr.remove();

    try {
      await window.api.confirmOrder(orderId);
      const order = allOrders.find(o => o.id === orderId);
      if (order) order.status = 'confirmed';
      updatePendingSidebarBadge();
      updateOrderRowInTable(orderId, 'confirmed');
      showToast('Order confirmed! Customer notified on Telegram.');
    } catch (err) {
      buttons.forEach(b => { b.disabled = false; });
      if (row) {
        const errSpan = document.createElement('div');
        errSpan.className = 'order-inline-error';
        errSpan.style.cssText = 'color: var(--ember); font-size: 0.75rem; margin-top: 0.35rem;';
        errSpan.textContent = 'Failed: ' + err.message;
        row.querySelector('td:last-child').appendChild(errSpan);
      }
      showToast('Failed to confirm order: ' + err.message, true);
    }
  }

  // Handle order rejection
  async function handleOrderReject(orderId, buttonEl) {
    const confirmed = await openRejectOrderDialog();
    if (!confirmed) return;

    const row = buttonEl.closest('tr');
    const buttons = row ? row.querySelectorAll('button') : [];
    buttons.forEach(b => { b.disabled = true; });

    const prevErr = row ? row.querySelector('.order-inline-error') : null;
    if (prevErr) prevErr.remove();

    try {
      await window.api.rejectOrder(orderId);
      const order = allOrders.find(o => o.id === orderId);
      if (order) order.status = 'rejected';
      updatePendingSidebarBadge();
      updateOrderRowInTable(orderId, 'rejected');
      showToast('Order marked rejected. Customer notified on Telegram.');
    } catch (err) {
      buttons.forEach(b => { b.disabled = false; });
      if (row) {
        const errSpan = document.createElement('div');
        errSpan.className = 'order-inline-error';
        errSpan.style.cssText = 'color: var(--ember); font-size: 0.75rem; margin-top: 0.35rem;';
        errSpan.textContent = 'Failed: ' + err.message;
        row.querySelector('td:last-child').appendChild(errSpan);
      }
      showToast('Failed to reject order: ' + err.message, true);
    }
  }

  // Update a single table row without full table re-render
  function updateOrderRowInTable(orderId, newStatus) {
    const container = document.getElementById('orders-container');
    if (!container) return;
    const confirmBtn = container.querySelector(`[data-order-confirm="${orderId}"]`);
    const rejectBtn = container.querySelector(`[data-order-reject="${orderId}"]`);
    const targetBtn = confirmBtn || rejectBtn;
    if (!targetBtn) {
      renderOrdersTable();
      return;
    }
    const row = targetBtn.closest('tr');
    if (!row) {
      renderOrdersTable();
      return;
    }

    if (currentOrderFilter !== 'all' && currentOrderFilter !== newStatus) {
      row.remove();
      const remainingRows = container.querySelectorAll('tbody tr');
      if (remainingRows.length === 0) {
        renderOrdersTable();
      }
      return;
    }

    const statusTd = row.children[2];
    const actionsTd = row.children[4];
    if (statusTd) {
      const chipClass = newStatus === 'confirmed' ? 'status-confirmed' : 'status-rejected';
      const chipLabel = newStatus === 'confirmed' ? 'Confirmed' : 'Rejected';
      statusTd.innerHTML = `<span class="status-chip ${chipClass}">${chipLabel}</span>`;
    }
    if (actionsTd) {
      actionsTd.innerHTML = '<span class="text-muted" style="font-size: 0.8rem;">Completed</span>';
    }
  }

  // Attach event listeners to confirm and reject buttons
  function attachOrderActionHandlers(container) {
    container.querySelectorAll('[data-order-confirm]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-order-confirm');
        handleOrderConfirm(id, e.currentTarget);
      });
    });

    container.querySelectorAll('[data-order-reject]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-order-reject');
        handleOrderReject(id, e.currentTarget);
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
            <p class="empty-state-text">Add your items so your assistant can answer price and stock questions.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      products.forEach(p => {
        const variantsSummary = (p.variants || [])
          .map(v => `${[v.size, v.colour].filter(x => x && !['standard','default'].includes(x.toLowerCase())).join(' / ') || 'Standard'} (${v.stock} in stock)`)
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
        const category = prompt('Category (e.g. ' + ((window.VARIANT_LABELS && window.VARIANT_LABELS.catEg) || 'Popular items') + '):') || 'General';
        try {
          await window.api.createProduct({
            name,
            price,
            category,
            variants: [{ size: 'Standard', colour: 'Default', stock: 10 }]
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
            <p class="empty-state-text">Teach the assistant your delivery, refund and timing rules so it can answer customers.</p>
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

  // Requirement 7: CSV Upload and Sample Download in Dashboard Products tab
  function initDashboardCsv() {
    const sampleBtn = document.getElementById('btn-dash-download-sample-csv');
    const fileInput = document.getElementById('dash-csv-file-input');
    const statusLabel = document.getElementById('dash-csv-status');
    const feedbackBox = document.getElementById('dash-csv-feedback-box');

    if (sampleBtn) {
      sampleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const sampleText = (window.VARIANT_LABELS && window.VARIANT_LABELS.sampleCsv) || "name,price,category,size,colour,stock\nGift Box,999,Gifts,Small,,10\n";
        const blob = new Blob([sampleText], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auraq_catalog_sample.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        if (!fileInput.files || !fileInput.files[0]) return;
        const file = fileInput.files[0];

        if (statusLabel) statusLabel.textContent = 'Validating & uploading...';
        if (feedbackBox) {
          feedbackBox.style.display = 'none';
          feedbackBox.className = 'alert-box';
        }

        try {
          const result = await window.api.uploadProductsCsv(file);
          const importedProds = result.imported_products ?? result.imported ?? 0;
          const importedVars = result.imported_variants ?? 0;
          const rejected = result.rejected_rows || [];

          let summary = `Imported ${importedProds} products`;
          if (importedVars > 0) summary += ` (${importedVars} variants)`;
          if (rejected.length > 0) summary += ` — ${rejected.length} rows rejected`;

          if (statusLabel) statusLabel.textContent = 'Upload complete';
          showToast(summary);

          if (feedbackBox) {
            let html = `<strong>Import Successful:</strong> ${summary}`;
            if (rejected.length > 0) {
              html += `<ul style="margin-top: 0.5rem; padding-left: 1.25rem; font-size: 0.775rem;">${rejected.map(r => `<li>Row ${r.row}: ${r.reason || 'Invalid format'}</li>`).join('')}</ul>`;
            }
            feedbackBox.innerHTML = html;
            feedbackBox.className = rejected.length > 0 ? 'alert-box alert-error' : 'alert-box alert-success';
            feedbackBox.style.display = 'block';
          }

          loadProducts();
          fileInput.value = '';
        } catch (err) {
          if (statusLabel) statusLabel.textContent = 'Import failed';
          showToast('CSV import failed: ' + err.message, true);
          if (feedbackBox) {
            feedbackBox.textContent = 'CSV import failed: ' + err.message;
            feedbackBox.className = 'alert-box alert-error';
            feedbackBox.style.display = 'block';
          }
          fileInput.value = '';
        }
      });
    }
  }

  // Requirement 9: Live Refresh every 20s using Page Visibility API
  // Does not reload page, reset scroll position, or break open conversations.
  let refreshTimer = null;
  let secondsSinceRefresh = 0;
  let labelTimer = null;

  function updateRefreshLabels(text) {
    document.querySelectorAll('.refresh-indicator').forEach(el => {
      el.textContent = text;
    });
  }

  async function performLiveRefresh() {
    if (document.hidden) return;

    try {
      // 1. Refresh Overview stats silently without page reload
      const stats = await window.api.getDashboardStats();
      if (stats) {
        const elConvos = document.getElementById('stat-convos');
        const elInterest = document.getElementById('stat-interest');
        const elBuy = document.getElementById('stat-buy');
        const elConfirmed = document.getElementById('stat-confirmed');
        if (elConvos) elConvos.textContent = (stats.conversations || 0).toLocaleString();
        if (elInterest) elInterest.textContent = (stats.interested || 0).toLocaleString();
        if (elBuy) elBuy.textContent = (stats.wants_to_buy || 0).toLocaleString();
        if (elConfirmed) elConfirmed.textContent = (stats.confirmed_orders || 0).toLocaleString();
      }

      // 2. Refresh Orders without resetting scroll
      const orders = await window.api.getOrders();
      if (Array.isArray(orders)) {
        allOrders = orders;
        updatePendingSidebarBadge();
        // Only re-render orders table if on orders tab
        if (currentTab === 'orders') {
          renderOrdersTable();
        }
      }

      // 3. Refresh Conversations list without clearing active open thread
      if (currentTab === 'conversations') {
        const convos = await window.api.getConversations();
        const threadsContainer = document.getElementById('convos-threads');
        if (threadsContainer && Array.isArray(convos)) {
          // Identify currently active thread label
          const activeThreadEl = threadsContainer.querySelector('.thread-item.active .thread-name');
          const activeLabel = activeThreadEl ? activeThreadEl.textContent.trim() : null;

          threadsContainer.innerHTML = '';
          convos.forEach(c => {
            const isActive = activeLabel ? (c.customer_label === activeLabel) : false;
            const threadBtn = document.createElement('button');
            threadBtn.className = `thread-item ${isActive ? 'active' : ''}`;
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
        }
      }

      secondsSinceRefresh = 0;
      updateRefreshLabels('Updated just now');
    } catch (e) {
      console.warn('Live refresh error', e);
    }
  }

  function startLiveRefreshPolling() {
    stopLiveRefreshPolling();
    secondsSinceRefresh = 0;
    updateRefreshLabels('Updated just now');

    // 20-second data poll
    refreshTimer = setInterval(() => {
      performLiveRefresh();
    }, 20000);

    // 1-second label counter ("Updated just now" -> "Updated 20s ago")
    labelTimer = setInterval(() => {
      if (document.hidden) return;
      secondsSinceRefresh += 1;
      if (secondsSinceRefresh < 5) {
        updateRefreshLabels('Updated just now');
      } else {
        updateRefreshLabels(`Updated ${secondsSinceRefresh}s ago`);
      }
    }, 1000);
  }

  function stopLiveRefreshPolling() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (labelTimer) {
      clearInterval(labelTimer);
      labelTimer = null;
    }
  }

  // Page Visibility API integration
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLiveRefreshPolling();
    } else {
      performLiveRefresh();
      startLiveRefreshPolling();
    }
  });

  // Initialize on DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    initTabNavigation();
    initOrderFilters();
    initAddProductButton();
    initAddFaqButton();
    initTestChat();
    initSettingsForm();
    initDashboardCsv();

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

    // Start background live polling
    startLiveRefreshPolling();
  });
})();
