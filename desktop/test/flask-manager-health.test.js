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
      expect(fm._monitorGeneration).toBe(0);
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

    it('increments _monitorGeneration on each start', () => {
      expect(fm._monitorGeneration).toBe(0);
      fm.startHealthMonitor(1000);
      expect(fm._monitorGeneration).toBe(1);
      fm.stopHealthMonitor();
      expect(fm._monitorGeneration).toBe(2);
      fm.startHealthMonitor(1000);
      expect(fm._monitorGeneration).toBe(3);
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

    it('resets _healthCheckInFlight even when interval is already null', () => {
      fm._healthCheckInFlight = true;
      fm._healthInterval = null;
      fm.stopHealthMonitor();
      expect(fm._healthCheckInFlight).toBe(false);
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

    it('stale check completing after stop/start does not corrupt new monitor state', async () => {
      // Start monitor with a slow health check that will outlive the monitor
      let resolveOldCheck;
      fm._healthCheck = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => { resolveOldCheck = resolve; });
      });
      fm.startHealthMonitor(1000, 3);

      // First tick starts the slow check
      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._healthCheckInFlight).toBe(true);

      // Stop and restart the monitor with a new fast check
      fm.stopHealthMonitor();
      let newCheckCount = 0;
      fm._healthCheck = vi.fn().mockImplementation(() => {
        newCheckCount++;
        return Promise.resolve();
      });
      fm.startHealthMonitor(1000, 3);
      expect(fm._healthCheckInFlight).toBe(false);

      // New monitor tick runs a new check
      await vi.advanceTimersByTimeAsync(1000);
      expect(newCheckCount).toBe(1);
      expect(fm._healthCheckInFlight).toBe(false);
      expect(fm._consecutiveFailures).toBe(0);

      // Now the OLD check resolves — should NOT corrupt state
      // Manually set a failure count to detect if old check resets it
      fm._consecutiveFailures = 2;
      fm._healthCheckInFlight = true; // simulate new check in-flight
      resolveOldCheck();
      await vi.advanceTimersByTimeAsync(0); // flush microtasks

      // Old check's finally should NOT have cleared the new monitor's in-flight flag
      expect(fm._healthCheckInFlight).toBe(true);
      // Old check's success should NOT have reset the new monitor's failure count
      expect(fm._consecutiveFailures).toBe(2);
    });

    it('stale failing check after stop does not increment failures or trigger restart', async () => {
      // Start monitor with a deferred health check that will fail after stop
      let rejectOldCheck;
      fm._healthCheck = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => { rejectOldCheck = reject; });
      });
      fm.restart = vi.fn().mockResolvedValue(5050);
      fm.startHealthMonitor(1000, 1); // maxFailures=1 so a single failure would trigger restart

      // First tick starts the slow check
      await vi.advanceTimersByTimeAsync(1000);
      expect(fm._healthCheckInFlight).toBe(true);
      expect(fm._consecutiveFailures).toBe(0);

      // Stop the monitor — no restart
      fm.stopHealthMonitor();
      expect(fm._consecutiveFailures).toBe(0);

      // Now the OLD check rejects — should be a no-op on a stopped monitor
      rejectOldCheck(new Error('dead'));
      await vi.advanceTimersByTimeAsync(0); // flush microtasks

      // Failures should NOT have been incremented
      expect(fm._consecutiveFailures).toBe(0);
      // Restart should NOT have been triggered
      expect(fm.restart).not.toHaveBeenCalled();
      // In-flight flag should remain as stop left it (false)
      expect(fm._healthCheckInFlight).toBe(false);
    });
  });

  // --- ensureRunning concurrent race ---

  describe('ensureRunning concurrent race', () => {
    it('both callers resolve via shared restart when health checks fail concurrently', async () => {
      // Both calls get a failing health check, but only one restart should fire
      let healthCallCount = 0;
      fm._healthCheck = vi.fn().mockImplementation(() => {
        healthCallCount++;
        return Promise.reject(new Error('dead'));
      });
      fm.restart = vi.fn().mockResolvedValue(5050);

      // Launch both in parallel — true concurrency
      const [r1, r2] = await Promise.all([
        fm.ensureRunning(),
        fm.ensureRunning(),
      ]);

      expect(r1).toBeUndefined();
      expect(r2).toBeUndefined();
      // Only one restart despite two failing callers
      expect(fm.restart).toHaveBeenCalledTimes(1);
    });

    it('concurrent callers with deferred health checks share restart when possible', async () => {
      // When both health checks are independently deferred, each caller enters
      // ensureRunning before _restartPromise is set. The first to fail creates
      // the restart promise; the second may also fail independently. This test
      // verifies both resolve without error and restart completes.
      let rejectHealth1, rejectHealth2;
      let callCount = 0;
      fm._healthCheck = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return new Promise((_, reject) => { rejectHealth1 = reject; });
        }
        return new Promise((_, reject) => { rejectHealth2 = reject; });
      });
      fm.restart = vi.fn().mockResolvedValue(5050);

      // Start both calls — they each await their own deferred health check
      const p1 = fm.ensureRunning();
      const p2 = fm.ensureRunning();

      // Fail both health checks
      rejectHealth1(new Error('dead'));
      await vi.advanceTimersByTimeAsync(0);
      rejectHealth2(new Error('dead'));
      await vi.advanceTimersByTimeAsync(0);

      await expect(p1).resolves.toBeUndefined();
      await expect(p2).resolves.toBeUndefined();
      // Both callers resolve successfully — restart was called at least once
      expect(fm.restart).toHaveBeenCalled();
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
