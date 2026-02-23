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
      PYTHONPATH: this._getProjectRoot()
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
    try {
      const output = execFileSync('pandoc', ['--version'], { timeout: 5000 });
      const version = output.toString().split('\n')[0];
      console.log(`[FlaskManager] Pandoc found: ${version}`);
      return { available: true, version };
    } catch {
      console.warn('[FlaskManager] Pandoc not found — PDF/DOCX export will be unavailable');
      return { available: false, version: null };
    }
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
}

module.exports = FlaskManager;
