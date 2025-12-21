/**
 * Test setup for Vitest
 */

// Mock localStorage
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

// Mock fetch for API calls with security guard
// This prevents external API calls while allowing localhost for testing
const originalFetch = global.fetch;
global.fetch = vi.fn((url, options) => {
  const urlString = typeof url === 'string' ? url : url?.toString() || '';

  // Allow relative API URLs (e.g., /api/health)
  if (urlString.startsWith('/api') || urlString.startsWith('/')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      blob: async () => new Blob(),
      arrayBuffer: async () => new ArrayBuffer(0),
      headers: new Headers(),
    });
  }

  // Allow localhost and 127.0.0.1 for local testing
  if (urlString.startsWith('http://localhost') ||
      urlString.startsWith('https://localhost') ||
      urlString.startsWith('http://127.0.0.1') ||
      urlString.startsWith('https://127.0.0.1')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      blob: async () => new Blob(),
    });
  }

  // Block ONLY external API calls (OpenRouter, GitHub API, BookStack, etc.)
  if (urlString.includes('openrouter.ai') ||
      urlString.includes('api.github.com') ||
      urlString.includes('github.com/api') ||
      urlString.match(/bookstack.*\/api/) ||
      // Block other external HTTPS/HTTP (but not localhost)
      (urlString.startsWith('http://') && !urlString.startsWith('http://localhost') && !urlString.startsWith('http://127.0.0.1')) ||
      (urlString.startsWith('https://') && !urlString.startsWith('https://localhost') && !urlString.startsWith('https://127.0.0.1'))) {
    throw new Error(
      `❌ BLOCKED: Attempted external API request to ${urlString}. ` +
      `Tests must not call external APIs (OpenRouter, GitHub, BookStack, etc.). ` +
      `Use mocks instead. Localhost is allowed.`
    );
  }

  // Default mock response for any other requests
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
  });
});

// Mock File System Access API
global.showOpenFilePicker = vi.fn();
global.showSaveFilePicker = vi.fn();

// Mock window.matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// MSW-style API mocking setup
// Define mock handlers for all external API endpoints
export const mockApiHandlers = {
  // OpenRouter API mocks
  openrouter: {
    transform: (response = { result: 'Mocked transformation' }) => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/llm/transform')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => response,
          });
        }
        return Promise.reject(new Error('Unmocked endpoint'));
      });
    },
    customPrompt: (response = { result: 'Mocked custom result' }) => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/llm/custom-prompt')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => response,
          });
        }
        return Promise.reject(new Error('Unmocked endpoint'));
      });
    },
  },

  // GitHub API mocks
  github: {
    user: (response = { login: 'testuser', name: 'Test User' }) => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/github/user')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => response,
          });
        }
        return Promise.reject(new Error('Unmocked endpoint'));
      });
    },
    repos: (response = { repos: [] }) => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/github/repos')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => response,
          });
        }
        return Promise.reject(new Error('Unmocked endpoint'));
      });
    },
  },

  // BookStack API mocks
  bookstack: {
    authenticate: (response = { authenticated: true }) => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/bookstack/authenticate')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => response,
          });
        }
        return Promise.reject(new Error('Unmocked endpoint'));
      });
    },
    pages: (response = { data: [] }) => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/bookstack/pages')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => response,
          });
        }
        return Promise.reject(new Error('Unmocked endpoint'));
      });
    },
  },

  // Export API mocks
  export: {
    html: (response = { html: '<h1>Test</h1>' }) => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/export/html')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => response,
          });
        }
        return Promise.reject(new Error('Unmocked endpoint'));
      });
    },
    pdf: (response = new Blob(['%PDF'], { type: 'application/pdf' })) => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/export/pdf')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            blob: async () => response,
          });
        }
        return Promise.reject(new Error('Unmocked endpoint'));
      });
    },
  },

  // Reset all mocks
  reset: () => {
    global.fetch.mockReset();
  },
};

// Verify no real network requests are made
// This runs after each test
if (typeof afterEach !== 'undefined') {
  afterEach(() => {
    // Check if any unmocked external URLs were called
    const calls = global.fetch.mock.calls || [];
    const externalCalls = calls.filter(([url]) => {
      return typeof url === 'string' && (
        url.startsWith('http://') ||
        url.startsWith('https://')
      ) && !url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1');
    });

    if (externalCalls.length > 0) {
      console.error('❌ Real network requests detected:', externalCalls);
      throw new Error('Tests made real network requests. All external APIs must be mocked.');
    }
  });
}
