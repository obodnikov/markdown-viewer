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
    fm._restartPromise = null;
    vi.useRealTimers();
  });

  // --- constructor state ---

  describe('constructor health fields', () => {
    it('initializes health monitoring state', () => {
      expect(fm._healthInterval).toBeNull();
      expect(fm._consecutiveFailures).toBe(0);
      expect(fm._restartPromise).toBeNull();
      expect(fm._healthCheckInFlight).toBe(false);
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

    it('resets _consecutiveFailures but not _restartPromise on start', () => {
      fm._consecutiveFailures = 5;
      const fakePromise = Promise.resolve();
      fm._restartPromise = fakePromise;
      fm.startHealthMonitor(1000);
      expect(fm._consecutiveFailures).toBe(0);
      // Must NOT reset a genuine in-flight restart
      expect(fm._restartPromise).toBe(fakePromise);
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
      fm.restart = vi.fn().mockResolvedValue(5050);
      fm.startHealthMonitor(1000, 3);

      await vi.advanceTimersByTimeAsync(3000);
      expect(fm.restart).toHaveBeenCalledTimes(1);
    });

    it('does not trigger restart before reaching maxFailures', async () => {
      fm._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
      fm.restart = vi.fn().mockResolvedValue(5050);
      fm.startHealthMonitor(1000, 3);

      await vi.advanceTimersByTimeAsync(2000);
      expect(fm.restart).not.toHaveBeenCalled();
    });

    it('skips health check while restart is in progress', async () => {
      fm._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
      fm.startHealthMonitor(1000, 1);
      // Simulate in-flight restart
      fm._restartPromise = new Promise(() => {}); // never resolves

      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._healthCheck).not.toHaveBeenCalled();
    });

    it('skips tick if prior health check is still running', async () => {
      let resolveCheck;
      fm._healthCheck = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => { resolveCheck = resolve; });
      });
      fm.startHealthMonitor(1000, 3);

      // First tick starts a slow check
      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._healthCheck).toHaveBeenCalledTimes(1);
      expect(fm._healthCheckInFlight).toBe(true);

      // Second tick should be skipped because first is still in-flight
      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._healthCheck).toHaveBeenCalledTimes(1); // still 1

      // Resolve the first check
      resolveCheck();
      await vi.advanceTimersByTimeAsync(0); // flush microtasks

      // Third tick should now run
      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._healthCheck).toHaveBeenCalledTimes(2);
    });
  });

  // --- ensureRunning ---

  describe('ensureRunning', () => {
    it('resolves immediately if health check passes', async () => {
      fm._healthCheck = vi.fn().mockResolvedValue(undefined);
      await fm.ensureRunning();
      expect(fm._healthCheck).toHaveBeenCalledTimes(1);
    });

    it('triggers restart and resolves if restart succeeds', async () => {
      fm._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
      fm.restart = vi.fn().mockResolvedValue(5050);
      await fm.ensureRunning();
      expect(fm.restart).toHaveBeenCalledTimes(1);
    });

    it('rejects when restart fails', async () => {
      fm._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
      fm.restart = vi.fn().mockRejectedValue(new Error('spawn fail'));

      let caughtError = null;
      try {
        await fm.ensureRunning();
      } catch (err) {
        caughtError = err;
      }
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toBe('spawn fail');
    });

    it('awaits in-progress restart and resolves on success', async () => {
      let resolveRestart;
      fm.restart = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => { resolveRestart = resolve; });
      });

      // Start a restart via _autoRestart
      const firstPromise = fm._autoRestart();

      // ensureRunning should return the same promise
      const secondPromise = fm.ensureRunning();

      resolveRestart(5050);
      await expect(firstPromise).resolves.toBeUndefined();
      await expect(secondPromise).resolves.toBeUndefined();
    });

    it('awaits in-progress restart and rejects on failure', async () => {
      let rejectRestart;
      fm.restart = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => { rejectRestart = reject; });
      });

      const firstPromise = fm._autoRestart().catch((e) => e);
      const secondPromise = fm.ensureRunning().catch((e) => e);

      rejectRestart(new Error('restart boom'));
      const err1 = await firstPromise;
      const err2 = await secondPromise;
      expect(err1.message).toBe('restart boom');
      expect(err2.message).toBe('restart boom');
    });

    it('two concurrent ensureRunning calls settle with same outcome', async () => {
      fm._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
      fm.restart = vi.fn().mockResolvedValue(5050);

      const p1 = fm.ensureRunning();
      const p2 = fm.ensureRunning();

      // Both should resolve (not reject)
      await expect(p1).resolves.toBeUndefined();
      await expect(p2).resolves.toBeUndefined();
      // Only one restart should have been triggered
      expect(fm.restart).toHaveBeenCalledTimes(1);
    });

    it('two concurrent ensureRunning calls both reject on failure', async () => {
      fm._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
      fm.restart = vi.fn().mockRejectedValue(new Error('fail'));

      const p1 = fm.ensureRunning().catch((e) => e);
      const p2 = fm.ensureRunning().catch((e) => e);

      const err1 = await p1;
      const err2 = await p2;
      expect(err1.message).toBe('fail');
      expect(err2.message).toBe('fail');
      expect(fm.restart).toHaveBeenCalledTimes(1);
    });
  });

  // --- start/stop/start recovery with hung check ---

  describe('monitor restart recovery', () => {
    it('recovers from a hung health check after stop/start cycle', async () => {
      // Start a health check that never resolves (simulates a hung check)
      let resolveHung;
      fm._healthCheck = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => { resolveHung = resolve; });
      });
      fm.startHealthMonitor(1000, 3);

      // First tick starts the hung check
      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._healthCheckInFlight).toBe(true);

      // Stop the monitor — should reset _healthCheckInFlight
      fm.stopHealthMonitor();
      expect(fm._healthCheckInFlight).toBe(false);

      // Restart monitor with a healthy check
      fm._healthCheck = vi.fn().mockResolvedValue(undefined);
      fm.startHealthMonitor(1000, 3);
      expect(fm._healthCheckInFlight).toBe(false);

      // Next tick should run normally
      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._healthCheck).toHaveBeenCalledTimes(1);
      expect(fm._consecutiveFailures).toBe(0);

      // Clean up the dangling promise
      if (resolveHung) resolveHung();
    });

    it('resets _healthCheckInFlight on startHealthMonitor even without stop', async () => {
      // Manually simulate a stuck state
      fm._healthCheckInFlight = true;
      fm._healthInterval = null; // no interval running, so start will proceed

      fm._healthCheck = vi.fn().mockResolvedValue(undefined);
      fm.startHealthMonitor(1000, 3);

      expect(fm._healthCheckInFlight).toBe(false);

      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._healthCheck).toHaveBeenCalledTimes(1);
    });
  });

  // --- ensureRunning concurrent race ---

  describe('ensureRunning concurrent race', () => {
    it('resolves if health check passes even while a concurrent restart is triggered', async () => {
      // Caller A: health check succeeds immediately
      // Caller B: health check fails, triggers restart
      let callCount = 0;
      fm._healthCheck = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(); // caller A succeeds
        return Promise.reject(new Error('dead'));       // caller B fails
      });
      fm.restart = vi.fn().mockResolvedValue(5050);

      // Caller A resolves immediately (healthy)
      await expect(fm.ensureRunning()).resolves.toBeUndefined();

      // Caller B triggers restart
      await expect(fm.ensureRunning()).resolves.toBeUndefined();
      expect(fm.restart).toHaveBeenCalledTimes(1);
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
      expect(fm._restartPromise).toBeNull(); // cleaned up
    });

    it('rejects and emits restartFailed on error', async () => {
      fm.restart = vi.fn().mockRejectedValue(new Error('spawn fail'));
      const handler = vi.fn();
      fm.on('restartFailed', handler);

      let caughtError = null;
      try {
        await fm._autoRestart();
      } catch (err) {
        caughtError = err;
      }
      expect(caughtError.message).toBe('spawn fail');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].message).toBe('spawn fail');
      expect(fm._restartPromise).toBeNull(); // cleaned up
    });

    it('returns existing promise if restart already in progress', async () => {
      let resolveRestart;
      fm.restart = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => { resolveRestart = resolve; });
      });

      const p1 = fm._autoRestart();
      const p2 = fm._autoRestart();

      // Same promise instance
      expect(fm.restart).toHaveBeenCalledTimes(1);

      resolveRestart(5050);
      await expect(p1).resolves.toBeUndefined();
      await expect(p2).resolves.toBeUndefined();
    });

    it('clears _restartPromise after completion', async () => {
      fm.restart = vi.fn().mockResolvedValue(5050);
      await fm._autoRestart();
      expect(fm._restartPromise).toBeNull();
    });

    it('clears _restartPromise after failure', async () => {
      fm.restart = vi.fn().mockRejectedValue(new Error('fail'));
      await fm._autoRestart().catch(() => {});
      expect(fm._restartPromise).toBeNull();
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
