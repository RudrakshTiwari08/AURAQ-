/**
 * Auraq — API Client
 * Provides complete interface for authentication, products, orders, FAQs,
 * dashboard metrics, and Telegram bot linking.
 * Operates either against realistic in-memory mock store or live FastAPI /api endpoints.
 */

(function () {
  'use strict';

  // Helper to check single source of truth for mock mode
  function isMockMode() {
    return Boolean(window.CONFIG && window.CONFIG.USE_MOCK);
  }

  function isMockEmpty() {
    return isMockMode() && Boolean(window.CONFIG && window.CONFIG.MOCK_EMPTY);
  }

  // In-memory mock database initialized with realistic Indian pricing
  const mockStorageKey = 'auraq_mock_db_v2';

  function initMockStore() {
    const saved = localStorage.getItem(mockStorageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback if parse fails
      }
    }

    const defaultStore = {
      business: {
        id: 'biz_01',
        name: 'ATELIER NOIR',
        type: 'Clothing',
        description: 'Independent nocturnal garment house crafting heavyweight staples and raw denim in limited numbered runs.',
        hours: 'Tuesday – Sunday, 11:00 – 20:00 IST',
        city: 'Mumbai',
        contact: '@ateliernoir_mumbai',
        telegram_link: 'https://t.me/auraq_sales_bot?start=ateliernoir'
      },
      products: [
        {
          id: 'prod_1',
          name: 'Heavyweight Boxy Tee',
          price: 899,
          category: 'T-Shirts',
          variants: [
            { size: 'S', colour: 'Noir', stock: 14 },
            { size: 'M', colour: 'Noir', stock: 8 },
            { size: 'L', colour: 'Noir', stock: 22 },
            { size: 'M', colour: 'Oxblood', stock: 5 }
          ]
        },
        {
          id: 'prod_2',
          name: 'Raw Selvedge Denim',
          price: 2499,
          category: 'Jeans',
          variants: [
            { size: '30', colour: 'Indigo', stock: 12 },
            { size: '32', colour: 'Indigo', stock: 7 },
            { size: '34', colour: 'Indigo', stock: 4 }
          ]
        },
        {
          id: 'prod_3',
          name: 'Overdyed Crimson Hoodie',
          price: 1899,
          category: 'Hoodies',
          variants: [
            { size: 'S', colour: 'Crimson', stock: 9 },
            { size: 'M', colour: 'Crimson', stock: 0 },
            { size: 'L', colour: 'Crimson', stock: 15 },
            { size: 'XL', colour: 'Crimson', stock: 6 }
          ]
        },
        {
          id: 'prod_4',
          name: 'Waxed Combat Boot',
          price: 2999,
          category: 'Shoes',
          variants: [
            { size: '41', colour: 'Black', stock: 6 },
            { size: '42', colour: 'Black', stock: 3 },
            { size: '43', colour: 'Black', stock: 10 }
          ]
        }
      ],
      faqs: [
        {
          id: 'faq_1',
          question: 'What is your shipping window for online drops?',
          answer: 'All orders ship via insured express courier within 24 to 48 hours of owner confirmation. Tracking is dispatched directly to your Telegram handle.'
        },
        {
          id: 'faq_2',
          question: 'How do your tees and hoodies fit?',
          answer: 'Our cuts feature a relaxed, structured drop-shoulder silhouette. If you prefer a traditional slim cut, size down by one.'
        },
        {
          id: 'faq_3',
          question: 'Can I exchange or return an item if the size is incorrect?',
          answer: 'Yes. We accept exchanges within 14 days of delivery as long as garments remain unworn with original tags attached.'
        },
        {
          id: 'faq_4',
          question: 'Where can I see items in person?',
          answer: 'Our flagship studio is located in Colaba, Mumbai. Open Tuesday to Sunday, 11:00 to 20:00.'
        }
      ],
      orders: [
        {
          id: 'ord_101',
          customer_name: 'Elena Rostova',
          contact: '@elena_rostova',
          product: 'Overdyed Crimson Hoodie',
          size: 'L',
          colour: 'Crimson',
          quantity: 1,
          status: 'pending',
          created_at: '2026-10-11 11:42'
        },
        {
          id: 'ord_102',
          customer_name: 'Marcus Vance',
          contact: '@marcusvance',
          product: 'Raw Selvedge Denim',
          size: '32',
          colour: 'Indigo',
          quantity: 1,
          status: 'pending',
          created_at: '2026-10-11 10:15'
        },
        {
          id: 'ord_103',
          customer_name: 'Camille Laurent',
          contact: '@camille_l',
          product: 'Heavyweight Boxy Tee',
          size: 'M',
          colour: 'Noir',
          quantity: 2,
          status: 'confirmed',
          created_at: '2026-10-10 18:30'
        },
        {
          id: 'ord_104',
          customer_name: 'David K.',
          contact: '@david_k_77',
          product: 'Waxed Combat Boot',
          size: '42',
          colour: 'Black',
          quantity: 1,
          status: 'rejected',
          created_at: '2026-10-10 14:10'
        },
        {
          id: 'ord_105',
          customer_name: 'Aria Chen',
          contact: '@ariachen',
          product: 'Heavyweight Boxy Tee',
          size: 'S',
          colour: 'Oxblood',
          quantity: 1,
          status: 'confirmed',
          created_at: '2026-10-09 21:05'
        }
      ],
      conversations: [
        {
          id: 'conv_1',
          customer_label: 'Elena Rostova (@elena_rostova)',
          escalated: true,
          last_message_at: '11:42 AM',
          messages: [
            { role: 'customer', text: 'Hi! Do you have the Crimson Hoodie in Large in stock?', time: '11:40 AM' },
            { role: 'assistant', text: 'Yes, 15 pieces in Large Crimson are available right now at ₹1,899. Would you like me to register an order request for you?', time: '11:40 AM' },
            { role: 'customer', text: 'Yes please, 1 Large Crimson to Mumbai. Can you hold it?', time: '11:41 AM' },
            { role: 'assistant', text: 'Order request submitted to the owner! You will receive confirmation and payment coordinates as soon as they review it.', time: '11:42 AM' }
          ]
        },
        {
          id: 'conv_2',
          customer_label: 'Marcus Vance (@marcusvance)',
          escalated: false,
          last_message_at: '10:15 AM',
          messages: [
            { role: 'customer', text: 'Are the Raw Selvedge jeans stiff or pre-washed?', time: '10:13 AM' },
            { role: 'assistant', text: 'They are unwashed 14oz Japanese raw denim. They break in and fade uniquely based on how you move in them.', time: '10:14 AM' },
            { role: 'customer', text: 'Awesome. Put me down for a size 32 in Indigo.', time: '10:15 AM' },
            { role: 'assistant', text: 'Order request submitted! Waiting for the owner to confirm your pair.', time: '10:15 AM' }
          ]
        },
        {
          id: 'conv_3',
          customer_label: 'Guest #4892',
          escalated: false,
          last_message_at: '09:05 AM',
          messages: [
            { role: 'customer', text: 'What time does the studio open today?', time: '09:04 AM' },
            { role: 'assistant', text: 'The showroom is open today from 11:00 AM to 8:00 PM in Colaba, Mumbai.', time: '09:05 AM' }
          ]
        }
      ]
    };

    localStorage.setItem(mockStorageKey, JSON.stringify(defaultStore));
    return defaultStore;
  }

  let mockDb = initMockStore();

  function saveMockStore() {
    try {
      localStorage.setItem(mockStorageKey, JSON.stringify(mockDb));
    } catch (e) {
      console.warn('Failed to save mock DB', e);
    }
  }

  // Artificial delay helper for realistic UI state transitions
  function delay(ms = 240) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Live HTTP request dispatcher with FastAPI-compatible error extraction
  async function request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = Object.assign({}, options.headers || {});

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response;
    try {
      response = await fetch(endpoint, {
        ...options,
        headers
      });
    } catch (networkErr) {
      // Requirement 3: Network failure handling
      throw new Error("Can't reach the server. Check your connection.");
    }

    // Requirement 3: 401 handling
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      throw new Error('Session expired. Redirecting to login.');
    }

    if (!response.ok) {
      let errMessage = '';
      try {
        const errorJson = await response.json();
        // Priority order specified in Requirement 3:
        // 1. detail (string)
        // 2. detail[0].msg (array validation errors HTTP 422)
        // 3. error
        // 4. message
        if (typeof errorJson.detail === 'string') {
          errMessage = errorJson.detail;
        } else if (Array.isArray(errorJson.detail) && errorJson.detail.length > 0 && errorJson.detail[0]?.msg) {
          errMessage = errorJson.detail[0].msg;
        } else if (errorJson.error) {
          errMessage = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
        } else if (errorJson.message) {
          errMessage = typeof errorJson.message === 'string' ? errorJson.message : JSON.stringify(errorJson.message);
        }
      } catch (_) {}

      if (!errMessage) {
        errMessage = `Request failed with status ${response.status}`;
      }

      throw new Error(errMessage);
    }

    return response.json();
  }

  // API Client Object definition
  const api = {
    // POST /api/auth/signup
    async signup(payload) {
      if (isMockMode()) {
        await delay(350);
        if (!payload.email || !payload.password || !payload.business_name) {
          throw new Error('Please fill in all required fields.');
        }
        const fakeToken = 'mock_jwt_token_' + Date.now();
        localStorage.setItem('token', fakeToken);
        mockDb.business.name = payload.business_name;
        mockDb.business.type = payload.business_type || 'Clothing';
        saveMockStore();
        return { token: fakeToken };
      }
      const data = await request('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (data && data.token) {
        localStorage.setItem('token', data.token);
      }
      return data;
    },

    // POST /api/auth/login
    async login(payload) {
      if (isMockMode()) {
        await delay(300);
        if (!payload.email || !payload.password) {
          throw new Error('Email and password are required.');
        }
        const fakeToken = 'mock_jwt_token_' + Date.now();
        localStorage.setItem('token', fakeToken);
        return { token: fakeToken };
      }
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (data && data.token) {
        localStorage.setItem('token', data.token);
      }
      return data;
    },

    // GET /api/business
    async getBusiness() {
      if (isMockMode()) {
        await delay(180);
        if (isMockEmpty()) {
          return {
            id: 'biz_01',
            name: '',
            type: 'Clothing',
            description: '',
            hours: '',
            city: '',
            contact: '',
            telegram_link: ''
          };
        }
        return JSON.parse(JSON.stringify(mockDb.business));
      }
      return request('/api/business');
    },

    // PUT /api/business
    async updateBusiness(payload) {
      if (isMockMode()) {
        await delay(250);
        Object.assign(mockDb.business, payload);
        saveMockStore();
        return JSON.parse(JSON.stringify(mockDb.business));
      }
      return request('/api/business', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },

    // GET /api/products
    async getProducts() {
      if (isMockMode()) {
        await delay(200);
        if (isMockEmpty()) {
          return [];
        }
        return JSON.parse(JSON.stringify(mockDb.products));
      }
      return request('/api/products');
    },

    // POST /api/products
    async createProduct(payload) {
      if (isMockMode()) {
        await delay(250);
        const newProduct = {
          id: 'prod_' + Date.now(),
          name: payload.name,
          price: Number(payload.price) || 0,
          category: payload.category || 'General',
          variants: payload.variants || []
        };
        mockDb.products.unshift(newProduct);
        saveMockStore();
        return newProduct;
      }
      return request('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    // PUT /api/products/{id}
    async updateProduct(id, payload) {
      if (isMockMode()) {
        await delay(200);
        const index = mockDb.products.findIndex(p => p.id === id);
        if (index === -1) throw new Error('Product not found.');
        mockDb.products[index] = { ...mockDb.products[index], ...payload };
        saveMockStore();
        return mockDb.products[index];
      }
      return request(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },

    // DELETE /api/products/{id}
    async deleteProduct(id) {
      if (isMockMode()) {
        await delay(200);
        mockDb.products = mockDb.products.filter(p => p.id !== id);
        saveMockStore();
        return { success: true };
      }
      return request(`/api/products/${id}`, {
        method: 'DELETE'
      });
    },

    // POST /api/products/upload (multipart field "file", a CSV)
    async uploadProductsCsv(file) {
      // Validate headers on client first before sending (Requirement 7)
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 1) {
        throw new Error('The selected CSV file is empty.');
      }

      const expectedHeaders = ['name', 'price', 'category', 'size', 'colour', 'stock'];
      const firstLineHeaders = lines[0].toLowerCase().split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      const hasValidHeaders = expectedHeaders.every((h, idx) => firstLineHeaders[idx] === h);

      if (!hasValidHeaders) {
        throw new Error('Invalid CSV headers. Required headers: name,price,category,size,colour,stock');
      }

      if (isMockMode()) {
        await delay(450);
        const productNames = new Set();
        let variantCount = 0;
        const rejected = [];

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
          if (parts.length >= 6 && parts[0] && !isNaN(Number(parts[1])) && Number(parts[1]) >= 0) {
            const name = parts[0];
            const price = parseFloat(parts[1]) || 0;
            const category = parts[2] || 'Imported';
            const size = parts[3] || 'Standard';
            const colour = parts[4] || 'Default';
            const stock = parseInt(parts[5], 10) || 0;

            const existing = mockDb.products.find(p => p.name.toLowerCase() === name.toLowerCase());
            if (existing) {
              existing.variants.push({ size, colour, stock });
            } else {
              mockDb.products.push({
                id: 'prod_' + (Date.now() + i),
                name,
                price,
                category,
                variants: [{ size, colour, stock }]
              });
            }
            productNames.add(name);
            variantCount++;
          } else {
            rejected.push({ row: i + 1, content: lines[i], reason: 'Invalid or missing fields' });
          }
        }
        saveMockStore();
        return {
          imported_products: productNames.size,
          imported_variants: variantCount,
          rejected_rows: rejected
        };
      }

      const formData = new FormData();
      formData.append('file', file);
      return request('/api/products/upload', {
        method: 'POST',
        body: formData
      });
    },

    // GET /api/faqs
    async getFaqs() {
      if (isMockMode()) {
        await delay(180);
        if (isMockEmpty()) {
          return [];
        }
        return JSON.parse(JSON.stringify(mockDb.faqs));
      }
      return request('/api/faqs');
    },

    // POST /api/faqs
    async createFaq(payload) {
      if (isMockMode()) {
        await delay(200);
        const newFaq = {
          id: 'faq_' + Date.now(),
          question: payload.question,
          answer: payload.answer
        };
        mockDb.faqs.push(newFaq);
        saveMockStore();
        return newFaq;
      }
      return request('/api/faqs', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    // DELETE /api/faqs/{id}
    async deleteFaq(id) {
      if (isMockMode()) {
        await delay(180);
        mockDb.faqs = mockDb.faqs.filter(f => f.id !== id);
        saveMockStore();
        return { success: true };
      }
      return request(`/api/faqs/${id}`, {
        method: 'DELETE'
      });
    },

    // POST /api/faqs/generate {text} -> [{question, answer}]
    async generateFaqs(text) {
      if (isMockMode()) {
        await delay(600);
        const generated = [
          {
            question: 'What are your operational hours?',
            answer: 'We operate Tuesday through Sunday from 11:00 to 20:00 IST.'
          },
          {
            question: 'How do you handle orders and reservations?',
            answer: 'Requests are received on Telegram and reserved once directly approved by the boutique owner.'
          },
          {
            question: 'Where can customers pick up orders?',
            answer: 'Directly at our studio in Colaba, Mumbai, or via insured express courier delivery.'
          }
        ];
        generated.forEach(item => {
          mockDb.faqs.push({
            id: 'faq_' + Math.random().toString(36).substring(2, 9),
            ...item
          });
        });
        saveMockStore();
        return generated;
      }
      return request('/api/faqs/generate', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
    },

    // GET /api/dashboard/stats
    async getDashboardStats() {
      if (isMockMode()) {
        await delay(220);
        if (isMockEmpty()) {
          return {
            conversations: 0,
            interested: 0,
            wants_to_buy: 0,
            confirmed_orders: 0,
            daily: [],
            top_products: []
          };
        }
        const dates = [
          'Sep 28', 'Sep 29', 'Sep 30', 'Oct 01', 'Oct 02', 'Oct 03', 'Oct 04',
          'Oct 05', 'Oct 06', 'Oct 07', 'Oct 08', 'Oct 09', 'Oct 10', 'Oct 11'
        ];
        const dailyCounts = [14, 18, 22, 19, 26, 31, 28, 35, 42, 38, 45, 52, 49, 58];
        const daily = dates.map((d, i) => ({ date: d, conversations: dailyCounts[i] }));
        const confirmedCount = mockDb.orders.filter(o => o.status === 'confirmed').length;

        return {
          conversations: 348,
          interested: 215,
          wants_to_buy: 92,
          confirmed_orders: 68 + confirmedCount,
          daily,
          top_products: [
            { name: 'Heavyweight Boxy Tee', count: 114 },
            { name: 'Overdyed Crimson Hoodie', count: 89 },
            { name: 'Raw Selvedge Denim', count: 62 },
            { name: 'Waxed Combat Boot', count: 35 }
          ]
        };
      }
      return request('/api/dashboard/stats');
    },

    // GET /api/orders
    async getOrders() {
      if (isMockMode()) {
        await delay(200);
        if (isMockEmpty()) {
          return [];
        }
        return JSON.parse(JSON.stringify(mockDb.orders));
      }
      return request('/api/orders');
    },

    // POST /api/orders/{id}/confirm
    async confirmOrder(id) {
      if (isMockMode()) {
        await delay(220);
        const order = mockDb.orders.find(o => o.id === id);
        if (!order) throw new Error('Order not found.');
        order.status = 'confirmed';
        saveMockStore();
        return { success: true, order };
      }
      return request(`/api/orders/${id}/confirm`, {
        method: 'POST'
      });
    },

    // POST /api/orders/{id}/reject
    async rejectOrder(id) {
      if (isMockMode()) {
        await delay(220);
        const order = mockDb.orders.find(o => o.id === id);
        if (!order) throw new Error('Order not found.');
        order.status = 'rejected';
        saveMockStore();
        return { success: true, order };
      }
      return request(`/api/orders/${id}/reject`, {
        method: 'POST'
      });
    },

    // GET /api/conversations
    async getConversations() {
      if (isMockMode()) {
        await delay(200);
        if (isMockEmpty()) {
          return [];
        }
        return JSON.parse(JSON.stringify(mockDb.conversations));
      }
      return request('/api/conversations');
    },

    // POST /api/test-chat {message} -> {reply}
    async testChat(message) {
      if (isMockMode()) {
        await delay(400);
        const lower = (message || '').toLowerCase();
        let reply = '';

        if (lower.includes('hoodie') || lower.includes('crimson')) {
          reply = 'The Overdyed Crimson Hoodie is priced at ₹1,899. We currently have stock in S, L, and XL (Medium is currently sold out). Would you like to reserve one?';
        } else if (lower.includes('size') || lower.includes('fit')) {
          reply = 'Our garments feature a structured, oversized drop-shoulder cut. If you want a closer fit, we recommend sizing down one step.';
        } else if (lower.includes('order') || lower.includes('buy') || lower.includes('take it') || lower.includes('reserve')) {
          reply = 'I have registered your order request. It is logged in the merchant console and held for the boutique owner’s confirmation.';
        } else if (lower.includes('hours') || lower.includes('open') || lower.includes('location')) {
          reply = 'We are open Tuesday through Sunday, 11:00 – 20:00 IST in Colaba, Mumbai.';
        } else {
          reply = `Welcome to ${mockDb.business.name}. I can check real-time stock across sizes and colours, provide studio hours, or register an order request directly for owner review. How can I help you today?`;
        }

        return { reply };
      }
      return request('/api/test-chat', {
        method: 'POST',
        body: JSON.stringify({ message })
      });
    },

    // GET /api/telegram/connect-link
    async getTelegramConnectLink() {
      if (isMockMode()) {
        await delay(180);
        return { link: 'https://t.me/auraq_alerts_bot?start=auth_token_99214' };
      }
      return request('/api/telegram/connect-link');
    }
  };

  // Expose api object globally for vanilla JS consumption
  window.api = api;
})();
