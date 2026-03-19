// desktop/flask-manager.js — Flask process lifecycle management
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Python candidates to try during auto-detection, in priority order
const PYTHON_CANDIDATES = [
  'python3',
  'python',
  '/opt/homebrew/bin/python3',
  '/usr/local/bin/python3',
  '/usr/bin/python3'
];

if (process.platform === 'win32') {
  PYTHON_CANDIDATES.push(
    'py',
    'C:\\Python313\\python.exe',
    'C:\\Python312\\python.exe',
    'C:\\Python311\\python.exe'
  );
}

class FlaskManager {
  constructor(settingsManager, isDev = false) {
    this.settingsManager = settingsManager;
    this.isDev = isDev;
    this.process = null;
    this.port = null;
    this._resolvedPythonPath = null;
    // Health monitoring
    this._healthInterval = null;
    this._consecutiveFailures = 0;
    this._restartPromise = null;       // shared promise for in-flight restart
    this._healthCheckInFlight = false; // guard against overlapping checks
    this._eventHandlers = {};
  }

  async start() {
    // In dev mode, assume Flask is already running externally
    if (this.isDev) {
      this.port = this.settingsManager.get('devFlaskPort', 5050);
      console.log(`[FlaskManager] Dev mode — using external Flask on port ${this.port}`);
      return this.port;
    }

    // Use configured port or find a free one
    const configuredPort = this.settingsManager.get('flaskPort', 0);
    const getPort = await import('get-port');

    if (configuredPort > 0) {
      // Verify the configured port is actually available
      const availablePort = await getPort.default({ port: [configuredPort] });
      if (availablePort === configuredPort) {
        this.port = configuredPort;
        console.log(`[FlaskManager] Using configured port ${this.port}`);
      } else {
        console.warn(`[FlaskManager] Configured port ${configuredPort} is in use, auto-detecting...`);
        this.port = await getPort.default({ port: [5050, 5051, 5052, 5053, 5054] });
        console.log(`[FlaskManager] Fell back to port ${this.port}`);
      }
    } else {
      this.port = await getPort.default({ port: [5050, 5051, 5052, 5053, 5054] });
      console.log(`[FlaskManager] Auto-detected free port ${this.port}`);
    }

    // Build environment variables from settings
    const env = this._buildEnv();

    // Determine Flask executable path
    const flaskPath = this._getFlaskPath();

    console.log(`[FlaskManager] Starting Flask on port ${this.port}...`);
    console.log(`[FlaskManager] Command: ${flaskPath.command} ${flaskPath.args.join(' ')}`);

    this.process = spawn(flaskPath.command, flaskPath.args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: flaskPath.cwd
    });

    this._stderrBuffer = '';

    this.process.stdout.on('data', (data) => {
      console.log(`[Flask] ${data.toString().trim()}`);
    });

    this.process.stderr.on('data', (data) => {
      const text = data.toString().trim();
      this._stderrBuffer += text + '\n';
      console.error(`[Flask] ${text}`);
    });

    this.process.on('error', (error) => {
      console.error(`[FlaskManager] Failed to spawn Flask: ${error.message}`);
    });

    // Track early exit for fast failure detection
    this._earlyExitPromise = new Promise((resolve) => {
      this.process.once('exit', (code, signal) => {
        console.log(`[FlaskManager] Flask exited (code: ${code}, signal: ${signal})`);
        this.process = null;
        resolve(code);
      });
    });

    // Wait for Flask to be ready
    try {
      await this._waitForReady();
    } catch (error) {
      // Kill orphaned process if health check never succeeded
      await this._stopAndWait();
      throw error;
    }

    return this.port;
  }

  stop() {
    // Fire-and-forget version for app quit — use _stopAndWait() when you need to wait
    if (this.process) {
      console.log('[FlaskManager] Stopping Flask...');
      this.process.kill('SIGTERM');
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  async restart() {
    await this._stopAndWait();
    return this.start();
  }

  /**
   * Stop Flask and wait for the process to fully exit before resolving.
   */
  _stopAndWait() {
    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      const forceKillTimer = setTimeout(() => {
        if (this.process) {
          console.warn('[FlaskManager] Force killing Flask...');
          this.process.kill('SIGKILL');
        }
      }, 5000);

      this.process.once('exit', () => {
        clearTimeout(forceKillTimer);
        this.process = null;
        resolve();
      });

      console.log('[FlaskManager] Stopping Flask...');
      this.process.kill('SIGTERM');
    });
  }

  /**
   * Detect a working Python interpreter.
   * Priority: 1) user setting  2) auto-detect from candidates  3) fail
   */
  _detectPython() {
    if (this._resolvedPythonPath) return this._resolvedPythonPath;

    // 1. User-configured path
    const userPath = this.settingsManager.get('pythonPath', '');
    if (userPath) {
      if (this._isPythonValid(userPath)) {
        this._resolvedPythonPath = userPath;
        console.log(`[FlaskManager] Using configured Python: ${userPath}`);
        return userPath;
      }
      console.warn(`[FlaskManager] Configured pythonPath "${userPath}" is not valid, falling back to auto-detect`);
    }

    // 2. Auto-detect
    for (const candidate of PYTHON_CANDIDATES) {
      if (this._isPythonValid(candidate)) {
        this._resolvedPythonPath = candidate;
        console.log(`[FlaskManager] Auto-detected Python: ${candidate}`);
        return candidate;
      }
    }

    throw new Error(
      'No Python interpreter found. Please set the Python path in Settings → Python Path.\n' +
      `Tried: ${PYTHON_CANDIDATES.join(', ')}`
    );
  }

  _isPythonValid(pythonPath) {
    try {
      const version = execFileSync(pythonPath, ['--version'], {
        timeout: 5000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      console.log(`[FlaskManager] Found ${version} at ${pythonPath}`);
      return true;
    } catch {
      return false;
    }
  }

  _buildEnv() {
    const settings = this.settingsManager.getAll();
    return {
      BACKEND_PORT: String(this.port),
      BACKEND_HOST: '127.0.0.1',
      OPENROUTER_API_KEY: settings.openrouterApiKey || '',
      OPENROUTER_DEFAULT_MODEL: settings.openrouterDefaultModel || 'anthropic/claude-3.5-sonnet',
      OPENROUTER_MODELS: settings.openrouterModels || '',
      OPENROUTER_MAX_TOKENS: String(settings.openrouterMaxTokens || 8000),
      TRANSLATION_LANGUAGES: settings.translationLanguages || '',
      GITHUB_CLIENT_ID: settings.githubClientId || '',
      GITHUB_CLIENT_SECRET: settings.githubClientSecret || '',
      GITHUB_REDIRECT_URI: `http://localhost:${this.port}/api/github/callback`,
      BOOKSTACK_URL: settings.bookstackUrl || '',
      BOOKSTACK_API_TIMEOUT: String(settings.bookstackApiTimeout || 30),
      CORS_ORIGINS: `http://localhost:${this.port},app://`,
      DISABLE_FILE_LOGGING: 'true',
      LOG_LEVEL: settings.logLevel || 'INFO',
      SECRET_KEY: settings.secretKey || 'desktop-app-secret-key',
      PYTHONPATH: this._getProjectRoot(),
      PANDOC_PATH: this.settingsManager.get('pandocPath', '').trim() || ''
    };
  }

  _getFlaskPath() {
    const projectRoot = this._getProjectRoot();

    // Check for PyInstaller-compiled binary first
    const compiledPath = this._getCompiledBackendPath();
    if (compiledPath) {
      return {
        command: compiledPath,
        args: ['--port', String(this.port), '--host', '127.0.0.1'],
        cwd: projectRoot
      };
    }

    // Use detected Python interpreter
    const pythonPath = this._detectPython();
    return {
      command: pythonPath,
      args: [
        path.join(projectRoot, 'backend', 'app.py'),
        '--port', String(this.port),
        '--host', '127.0.0.1'
      ],
      cwd: projectRoot
    };
  }

  _getCompiledBackendPath() {
    const binaryName = process.platform === 'win32'
      ? 'markdown-viewer-backend.exe'
      : 'markdown-viewer-backend';

    // In packaged app: binary is at Resources/app/build/dist/
    // In dev: binary is at desktop/build/dist/
    const binaryPath = path.join(__dirname, 'build', 'dist', binaryName);

    if (fs.existsSync(binaryPath)) {
      return binaryPath;
    }
    return null;
  }

  _getProjectRoot() {
    const { app } = require('electron');
    if (app.isPackaged) {
      return process.resourcesPath;
    }
    return path.resolve(__dirname, '..');
  }

  checkPandoc() {
    const { execFileSync } = require('child_process');
    const configuredPath = this.settingsManager.get('pandocPath', '').trim();
    const candidates = configuredPath
      ? [configuredPath]
      : ['pandoc', '/usr/local/bin/pandoc', '/opt/homebrew/bin/pandoc', '/usr/bin/pandoc'];

    for (const candidate of candidates) {
      try {
        const output = execFileSync(candidate, ['--version'], { timeout: 5000 });
        const version = output.toString().split('\n')[0];
        console.log(`[FlaskManager] Pandoc found: ${version} at ${candidate}`);
        return { available: true, version, path: candidate };
      } catch {
        // try next
      }
    }
    console.warn('[FlaskManager] Pandoc not found — PDF/DOCX export will be unavailable');
    return { available: false, version: null, path: null };
  }


  async _waitForReady(maxRetries = 30, interval = 500) {
    for (let i = 0; i < maxRetries; i++) {
      // Check if process already exited
      if (!this.process) {
        const stderr = this._stderrBuffer.trim();
        throw new Error(
          `Flask process exited before becoming ready.\n${stderr || '(no error output)'}`
        );
      }

      // Race health check against early process exit
      const result = await Promise.race([
        this._healthCheck()
          .then(() => 'ready')
          .catch(() => 'retry'),  // Connection refused etc. — keep polling
        this._earlyExitPromise.then((code) => ({ exited: true, code }))
      ]);

      if (result === 'ready') {
        console.log(`[FlaskManager] Flask is ready (attempt ${i + 1})`);
        this._stderrBuffer = '';  // Clear buffer on success
        return;
      }

      if (result && result.exited) {
        const stderr = this._stderrBuffer.trim();
        throw new Error(
          `Flask exited with code ${result.code} before becoming ready.\n${stderr || '(no error output)'}`
        );
      }

      // result === 'retry' — wait and try again
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Flask backend failed to start within 15 seconds');
  }

  _healthCheck() {
    return new Promise((resolve, reject) => {
      const req = http.get(
        `http://127.0.0.1:${this.port}/api/health`,
        (res) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Health check returned ${res.statusCode}`));
        }
      );
      req.on('error', reject);
      req.setTimeout(2000, () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
    });
  }

  // --- Health monitoring (post-startup) ---

  /**
   * Start periodic health checks. If the backend fails several consecutive
   * checks it is automatically restarted.
   *
   * @param {number} intervalMs — polling interval (default 30 s)
   * @param {number} maxFailures — consecutive failures before restart (default 3)
   */
  startHealthMonitor(intervalMs = 30000, maxFailures = 3) {
    if (this._healthInterval) return; // already running

    this._consecutiveFailures = 0;
    this._healthCheckInFlight = false; // reset in case a prior check was hung when monitor was stopped
    // Note: do NOT reset _restartPromise here — a restart may be genuinely in-flight

    console.log(`[FlaskManager] Health monitor started (every ${intervalMs / 1000}s, restart after ${maxFailures} failures)`);

    this._healthInterval = setInterval(async () => {
      // Skip if a restart is in progress or a prior check hasn't finished
      if (this._restartPromise || this._healthCheckInFlight) return;

      this._healthCheckInFlight = true;
      try {
        await this._healthCheck();
        if (this._consecutiveFailures > 0) {
          console.log('[FlaskManager] Backend recovered — health check OK');
        }
        this._consecutiveFailures = 0;
      } catch {
        this._consecutiveFailures++;
        console.warn(`[FlaskManager] Health check failed (${this._consecutiveFailures}/${maxFailures})`);

        if (this._consecutiveFailures >= maxFailures) {
          console.error('[FlaskManager] Backend unresponsive — auto-restarting...');
          this._consecutiveFailures = 0;
          // Fire-and-forget from the monitor's perspective — errors are emitted as events
          this._autoRestart().catch(() => {});
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
      this._healthCheckInFlight = false; // allow fresh checks when monitor is restarted
      console.log('[FlaskManager] Health monitor stopped');
    }
  }

  /**
   * On-demand check — call before critical operations or after system resume.
   * Restarts the backend if it is not healthy.
   * Rejects if restart fails so callers can handle the error.
   *
   * Note on concurrency: if a concurrent caller triggers a restart while this
   * call's _healthCheck() is in-flight and succeeds, this call resolves
   * immediately (healthy snapshot). This is intentional — a passing health
   * check means the backend is usable right now, regardless of a parallel
   * restart triggered by a different failure path.
   */
  async ensureRunning() {
    // If a restart is already in progress, await its outcome
    if (this._restartPromise) {
      return this._restartPromise;
    }

    try {
      await this._healthCheck();
      // Backend is fine
    } catch {
      console.warn('[FlaskManager] ensureRunning — backend not healthy, restarting...');
      // _autoRestart returns a shared promise that rejects on failure
      return this._autoRestart();
    }
  }

  /**
   * Restart the backend. Returns a shared promise so all concurrent callers
   * await the same outcome. Rejects if restart fails.
   */
  _autoRestart() {
    // If already restarting, return the existing promise
    if (this._restartPromise) {
      return this._restartPromise;
    }

    this._restartPromise = this.restart()
      .then(() => {
        console.log('[FlaskManager] Auto-restart succeeded');
        this._emit('restarted');
      })
      .catch((error) => {
        console.error(`[FlaskManager] Auto-restart failed: ${error.message}`);
        this._emit('restartFailed', error);
        throw error; // re-throw so callers' awaits reject
      })
      .finally(() => {
        this._restartPromise = null;
      });

    return this._restartPromise;
  }

  // --- Minimal event emitter ---

  on(event, handler) {
    if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
    this._eventHandlers[event].push(handler);
  }

  off(event, handler) {
    const handlers = this._eventHandlers[event];
    if (!handlers) return;
    this._eventHandlers[event] = handlers.filter(h => h !== handler);
  }

  _emit(event, ...args) {
    const handlers = this._eventHandlers[event];
    if (!handlers) return;
    for (const handler of handlers) {
      try { handler(...args); } catch (e) {
        console.error(`[FlaskManager] Event handler error (${event}): ${e.message}`);
      }
    }
  }
}

module.exports = FlaskManager;
