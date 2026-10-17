/**
 * Auraq — Client Configuration
 * Single source of truth for mock mode switch, empty state debugging, and localization.
 */

const CONFIG = {
  // Single source for mock switch: flip to false to connect to live FastAPI backend
  USE_MOCK: false,

  // When USE_MOCK is true and MOCK_EMPTY is true, lists return [] and stats return 0
  MOCK_EMPTY: false,

  // Currency symbol and formatting
  CURRENCY: '₹',

  API_BASE_URL: '/api',
  STORAGE_TOKEN_KEY: 'token',
  STORAGE_BUSINESS_KEY: 'auraq_business_data',
  DEMO_STORE_NAME: 'ATELIER NOIR'
};

// Formats a numeric price with Indian digit grouping: 1499 -> ₹1,499
const indianCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0
});

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `${CONFIG.CURRENCY}${indianCurrencyFormatter.format(num)}`;
}

// Keep window.USE_MOCK dynamically in sync with CONFIG.USE_MOCK
Object.defineProperty(window, 'USE_MOCK', {
  get() {
    return CONFIG.USE_MOCK;
  },
  set(val) {
    CONFIG.USE_MOCK = Boolean(val);
  },
  configurable: true
});

window.CONFIG = CONFIG;
window.formatCurrency = formatCurrency;
