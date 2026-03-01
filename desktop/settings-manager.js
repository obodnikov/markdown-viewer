// desktop/settings-manager.js — Persistent settings storage
const Store = require('electron-store');

const schema = {
  // Python configuration
  pythonPath: { type: 'string', default: '' },  // Empty = auto-detect
  pandocPath: { type: 'string', default: '' },  // Empty = auto-detect

  // OpenRouter
  openrouterApiKey: { type: 'string', default: '' },
  openrouterDefaultModel: { type: 'string', default: 'anthropic/claude-3.5-sonnet' },
  openrouterModels: { type: 'string', default:
    'anthropic/claude-3.5-sonnet,anthropic/claude-3-opus,anthropic/claude-3-haiku,' +
    'openai/gpt-4-turbo,openai/gpt-4,openai/gpt-3.5-turbo,' +
    'google/gemini-pro,meta-llama/llama-3-70b-instruct'
  },
  openrouterMaxTokens: { type: 'number', default: 8000 },

  // Translation
  translationLanguages: { type: 'string', default:
    'Spanish,French,German,Italian,Portuguese,Russian,Chinese,' +
    'Japanese,Korean,Arabic,Hindi,Dutch,Swedish,Turkish,Polish'
  },

  // GitHub OAuth
  githubClientId: { type: 'string', default: '' },
  githubClientSecret: { type: 'string', default: '' },

  // BookStack
  bookstackUrl: { type: 'string', default: '' },
  bookstackApiTimeout: { type: 'number', default: 30 },

  // App
  logLevel: { type: 'string', default: 'INFO' },
  secretKey: { type: 'string', default: '' },
  devFlaskPort: { type: 'number', default: 5050 },
  flaskPort: { type: 'number', default: 0 },  // 0 = auto-detect free port

  // Window state
  windowWidth: { type: 'number', default: 1400 },
  windowHeight: { type: 'number', default: 900 },
  windowX: { type: 'number' },
  windowY: { type: 'number' },
  windowMaximized: { type: 'boolean', default: false },

  // Recent files
  recentFiles: {
    type: 'array',
    default: [],
    items: { type: 'string' }
  }
};

class SettingsManager {
  constructor() {
    this.store = new Store({
      name: 'markdown-viewer-settings',
      schema,
      encryptionKey: 'markdown-viewer-desktop-v2'
    });

    // Generate a random secret key on first run
    if (!this.store.get('secretKey')) {
      const crypto = require('crypto');
      this.store.set('secretKey', crypto.randomBytes(32).toString('hex'));
    }
  }

  get(key, defaultValue) {
    return this.store.get(key, defaultValue);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  getAll() {
    return this.store.store;
  }

  setAll(settings) {
    for (const [key, value] of Object.entries(settings)) {
      if (key in schema) {
        this.store.set(key, value);
      }
    }
  }

  isConfigured() {
    return !!this.store.get('openrouterApiKey');
  }
}

module.exports = SettingsManager;
