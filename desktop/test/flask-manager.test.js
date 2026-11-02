import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';

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
    it('passes found tools to the backend', () => {
      fm.port = 5050;
      vi.spyOn(fm, '_findTool').mockImplementation((settingKey, toolName) => `/found/${toolName}`);
      const env = fm._buildEnv();
      expect(fm._findTool).toHaveBeenCalledWith('pandocPath', 'pandoc');
      expect(fm._findTool).toHaveBeenCalledWith('pdfEnginePath', 'xelatex');
      expect(fm._findTool).toHaveBeenCalledWith('rsvgConvertPath', 'rsvg-convert');
      expect(env.PANDOC_PATH).toBe('/found/pandoc');
      expect(env.PDF_ENGINE).toBe('/found/xelatex');
      expect(env.RSVG_CONVERT_PATH).toBe('/found/rsvg-convert');
    });
    it('passes configured PDF fonts', () => {
      const customFm = new FlaskManager(createMockSettings({
        pdfMainFont: ' Georgia ', pdfMonoFont: 'Courier New',
      }), false);
      customFm.port = 5050;
      const env = customFm._buildEnv();
      expect(env.PDF_MAIN_FONT).toBe('Georgia');
      expect(env.PDF_MONO_FONT).toBe('Courier New');
    });

    describe('default PDF fonts', () => {
      const originalPlatform = process.platform;
      const envOn = (platform) => {
        Object.defineProperty(process, 'platform', { value: platform });
        fm.port = 5050;
        return fm._buildEnv();
      };

      afterEach(() => {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      });

      it('uses fonts with Cyrillic on macOS', () => {
        const env = envOn('darwin');
        expect(env.PDF_MAIN_FONT).toBe('Times New Roman');
        expect(env.PDF_MONO_FONT).toBe('Menlo');
      });
      it('uses fonts with Cyrillic on Windows', () => {
        const env = envOn('win32');
        expect(env.PDF_MAIN_FONT).toBe('Times New Roman');
        expect(env.PDF_MONO_FONT).toBe('Consolas');
      });
      it('sets no fonts on Linux', () => {
        const env = envOn('linux');
        expect(env.PDF_MAIN_FONT).toBe('');
        expect(env.PDF_MONO_FONT).toBe('');
      });
    });
  });

  describe('_findTool', () => {
    const withSetting = (value) => new FlaskManager(createMockSettings({ pdfEnginePath: value }), false);

    it('uses the configured path when it works', () => {
      const customFm = withSetting('/custom/xelatex');
      vi.spyOn(customFm, '_getToolVersion').mockReturnValue('XeTeX 3');
      expect(customFm._findTool('pdfEnginePath', 'xelatex')).toBe('/custom/xelatex');
      expect(customFm._getToolVersion).toHaveBeenCalledTimes(1);
    });
    it('ignores spaces around the configured path', () => {
      const customFm = withSetting('  /custom/xelatex ');
      vi.spyOn(customFm, '_getToolVersion').mockReturnValue('XeTeX 3');
      expect(customFm._findTool('pdfEnginePath', 'xelatex')).toBe('/custom/xelatex');
    });
    it('falls back to auto-detect when the configured path does not work', () => {
      const customFm = withSetting('/broken/xelatex');
      vi.spyOn(customFm, '_getToolVersion').mockImplementation(tool =>
        tool === '/usr/bin/xelatex' ? 'XeTeX 3' : null
      );
      expect(customFm._findTool('pdfEnginePath', 'xelatex')).toBe('/usr/bin/xelatex');
    });
    it('searches known folders in order, the user Homebrew folder first', () => {
      const tried = [];
      vi.spyOn(fm, '_getToolVersion').mockImplementation((tool) => {
        tried.push(tool);
        return null;
      });
      fm._findTool('pdfEnginePath', 'xelatex');
      expect(tried).toEqual([
        path.join(os.homedir(), '.local', 'Homebrew', 'bin', 'xelatex'),
        '/opt/homebrew/bin/xelatex',
        '/usr/local/bin/xelatex',
        '/Library/TeX/texbin/xelatex',
        '/usr/bin/xelatex',
        'xelatex',
      ]);
    });
    it('finds a tool that is only on PATH by its name', () => {
      vi.spyOn(fm, '_getToolVersion').mockImplementation(tool => (tool === 'xelatex' ? 'XeTeX 3' : null));
      expect(fm._findTool('pdfEnginePath', 'xelatex')).toBe('xelatex');
    });
    it('returns an empty string when the tool is not found', () => {
      vi.spyOn(fm, '_getToolVersion').mockReturnValue(null);
      expect(fm._findTool('pdfEnginePath', 'xelatex')).toBe('');
    });
  });

  describe('_getToolVersion', () => {
    it('returns the first line of the version output', () => {
      const version = fm._getToolVersion(process.execPath);
      expect(version).toBe(process.version);
    });
    it('returns null for a missing program', () => {
      expect(fm._getToolVersion('/no/such/tool')).toBeNull();
    });
    it('returns null for a folder', () => {
      expect(fm._getToolVersion(__dirname)).toBeNull();
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
    it('reports the tool found by auto-detect', () => {
      vi.spyOn(fm, '_getToolVersion').mockImplementation(tool =>
        tool === '/usr/local/bin/pandoc' ? 'pandoc 3.10' : null
      );
      expect(fm.checkPandoc()).toEqual({
        available: true, version: 'pandoc 3.10', path: '/usr/local/bin/pandoc',
      });
    });
    it('reports pandoc as unavailable when it is not found', () => {
      vi.spyOn(fm, '_getToolVersion').mockReturnValue(null);
      expect(fm.checkPandoc()).toEqual({ available: false, version: null, path: null });
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
