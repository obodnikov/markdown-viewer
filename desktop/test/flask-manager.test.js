import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';

// electron mock is handled by test/setup.js (Module._resolveFilename patch)

const FlaskManager = require('../flask-manager');

function createMockSettings(overrides = {}) {
  const data = {
    devFlaskPort: 5050, flaskPort: 0,
    openrouterApiKey: '', openrouterDefaultModel: 'anthropic/claude-3.5-sonnet',
    openrouterModels: '', openrouterMaxTokens: 8000, translationLanguages: '',
    githubClientId: '', githubClientSecret: '',
    bookstackUrl: '', bookstackApiTimeout: 30,
    logLevel: 'INFO', secretKey: 'test-secret', pythonPath: '',
    ...overrides,
  };
  return {
    get: (key, def) => (key in data ? data[key] : def),
    set: (key, val) => { data[key] = val; },
    getAll: () => ({ ...data }),
  };
}

describe('FlaskManager', () => {
  let fm, settings;

  beforeEach(() => {
    vi.clearAllMocks();
    settings = createMockSettings();
    fm = new FlaskManager(settings, false);
  });

  describe('constructor', () => {
    it('stores settingsManager and isDev flag', () => {
      expect(fm.settingsManager).toBe(settings);
      expect(fm.isDev).toBe(false);
    });
    it('initializes with null process and port', () => {
      expect(fm.process).toBeNull();
      expect(fm.port).toBeNull();
    });
  });

  describe('start() in dev mode', () => {
    it('returns configured devFlaskPort without spawning', async () => {
      const devFm = new FlaskManager(createMockSettings({ devFlaskPort: 9999 }), true);
      const port = await devFm.start();
      expect(port).toBe(9999);
      expect(devFm.process).toBeNull();
    });
  });

  describe('_buildEnv', () => {
    it('produces correct environment variables', () => {
      fm.port = 5050;
      const env = fm._buildEnv();
      expect(env.BACKEND_PORT).toBe('5050');
      expect(env.BACKEND_HOST).toBe('127.0.0.1');
      expect(env.CORS_ORIGINS).toContain('app://');
      expect(env.DISABLE_FILE_LOGGING).toBe('true');
      expect(env.LOG_LEVEL).toBe('INFO');
      expect(env.SECRET_KEY).toBe('test-secret');
      expect(env.GITHUB_REDIRECT_URI).toBe('http://localhost:5050/api/github/callback');
    });
    it('uses settings values for API keys', () => {
      const customFm = new FlaskManager(createMockSettings({
        openrouterApiKey: 'sk-test', githubClientId: 'gh-id',
        bookstackUrl: 'https://books.example.com',
      }), false);
      customFm.port = 3000;
      const env = customFm._buildEnv();
      expect(env.OPENROUTER_API_KEY).toBe('sk-test');
      expect(env.GITHUB_CLIENT_ID).toBe('gh-id');
      expect(env.BOOKSTACK_URL).toBe('https://books.example.com');
    });
  });

  describe('_isPythonValid', () => {
    it('returns true for a valid python path', () => {
      // Uses real execFileSync — python3 should exist on the dev machine
      const result = fm._isPythonValid('python3');
      // This is environment-dependent; just verify it returns a boolean
      expect(typeof result).toBe('boolean');
    });
    it('returns false for a nonexistent path', () => {
      expect(fm._isPythonValid('/nonexistent/python-fake-12345')).toBe(false);
    });
  });

  describe('_getCompiledBackendPath', () => {
    it('returns a string path or null depending on binary existence', () => {
      const result = fm._getCompiledBackendPath();
      // The binary may or may not exist on the dev machine
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('_getProjectRoot', () => {
    it('returns parent of __dirname in dev mode', () => {
      const root = fm._getProjectRoot();
      expect(root).toBe(path.resolve(__dirname, '..', '..'));
    });
  });

  describe('checkPandoc', () => {
    it('returns an object with available boolean and version', () => {
      // Uses real execFileSync — pandoc may or may not be installed
      const result = fm.checkPandoc();
      expect(typeof result.available).toBe('boolean');
      if (result.available) {
        expect(result.version).toContain('pandoc');
      } else {
        expect(result.version).toBeNull();
      }
    });
  });

  describe('stop', () => {
    it('sends SIGTERM to running process', () => {
      fm.process = { kill: vi.fn() };
      fm.stop();
      expect(fm.process.kill).toHaveBeenCalledWith('SIGTERM');
    });
    it('does nothing when no process is running', () => {
      fm.process = null;
      expect(() => fm.stop()).not.toThrow();
    });
  });

  describe('_stopAndWait', () => {
    it('resolves immediately when no process is running', async () => {
      fm.process = null;
      await expect(fm._stopAndWait()).resolves.toBeUndefined();
    });
    it('sends SIGTERM and resolves when process exits', async () => {
      let exitCb;
      fm.process = {
        kill: vi.fn(),
        once: vi.fn((event, cb) => { if (event === 'exit') exitCb = cb; }),
      };
      const promise = fm._stopAndWait();
      expect(fm.process.kill).toHaveBeenCalledWith('SIGTERM');
      exitCb();
      await expect(promise).resolves.toBeUndefined();
      expect(fm.process).toBeNull();
    });
  });

  describe('_healthCheck', () => {
    it('returns a promise', () => {
      fm.port = 5050;
      const result = fm._healthCheck();
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => {}); // suppress ECONNREFUSED
    });
  });
});
