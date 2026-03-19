# Electron + PyInstaller Backend: Sleep/Idle Recovery Pattern

**Problem:** Backend process crashes or becomes unreachable after macOS sleep or long idle periods.
**Applies to:** Any Electron app that spawns a PyInstaller-compiled Python backend as a child process.

---

## The Problem

When an Electron desktop app sits in the dock unused for an extended period, the bundled Python
backend can silently fail. The user sees an error like:

```
Transformation failed: Unexpected error: [Errno 2] No such file or directory
```

The error only appears after idle. Restarting the app fixes it. The web version of the same
backend works fine.

---

## Root Cause

Three macOS mechanisms conspire to break the backend:

### 1. PyInstaller Temp Directory Cleanup

PyInstaller one-file binaries extract bundled resources (Python stdlib, `cacert.pem`, data files)
to a temporary directory:

```
/var/folders/xx/xxxxxxxx/T/_MEIxxxxxx/
```

macOS periodically cleans `/var/folders/.../T/` contents, especially after sleep. If the backend
process is still alive but its `_MEIPASS` directory has been removed, any file access (like
`certifi.where()` for SSL certificates) fails with `[Errno 2]`.

### 2. App Nap

macOS App Nap aggressively throttles and can suspend processes belonging to apps that are not
visible or in the foreground. The child Python process inherits the Electron app's App Nap state.
A suspended process may miss keep-alive signals or have its network connections time out.

### 3. System Sleep

When the Mac sleeps, all processes are frozen. On wake:
- Network connections are dead (sockets closed by the OS)
- The Python process may fail to re-establish connections
- If the process was killed during sleep (OOM, watchdog), it won't restart on its own

---

## The Solution

A two-layer recovery strategy:

### Layer 1: Periodic Health Monitoring

Add a health check interval to your backend process manager. Poll the backend's health endpoint
every 30 seconds. After N consecutive failures (e.g., 3), automatically restart the backend.

```javascript
// In your backend process manager class:

startHealthMonitor(intervalMs = 30000, maxFailures = 3) {
  this._consecutiveFailures = 0;
  this._healthCheckInFlight = false;

  this._healthInterval = setInterval(async () => {
    // Skip if a restart is in progress or a prior check hasn't finished
    if (this._restartPromise || this._healthCheckInFlight) return;

    this._healthCheckInFlight = true;
    try {
      await this._healthCheck();
      this._consecutiveFailures = 0;
    } catch {
      this._consecutiveFailures++;
      if (this._consecutiveFailures >= maxFailures) {
        this._consecutiveFailures = 0;
        this._autoRestart().catch(() => {}); // fire-and-forget from monitor
      }
    } finally {
      this._healthCheckInFlight = false;
    }
  }, intervalMs);
}

stopHealthMonitor() {
  if (this._healthInterval) {
    clearInterval(this._healthInterval);
    this._healthInterval = null;
  }
}
```

### Layer 2: Proactive Recovery on System Resume

Use Electron's `powerMonitor` API to detect when the system wakes from sleep and immediately
verify the backend is healthy:

```javascript
const { powerMonitor } = require('electron');

powerMonitor.on('resume', async () => {
  console.log('System resumed from sleep — checking backend...');
  try {
    await backendManager.ensureRunning();
  } catch (error) {
    // Show error dialog to user
  }
});
```

The `ensureRunning()` method does a single health check and triggers a restart if it fails.
If a restart is already in progress, it awaits the same shared promise:

```javascript
async ensureRunning() {
  // If a restart is already in progress, await its outcome
  if (this._restartPromise) {
    return this._restartPromise;
  }
  try {
    await this._healthCheck();
  } catch {
    return this._autoRestart(); // rejects if restart fails
  }
}

// Shared restart promise — all concurrent callers await the same outcome
_autoRestart() {
  if (this._restartPromise) {
    return this._restartPromise;
  }

  this._restartPromise = this.restart()
    .then(() => {
      this._emit('restarted');
    })
    .catch((error) => {
      this._emit('restartFailed', error);
      throw error; // re-throw so callers' awaits reject
    })
    .finally(() => {
      this._restartPromise = null;
    });

  return this._restartPromise;
}
```

Key design points:
- `_autoRestart()` stores a shared promise in `this._restartPromise`
- Concurrent callers all get the same promise — only one restart executes
- The promise rejects on failure, so callers can distinguish success from failure
- `_restartPromise` is cleared in `finally` so the next failure triggers a fresh restart

### Layer 3 (Optional): Notify Renderer Windows

After a backend restart, notify all renderer windows so the UI can retry failed requests or
show a recovery message:

```javascript
backendManager.on('restarted', () => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('backend:restarted');
    }
  }
});
```

---

## Implementation Checklist

1. Add health monitoring to your backend process manager:
   - `startHealthMonitor()` — periodic polling with configurable interval and failure threshold
   - `stopHealthMonitor()` — cleanup on app quit
   - `ensureRunning()` — on-demand check with auto-restart (rejects on failure)
   - `_autoRestart()` — returns a shared `_restartPromise` so concurrent callers await the same outcome
   - Event emitter for `restarted` / `restartFailed` events (for external listeners like the main process)

2. Wire up in your Electron main process:
   - Call `startHealthMonitor()` after backend starts
   - Store the `powerMonitor` resume handler and listen for `resume` → call `ensureRunning()`
   - Listen to `restarted` event → notify renderer windows
   - Call `stopHealthMonitor()` in `before-quit` handler
   - Remove the `powerMonitor` resume listener in `before-quit` for clean lifecycle

3. Handle concurrent restart attempts via shared promise:
   - `_autoRestart()` stores a `_restartPromise` — second call returns the existing promise
   - `ensureRunning()` checks `_restartPromise` first, awaits it if non-null
   - Health monitor skips ticks when `_restartPromise` is set or a health check is in-flight

---

## Edge Cases to Handle

- Multiple `ensureRunning()` calls during a single restart — all callers await the same
  `_restartPromise`, only one restart executes
- Health monitor firing during a restart — skip the tick (check `_restartPromise`)
- Slow health checks overlapping the next interval tick — skip via `_healthCheckInFlight` guard
- Restart failure — `_autoRestart()` rejects the shared promise AND emits `restartFailed`,
  so both direct callers and event listeners are notified
- App quit during restart — `stopHealthMonitor()` and `powerMonitor` listener removal in `before-quit`
- `startHealthMonitor()` called while restart is in-flight — resets failure counter but does NOT
  clear `_restartPromise` (avoids allowing duplicate restarts)

---

## PyInstaller-Specific Considerations

If your backend uses HTTPS (e.g., calling external APIs), ensure these are in `hiddenimports`:

```python
hiddenimports=[
    'certifi',    # SSL CA certificate bundle (cacert.pem)
    'httpx',      # HTTP client
    'httpcore',   # httpx transport layer
    'anyio',      # async I/O
    'sniffio',    # async library detection
    'h11',        # HTTP/1.1 protocol
    'idna',       # internationalized domain names
]
```

Without `certifi`, the `cacert.pem` file won't be bundled, and HTTPS requests will fail with
`[Errno 2]` even on first launch (before any sleep/idle issues).

---

## Testing

Test the health monitoring logic with fake timers:

```javascript
describe('health monitoring', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('auto-restarts after N consecutive failures', async () => {
    manager._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
    manager.restart = vi.fn().mockResolvedValue(5050);
    manager.startHealthMonitor(1000, 3);

    await vi.advanceTimersByTimeAsync(3000);
    expect(manager.restart).toHaveBeenCalledTimes(1);
  });

  it('resets failure count on successful check', async () => {
    manager._healthCheck = vi.fn().mockResolvedValue(undefined);
    manager._consecutiveFailures = 2;
    manager.startHealthMonitor(1000, 3);

    await vi.advanceTimersByTimeAsync(1000);
    expect(manager._consecutiveFailures).toBe(0);
  });

  it('ensureRunning rejects when restart fails', async () => {
    manager._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
    manager.restart = vi.fn().mockRejectedValue(new Error('spawn fail'));

    await expect(manager.ensureRunning()).rejects.toThrow('spawn fail');
  });

  it('two concurrent ensureRunning calls settle with same outcome', async () => {
    manager._healthCheck = vi.fn().mockRejectedValue(new Error('dead'));
    manager.restart = vi.fn().mockResolvedValue(5050);

    const p1 = manager.ensureRunning();
    const p2 = manager.ensureRunning();

    await Promise.all([p1, p2]);
    expect(manager.restart).toHaveBeenCalledTimes(1); // only one restart
  });

  it('skips tick if prior health check is still running', async () => {
    let resolveCheck;
    manager._healthCheck = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => { resolveCheck = resolve; });
    });
    manager.startHealthMonitor(1000, 3);

    await vi.advanceTimersByTimeAsync(1000); // first tick starts
    await vi.advanceTimersByTimeAsync(1000); // second tick skipped
    expect(manager._healthCheck).toHaveBeenCalledTimes(1);

    resolveCheck(); // finish first check
    await vi.advanceTimersByTimeAsync(1000); // third tick runs
    expect(manager._healthCheck).toHaveBeenCalledTimes(2);
  });
});
```

---

## Related Issues

- macOS App Nap: https://developer.apple.com/library/archive/documentation/Performance/Conceptual/power_efficiency_guidelines_osx/AppNap.html
- PyInstaller `_MEIPASS`: https://pyinstaller.org/en/stable/runtime-information.html
- Electron `powerMonitor`: https://www.electronjs.org/docs/latest/api/power-monitor

---

**Summary:** Don't trust that a child process will survive macOS sleep. Monitor it, detect
failure, and restart automatically. The user should never need to manually restart the app.
