/**
 * Auraq — Client Configuration
 * Controls mock mode switch and global application constants.
 */

// Global mock flag: when true, api.js uses simulated in-memory store with realistic delays
const USE_MOCK = true;

// API configuration
const CONFIG = {
  USE_MOCK: true,
  API_BASE_URL: '/api',
  STORAGE_TOKEN_KEY: 'token',
  STORAGE_BUSINESS_KEY: 'auraq_business_data',
  TELEGRAM_BOT_HANDLE: 'auraq_sales_bot',
  DEMO_STORE_NAME: 'ATELIER NOIR'
};

// Expose configuration globally on window for vanilla JS scripts
window.USE_MOCK = USE_MOCK;
window.CONFIG = CONFIG;
