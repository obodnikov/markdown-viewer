import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// electron mock is handled by test/setup.js (Module._resolveFilename patch)

const FlaskManager = require('../flask-manager');

function createMockSettings(overrides = {}) {
  const data = {
    devFlaskPort: 5050, flaskPort: 0,
    openrouterApiKey: '', openrouterDefaultModel: 'anthropic/claude-3.5-sonnet',
    openrouterModels: '', openrouterMaxTokens: 8000, translationLanguages: '',
    githubClientId: '', githubClientSecret: '',
    bookstackUrl: '', bookstackApiTimeout: 30,
    logLevel: 'INFO', secretKey: 'test-secret', pythonPath: '', pandocPath: '',
    ...overrides,
  };
  return {
    get: (key, def) => (key in data ? data[key] : def),
    set: (key, val) => { data[key] = val; },
    getAll: () => ({ ...data }),
  };
}

describe('FlaskManager — Health Monitoring', () => {
  let fm, settings;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    settings = createMockSettings();
    fm = new FlaskManager(settings, false);
    fm.port = 5050;
  });

  afterEach(() => {
    fm.stopHealthMonitor();
    vi.useRealTimers();
  });

  // --- constructor state ---

  describe('constructor health fields', () => {
    it('initializes health monitoring state', () => {
      expect(fm._healthInterval).toBeNull();
      expect(fm._consecutiveFailures).toBe(0);
      expect(fm._isRestarting).toBe(false);
      expect(fm._eventHandlers).toEqual({});
    });
  });

  // --- startHealthMonitor / stopHealthMonitor ---

  describe('startHealthMonitor', () => {
    it('sets up an interval', () => {
      fm.startHealthMonitor(1000);
      expect(fm._healthInterval).not.toBeNull();
    });

    it('does not create duplicate intervals if called twice', () => {
      fm.startHealthMonitor(1000);
      const first = fm._healthInterval;
      fm.startHealthMonitor(1000);
      expect(fm._healthInterval).toBe(first);
    });

    it('resets _consecutiveFailures and _isRestarting on start', () => {
      fm._consecutiveFailures = 5;
      fm._isRestarting = true;
      fm.startHealthMonitor(1000);
      expect(fm._consecutiveFailures).toBe(0);
      expect(fm._isRestarting).toBe(false);
    });
  });

  describe('stopHealthMonitor', () => {
    it('clears the interval', () => {
      fm.startHealthMonitor(1000);
      expect(fm._healthInterval).not.toBeNull();
      fm.stopHealthMonitor();
      expect(fm._healthInterval).toBeNull();
    });

    it('is safe to call when no monitor is running', () => {
      expect(() => fm.stopHealthMonitor()).not.toThrow();
    });
  });

  // --- health check polling behavior ---

  describe('health check polling', () => {
    it('resets failure count on successful health check', async () => {
      fm._healthCheck = vi.fn().mockResolvedValue(undefined);
      fm._consecutiveFailures = 2;
      fm.startHealthMonitor(1000, 3);

      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._consecutiveFailures).toBe(0);
    });

    it('increments failure count on failed health check', async () => {
      fm._healthCheck = vi.fn().mockRejectedValue(new Error('timeout'));
      fm.startHealthMonitor(1000, 5);

      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._consecutiveFailures).toBe(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._consecutiveFailures).toBe(2);
    });

    it('triggers auto-restart after maxFailures consecutive failures', async () => {
      fm._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
      fm._autoRestart = vi.fn().mockResolvedValue(undefined);
      fm.startHealthMonitor(1000, 3);

      await vi.advanceTimersByTimeAsync(3000);
      expect(fm._autoRestart).toHaveBeenCalledTimes(1);
    });

    it('does not trigger restart before reaching maxFailures', async () => {
      fm._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
      fm._autoRestart = vi.fn().mockResolvedValue(undefined);
      fm.startHealthMonitor(1000, 3);

      await vi.advanceTimersByTimeAsync(2000);
      expect(fm._autoRestart).not.toHaveBeenCalled();
    });

    it('skips health check while restarting', async () => {
      fm._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
      fm.startHealthMonitor(1000, 1);
      // Set _isRestarting AFTER startHealthMonitor (which resets it)
      fm._isRestarting = true;

      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._healthCheck).not.toHaveBeenCalled();
    });
  });

  // --- ensureRunning ---

  describe('ensureRunning', () => {
    it('resolves immediately if health check passes', async () => {
      fm._healthCheck = vi.fn().mockResolvedValue(undefined);
      await fm.ensureRunning();
      expect(fm._healthCheck).toHaveBeenCalledTimes(1);
    });

    it('triggers auto-restart if health check fails', async () => {
      fm._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
      fm._autoRestart = vi.fn().mockResolvedValue(undefined);
      await fm.ensureRunning();
      expect(fm._autoRestart).toHaveBeenCalledTimes(1);
    });

    it('waits for in-progress restart and resolves on restarted event', async () => {
      fm._isRestarting = true;
      const promise = fm.ensureRunning();

      // Simulate restart completing
      fm._emit('restarted');
      await expect(promise).resolves.toBeUndefined();
    });

    it('waits for in-progress restart and rejects on restartFailed event', async () => {
      fm._isRestarting = true;
      const promise = fm.ensureRunning();

      fm._emit('restartFailed', new Error('restart boom'));
      await expect(promise).rejects.toThrow('restart boom');
    });

    it('rejects with timeout if restart never completes', async () => {
      fm._isRestarting = true;
      let caughtError = null;
      const promise = fm.ensureRunning().catch((err) => { caughtError = err; });

      await vi.advanceTimersByTimeAsync(20000);
      await promise;
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toContain('Timed out');
      // Reset so afterEach cleanup doesn't trigger real restart
      fm._isRestarting = false;
    });
  });

  // --- _autoRestart ---

  describe('_autoRestart', () => {
    it('calls restart and emits restarted on success', async () => {
      fm.restart = vi.fn().mockResolvedValue(5050);
      const handler = vi.fn();
      fm.on('restarted', handler);

      await fm._autoRestart();
      expect(fm.restart).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(fm._isRestarting).toBe(false);
    });

    it('emits restartFailed on error', async () => {
      fm.restart = vi.fn().mockRejectedValue(new Error('spawn fail'));
      const handler = vi.fn();
      fm.on('restartFailed', handler);

      await fm._autoRestart();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].message).toBe('spawn fail');
      expect(fm._isRestarting).toBe(false);
    });

    it('is a no-op if already restarting', async () => {
      fm._isRestarting = true;
      fm.restart = vi.fn();
      await fm._autoRestart();
      expect(fm.restart).not.toHaveBeenCalled();
    });
  });

  // --- event emitter ---

  describe('event emitter (on / off / _emit)', () => {
    it('registers and fires handlers', () => {
      const handler = vi.fn();
      fm.on('test', handler);
      fm._emit('test', 'arg1', 'arg2');
      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('removes handlers with off', () => {
      const handler = vi.fn();
      fm.on('test', handler);
      fm.off('test', handler);
      fm._emit('test');
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not throw when emitting with no handlers', () => {
      expect(() => fm._emit('nonexistent')).not.toThrow();
    });

    it('off is safe for unregistered events', () => {
      expect(() => fm.off('nonexistent', () => {})).not.toThrow();
    });

    it('catches errors in handlers without breaking other handlers', () => {
      const bad = vi.fn(() => { throw new Error('handler crash'); });
      const good = vi.fn();
      fm.on('test', bad);
      fm.on('test', good);
      fm._emit('test');
      expect(bad).toHaveBeenCalled();
      expect(good).toHaveBeenCalled();
    });
  });
});
