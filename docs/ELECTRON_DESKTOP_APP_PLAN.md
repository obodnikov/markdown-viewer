# Electron Desktop Application — Implementation Plan

**Version:** 1.0.0
**Created:** 2026-02-22
**Status:** 📋 Planning
**Target:** Markdown Viewer Desktop v2.0.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Phase 1 — Project Setup & Dependencies](#phase-1--project-setup--dependencies)
5. [Phase 2 — Electron Main Process](#phase-2--electron-main-process)
6. [Phase 3 — Custom Protocol & API Proxy](#phase-3--custom-protocol--api-proxy)
7. [Phase 4 — Settings UI (API Key Management)](#phase-4--settings-ui-api-key-management)
8. [Phase 5 — Native Desktop Integrations](#phase-5--native-desktop-integrations)
   - [5.5 — File Type Association (Default App for .md)](#55-file-type-association-default-app-for-md-files)
9. [Phase 6 — GitHub OAuth for Desktop](#phase-6--github-oauth-for-desktop)
10. [Phase 7 — Pandoc Integration](#phase-7--pandoc-integration)
11. [Phase 8 — Python Bundling with PyInstaller](#phase-8--python-bundling-with-pyinstaller)
12. [Phase 9 — Packaging & Distribution](#phase-9--packaging--distribution)
13. [Phase 10 — Testing Strategy](#phase-10--testing-strategy)
14. [Development Workflow](#development-workflow)
15. [Impact on Existing Codebase](#impact-on-existing-codebase)
16. [Risk Assessment](#risk-assessment)
17. [Implementation Timeline](#implementation-timeline)

---

## 1. Overview

### Goal

Create a cross-platform desktop application (macOS, Windows, Linux) that wraps the
existing Markdown Viewer web application using Electron. The desktop app must provide
**identical functionality** to the web version while adding native desktop benefits:

- Native file dialogs (open/save)
- System menu bar integration
- Desktop notifications
- Auto-updates
- No browser required
- Standalone executable (no Python/Node install required for end users)

### Approach

- **Monorepo** — the `desktop/` folder lives alongside existing code
- **Shared codebase** — frontend (`public/`, `scripts/`, `styles/`) and backend (`backend/`) are reused as-is
- **Thin wrapper** — Electron provides the window shell; Flask runs as an embedded child process
- **Zero changes to web version** — the existing Docker/web deployment continues to work unchanged

---

## 2. Architecture

### Runtime Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Electron Application                   │
│                                                          │
│  ┌──────────────────┐     ┌───────────────────────────┐ │
│  │   Main Process    │     │    Renderer Process       │ │
│  │                   │     │    (BrowserWindow)        │ │
│  │  - Spawns Flask   │     │                           │ │
│  │  - Custom protocol│     │  ┌─────────────────────┐  │ │
│  │  - IPC handlers   │     │  │  public/index.html  │  │ │
│  │  - Native menus   │     │  │  scripts/*.js       │  │ │
│  │  - Settings mgmt  │     │  │  styles/*.css       │  │ │
│  │                   │     │  └────────┬────────────┘  │ │
│  └────────┬──────────┘     │           │               │ │
│           │                │     app://./api/*         │ │
│           │                └───────────┼───────────────┘ │
│           │                            │                 │
│  ┌────────▼────────────────────────────▼───────────────┐ │
│  │              Custom Protocol Handler                 │ │
│  │                                                      │ │
│  │  app://./styles/*  → serve from filesystem           │ │
│  │  app://./scripts/* → serve from filesystem           │ │
│  │  app://./api/*     → proxy to Flask localhost:PORT   │ │
│  └──────────────────────────────┬──────────────────────┘ │
│                                 │                        │
│  ┌──────────────────────────────▼──────────────────────┐ │
│  │           Flask Backend (Child Process)              │ │
│  │                                                      │ │
│  │  python backend/app.py --port <dynamic>              │ │
│  │                                                      │ │
│  │  - OpenRouter API calls  → internet                  │ │
│  │  - GitHub API calls      → internet                  │ │
│  │  - BookStack API calls   → internet                  │ │
│  │  - Pandoc export         → local subprocess          │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Custom `app://` protocol** — serves static files and proxies API calls, so the frontend
   code continues using relative `/api/*` URLs without any changes
2. **Dynamic port allocation** — Flask binds to a random free port to avoid conflicts
3. **PyInstaller for production** — compiles Flask backend into a standalone binary,
   eliminating the need for Python on the user's machine
4. **electron-store for settings** — replaces `.env` file with a GUI settings panel

---

## 3. Project Structure

### New Files (all inside `desktop/`)

```
desktop/
├── main.js                  # Electron main process entry point
├── preload.js               # Secure IPC bridge (contextBridge)
├── protocol.js              # Custom app:// protocol handler
├── flask-manager.js         # Flask process lifecycle management
├── settings-manager.js      # Settings storage & retrieval
├── menu.js                  # Native application menu
├── package.json             # Electron dependencies & build scripts
├── forge.config.js          # Electron Forge packaging configuration
├── .env.defaults            # Default environment values for Flask
├── settings/
│   ├── settings.html        # Settings window UI
│   ├── settings.css         # Settings window styles
│   └── settings.js          # Settings window logic
├── icons/
│   ├── icon.icns            # macOS app icon (512x512)
│   ├── icon.ico             # Windows app icon (256x256)
│   └── icon.png             # Linux app icon (512x512)
├── build/
│   ├── pyinstaller.spec     # PyInstaller spec for Flask backend
│   ├── build-backend.sh     # Script to compile Flask with PyInstaller
│   └── build-backend.bat    # Windows version of build script
└── test/
    ├── main.test.js         # Main process tests
    ├── flask-manager.test.js # Flask manager tests
    └── protocol.test.js     # Protocol handler tests
```

### Modified Files (minimal changes)

```
scripts/
├── file/local.js            # Add Electron-aware native file dialogs
├── file/github.js           # OAuth callback adaptation for desktop
└── main.js                  # Detect Electron environment (additive)
```

---

## Phase 1 — Project Setup & Dependencies

### Goal
Initialize the Electron project inside `desktop/` with all required dependencies.

### 1.1 Create `desktop/package.json`

```json
{
  "name": "markdown-viewer-desktop",
  "version": "2.0.0",
  "description": "Markdown Viewer & Editor — Desktop Application",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "start:dev": "electron . --dev",
    "package": "electron-forge package",
    "make": "electron-forge make",
    "publish": "electron-forge publish",
    "test": "vitest --run",
    "build:backend": "bash build/build-backend.sh"
  },
  "dependencies": {
    "electron-store": "^8.1.0",
    "get-port": "^7.0.0"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "@electron-forge/cli": "^7.0.0",
    "@electron-forge/maker-dmg": "^7.0.0",
    "@electron-forge/maker-squirrel": "^7.0.0",
    "@electron-forge/maker-deb": "^7.0.0",
    "@electron-forge/maker-rpm": "^7.0.0",
    "@electron-forge/maker-zip": "^7.0.0",
    "vitest": "^2.1.8"
  }
}
```

### 1.2 Install Dependencies

```bash
cd desktop
npm install
```

### 1.3 Verify Electron Runs

```bash
cd desktop
npm start
# Should open an empty Electron window
```

### Deliverables
- [x] `desktop/package.json` created
- [x] Dependencies installed
- [x] Electron launches successfully

> ✅ **Phase 1 completed** — 2026-02-23

---

## Phase 2 — Electron Main Process

### Goal
Create the main process that manages the application window, spawns Flask, and handles
the app lifecycle.

### 2.1 `desktop/main.js` — Application Entry Point

```javascript
// desktop/main.js
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const FlaskManager = require('./flask-manager');
const { setupMenu } = require('./menu');
const { registerProtocol } = require('./protocol');
const SettingsManager = require('./settings-manager');

// Parse CLI args
const isDev = process.argv.includes('--dev');

let mainWindow = null;
let flaskManager = null;
const settingsManager = new SettingsManager();

async function createWindow(flaskPort) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Markdown Viewer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Register custom protocol for serving files and proxying API
  registerProtocol(flaskPort);

  // Load the app via custom protocol
  mainWindow.loadURL('app://./index.html');

  // Open DevTools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Update title when document changes
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });
}

app.whenReady().then(async () => {
  // Setup native menu
  setupMenu(mainWindow, settingsManager);

  // Start Flask backend
  flaskManager = new FlaskManager(settingsManager, isDev);
  const port = await flaskManager.start();

  console.log(`Flask backend running on port ${port}`);

  // Create the main window
  await createWindow(port);

  // macOS: re-create window when dock icon clicked
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow(port);
    }
  });
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup Flask on quit
app.on('before-quit', () => {
  if (flaskManager) {
    flaskManager.stop();
  }
});

// IPC Handlers for renderer process
ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile'],
    ...options
  });
  if (result.canceled) return null;
  const fs = require('fs');
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  return { path: filePath, name: path.basename(filePath), content };
});

ipcMain.handle('dialog:saveFile', async (event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'untitled.md',
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled) return null;
  const fs = require('fs');
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return { path: result.filePath, name: path.basename(result.filePath) };
});

ipcMain.handle('settings:get', () => {
  return settingsManager.getAll();
});

ipcMain.handle('settings:set', (event, settings) => {
  settingsManager.setAll(settings);
  // Restart Flask with new settings
  if (flaskManager) {
    flaskManager.restart();
  }
});

ipcMain.handle('app:isElectron', () => true);
```

### 2.2 `desktop/flask-manager.js` — Flask Process Lifecycle

```javascript
// desktop/flask-manager.js
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

class FlaskManager {
  constructor(settingsManager, isDev = false) {
    this.settingsManager = settingsManager;
    this.isDev = isDev;
    this.process = null;
    this.port = null;
  }

  async start() {
    // In dev mode, assume Flask is already running externally
    if (this.isDev) {
      this.port = this.settingsManager.get('devFlaskPort', 5050);
      console.log(`[FlaskManager] Dev mode — using external Flask on port ${this.port}`);
      return this.port;
    }

    // Find a free port
    const getPort = await import('get-port');
    this.port = await getPort.default({ port: [5050, 5051, 5052, 5053, 5054] });

    // Build environment variables from settings
    const env = this._buildEnv();

    // Determine Flask executable path
    const flaskPath = this._getFlaskPath();

    console.log(`[FlaskManager] Starting Flask on port ${this.port}...`);
    console.log(`[FlaskManager] Executable: ${flaskPath.command}`);

    this.process = spawn(flaskPath.command, flaskPath.args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: flaskPath.cwd
    });

    this.process.stdout.on('data', (data) => {
      console.log(`[Flask] ${data.toString().trim()}`);
    });

    this.process.stderr.on('data', (data) => {
      console.error(`[Flask] ${data.toString().trim()}`);
    });

    this.process.on('exit', (code) => {
      console.log(`[FlaskManager] Flask exited with code ${code}`);
      this.process = null;
    });

    // Wait for Flask to be ready
    await this._waitForReady();

    return this.port;
  }

  stop() {
    if (this.process) {
      console.log('[FlaskManager] Stopping Flask...');
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  async restart() {
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.start();
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

    // Fall back to system Python
    return {
      command: process.platform === 'darwin'
        ? '/opt/homebrew/bin/python3.13'  // macOS (project convention)
        : 'python3',                       // Linux/Windows
      args: [
        path.join(projectRoot, 'backend', 'app.py'),
        '--port', String(this.port),
        '--host', '127.0.0.1'
      ],
      cwd: projectRoot
    };
  }

  _getCompiledBackendPath() {
    const fs = require('fs');
    const projectRoot = this._getProjectRoot();
    const binaryName = process.platform === 'win32'
      ? 'markdown-viewer-backend.exe'
      : 'markdown-viewer-backend';
    const binaryPath = path.join(projectRoot, 'desktop', 'build', 'dist', binaryName);

    if (fs.existsSync(binaryPath)) {
      return binaryPath;
    }
    return null;
  }

  _getProjectRoot() {
    // In development: desktop/ is inside the project root
    // In production (packaged): resources are in app.asar or extraResources
    const { app } = require('electron');
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'app-resources');
    }
    return path.resolve(__dirname, '..');
  }

  async _waitForReady(maxRetries = 30, interval = 500) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this._healthCheck();
        console.log(`[FlaskManager] Flask is ready (attempt ${i + 1})`);
        return;
      } catch {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    throw new Error('Flask backend failed to start within timeout');
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
```

### Deliverables
- [x] `desktop/main.js` — app entry point with window management
- [x] `desktop/flask-manager.js` — Flask lifecycle (start/stop/restart/health check)
- [x] App launches, spawns Flask, shows window

> ✅ **Phase 2 completed** — 2026-02-23
> Additional: `desktop/settings-manager.js`, `desktop/preload.js`, configurable Python path detection

---

## Phase 3 — Custom Protocol & API Proxy

### Goal
Register a custom `app://` protocol that serves static files from the project filesystem
and proxies `/api/*` requests to the local Flask backend. This is the key mechanism that
allows the frontend code to work without any URL changes.

### 3.1 `desktop/protocol.js` — Protocol Handler

```javascript
// desktop/protocol.js
const { protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');

// MIME type mapping
const MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject'
};

let flaskPort = null;

function getProjectRoot() {
  const { app } = require('electron');
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app-resources');
  }
  return path.resolve(__dirname, '..');
}

function registerProtocol(port) {
  flaskPort = port;

  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // API requests → proxy to Flask
    if (pathname.startsWith('/api/') || pathname === '/api') {
      return proxyToFlask(request, pathname + url.search);
    }

    // Static file requests → serve from filesystem
    return serveStaticFile(pathname);
  });
}

async function proxyToFlask(originalRequest, apiPath) {
  const flaskUrl = `http://127.0.0.1:${flaskPort}${apiPath}`;

  try {
    // Forward the request to Flask using Electron's net module
    const response = await net.fetch(flaskUrl, {
      method: originalRequest.method,
      headers: originalRequest.headers,
      body: originalRequest.method !== 'GET' && originalRequest.method !== 'HEAD'
        ? await originalRequest.arrayBuffer()
        : undefined,
      credentials: 'include'
    });

    return response;
  } catch (error) {
    console.error(`[Protocol] Flask proxy error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: 'Backend unavailable', details: error.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function serveStaticFile(pathname) {
  const projectRoot = getProjectRoot();

  // Map URL paths to filesystem paths
  // /index.html       → public/index.html
  // /styles/base.css  → styles/base.css
  // /scripts/main.js  → scripts/main.js
  // /icons/favicon.ico → icons/favicon.ico
  let filePath;

  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(projectRoot, 'public', 'index.html');
  } else if (pathname.startsWith('/styles/')) {
    filePath = path.join(projectRoot, pathname);
  } else if (pathname.startsWith('/scripts/')) {
    filePath = path.join(projectRoot, pathname);
  } else if (pathname.startsWith('/icons/')) {
    filePath = path.join(projectRoot, pathname);
  } else {
    // Try public/ directory for other files
    filePath = path.join(projectRoot, 'public', pathname);
  }

  // Security: prevent path traversal
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(projectRoot)) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    if (!fs.existsSync(resolvedPath)) {
      console.warn(`[Protocol] File not found: ${resolvedPath}`);
      return new Response('Not Found', { status: 404 });
    }

    const content = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': mimeType }
    });
  } catch (error) {
    console.error(`[Protocol] File serve error: ${error.message}`);
    return new Response('Internal Server Error', { status: 500 });
  }
}

module.exports = { registerProtocol };
```

### 3.2 How It Works

The frontend currently does this:
```javascript
// scripts/utils/api.js
fetch('/api/llm/transform', { method: 'POST', body: ... })
```

In the web version, the browser resolves `/api/llm/transform` relative to the page origin
(`http://localhost:8000`), and nginx proxies it to Flask.

In the desktop version:
1. The page is loaded from `app://./index.html`
2. The fetch call goes to `app://./api/llm/transform`
3. The custom protocol handler intercepts it
4. It proxies the request to `http://127.0.0.1:<port>/api/llm/transform`
5. Flask processes it and returns the response
6. The protocol handler passes the response back to the renderer

**Result:** Zero changes to `scripts/config.js` or `scripts/utils/api.js`.

### 3.3 `desktop/preload.js` — Secure IPC Bridge

```javascript
// desktop/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings) => ipcRenderer.invoke('settings:set', settings),

  // Environment detection
  isElectron: () => ipcRenderer.invoke('app:isElectron'),

  // Window title
  setTitle: (title) => {
    document.title = title;
    ipcRenderer.send('window:setTitle', title);
  },

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Open external links in default browser
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
});
```

### Deliverables
- [ ] `desktop/protocol.js` — custom `app://` protocol with API proxy
- [ ] `desktop/preload.js` — secure IPC bridge
- [ ] Frontend loads correctly via `app://` protocol
- [ ] API calls proxy to Flask transparently

---

## Phase 4 — Settings UI (API Key Management)

### Goal
Replace the `.env` file with a graphical settings panel. Desktop users configure API keys,
models, and preferences through a native window.

### 4.1 `desktop/settings-manager.js` — Persistent Settings

```javascript
// desktop/settings-manager.js
const Store = require('electron-store');

const schema = {
  openrouterApiKey: { type: 'string', default: '' },
  openrouterDefaultModel: { type: 'string', default: 'anthropic/claude-3.5-sonnet' },
  openrouterModels: { type: 'string', default:
    'anthropic/claude-3.5-sonnet,anthropic/claude-3-opus,anthropic/claude-3-haiku,' +
    'openai/gpt-4-turbo,openai/gpt-4,openai/gpt-3.5-turbo,' +
    'google/gemini-pro,meta-llama/llama-3-70b-instruct'
  },
  openrouterMaxTokens: { type: 'number', default: 8000 },
  translationLanguages: { type: 'string', default:
    'Spanish,French,German,Italian,Portuguese,Russian,Chinese,' +
    'Japanese,Korean,Arabic,Hindi,Dutch,Swedish,Turkish,Polish'
  },
  githubClientId: { type: 'string', default: '' },
  githubClientSecret: { type: 'string', default: '' },
  bookstackUrl: { type: 'string', default: '' },
  bookstackApiTimeout: { type: 'number', default: 30 },
  logLevel: { type: 'string', default: 'INFO' },
  secretKey: { type: 'string', default: '' },
  devFlaskPort: { type: 'number', default: 5050 },
  // Window state
  windowWidth: { type: 'number', default: 1400 },
  windowHeight: { type: 'number', default: 900 },
  windowX: { type: 'number' },
  windowY: { type: 'number' },
  windowMaximized: { type: 'boolean', default: false }
};

class SettingsManager {
  constructor() {
    this.store = new Store({
      name: 'markdown-viewer-settings',
      schema,
      encryptionKey: 'markdown-viewer-desktop-v2'  // Encrypts sensitive data at rest
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
```

### 4.2 `desktop/settings/settings.html` — Settings Window

The settings window provides form fields for:

- **OpenRouter Configuration**
  - API Key (password field)
  - Default Model (dropdown)
  - Available Models (comma-separated text)
  - Max Tokens (number input)
  - Translation Languages (comma-separated text)

- **GitHub OAuth (Optional)**
  - Client ID
  - Client Secret

- **BookStack Integration (Optional)**
  - BookStack URL
  - API Timeout

- **Advanced**
  - Log Level (dropdown: DEBUG, INFO, WARNING, ERROR)

The settings window opens as a separate `BrowserWindow` from the menu bar
(File → Settings on Windows/Linux, App → Preferences on macOS).

### 4.3 First-Run Experience

On first launch, if `openrouterApiKey` is empty:
1. Show a welcome dialog explaining the app needs an API key
2. Open the settings window automatically
3. Validate the API key by calling `/api/health` after Flask starts
4. Show success/error feedback

### Deliverables
- [ ] `desktop/settings-manager.js` — encrypted persistent storage
- [ ] `desktop/settings/settings.html` — settings UI
- [ ] `desktop/settings/settings.css` — settings styles (Material Design 3)
- [ ] `desktop/settings/settings.js` — settings logic with validation
- [ ] First-run detection and onboarding flow

---

## Phase 5 — Native Desktop Integrations

### Goal
Enhance the app with native desktop features that improve UX beyond what the browser offers.

### 5.1 Native File Dialogs

Modify `scripts/file/local.js` to detect Electron and use native dialogs:

```javascript
// Addition to scripts/file/local.js (non-breaking, additive)

function isElectron() {
  return typeof window.electronAPI !== 'undefined';
}

// In the openFile function:
async function openLocalFile() {
  if (isElectron()) {
    // Use native Electron dialog
    const result = await window.electronAPI.openFile();
    if (result) {
      return { name: result.name, content: result.content, path: result.path };
    }
    return null;
  }

  // Existing File System Access API code (unchanged)
  // ...
}

// In the saveFile function:
async function saveLocalFile(content, filename) {
  if (isElectron()) {
    const result = await window.electronAPI.saveFile({ content, defaultName: filename });
    if (result) {
      return { name: result.name, path: result.path };
    }
    return null;
  }

  // Existing File System Access API code (unchanged)
  // ...
}
```

**Impact:** The existing browser code path is untouched. The Electron path is additive.
When running in a browser, `window.electronAPI` is undefined, so `isElectron()` returns false.

### 5.2 `desktop/menu.js` — Native Application Menu

```javascript
// desktop/menu.js
const { Menu, app, shell, BrowserWindow } = require('electron');
const path = require('path');

function setupMenu(mainWindow, settingsManager) {
  const isMac = process.platform === 'darwin';

  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => openSettings(settingsManager)
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Document',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new')
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save')
        },
        {
          label: 'Export...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu:export')
        },
        { type: 'separator' },
        ...(!isMac ? [
          {
            label: 'Settings...',
            accelerator: 'Ctrl+,',
            click: () => openSettings(settingsManager)
          },
          { type: 'separator' },
        ] : []),
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    // Integrations menu
    {
      label: 'Integrations',
      submenu: [
        {
          label: 'GitHub...',
          accelerator: 'CmdOrCtrl+G',
          click: () => mainWindow?.webContents.send('menu:github')
        },
        {
          label: 'BookStack...',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow?.webContents.send('menu:bookstack')
        }
      ]
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/your-repo/markdown-viewer')
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/your-repo/markdown-viewer/issues')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function openSettings(settingsManager) {
  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    title: 'Settings',
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadURL(`file://${path.join(__dirname, 'settings', 'settings.html')}`);
  settingsWindow.setMenuBarVisibility(false);
}

module.exports = { setupMenu };
```

### 5.3 Window State Persistence

Save and restore window size/position between sessions using `settings-manager.js`:

```javascript
// In desktop/main.js — createWindow function
const bounds = {
  width: settingsManager.get('windowWidth', 1400),
  height: settingsManager.get('windowHeight', 900),
  x: settingsManager.get('windowX'),
  y: settingsManager.get('windowY')
};

mainWindow = new BrowserWindow({ ...bounds, /* ... */ });

if (settingsManager.get('windowMaximized', false)) {
  mainWindow.maximize();
}

// Save state on resize/move
mainWindow.on('resize', () => saveBounds());
mainWindow.on('move', () => saveBounds());
mainWindow.on('maximize', () => settingsManager.set('windowMaximized', true));
mainWindow.on('unmaximize', () => settingsManager.set('windowMaximized', false));

function saveBounds() {
  if (!mainWindow.isMaximized()) {
    const bounds = mainWindow.getBounds();
    settingsManager.set('windowWidth', bounds.width);
    settingsManager.set('windowHeight', bounds.height);
    settingsManager.set('windowX', bounds.x);
    settingsManager.set('windowY', bounds.y);
  }
}
```

### 5.4 Drag & Drop Enhancement

The existing drag & drop in the web version works via browser events. In Electron,
we can enhance it to also accept files dropped onto the dock icon (macOS) or taskbar:

```javascript
// In desktop/main.js
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    mainWindow.webContents.send('file:opened', {
      path: filePath,
      name: path.basename(filePath),
      content
    });
  }
});
```

### 5.5 File Type Association (Default App for `.md` Files)

The desktop app must register as a handler for markdown files so users can:
- Double-click a `.md` file in Finder/Explorer/Nautilus to open it in the app
- Right-click → "Open With" → Markdown Viewer
- Set it as the system default app for `.md` files

This requires changes in three areas: packaging config, main process startup, and
second-instance handling.

#### 5.5.1 Forge Config — File Associations

Add `fileAssociations` to `desktop/forge.config.js` `packagerConfig`:

```javascript
// In desktop/forge.config.js → packagerConfig
fileAssociations: [
  {
    ext: 'md',
    name: 'Markdown Document',
    description: 'Markdown Document',
    mimeType: 'text/markdown',
    role: 'Editor',           // macOS: app can edit these files
    icon: path.join(__dirname, 'icons', 'md-icon')  // .icns/.ico per platform
  },
  {
    ext: 'markdown',
    name: 'Markdown Document',
    description: 'Markdown Document',
    mimeType: 'text/markdown',
    role: 'Editor',
    icon: path.join(__dirname, 'icons', 'md-icon')
  },
  {
    ext: 'txt',
    name: 'Text Document',
    description: 'Plain Text Document',
    mimeType: 'text/plain',
    role: 'Editor',
    icon: path.join(__dirname, 'icons', 'txt-icon')
  }
]
```

**What this does per platform:**

- **macOS:** Generates `CFBundleDocumentTypes` entries in `Info.plist`. The OS registers
  the app as a handler for these extensions. Users can right-click → Open With or set
  as default via Get Info → "Open with" → "Change All".

- **Windows:** The Squirrel installer writes registry keys:
  ```
  HKCU\Software\Classes\.md → MarkdownViewer.md
  HKCU\Software\Classes\MarkdownViewer.md\shell\open\command → "path\to\app.exe" "%1"
  ```
  Users can set default via Settings → Default Apps or right-click → Open With.

- **Linux:** The DEB/RPM makers generate a `.desktop` file with:
  ```ini
  [Desktop Entry]
  MimeType=text/markdown;text/plain;
  ```
  And register MIME associations via `xdg-mime`.

#### 5.5.2 Main Process — Handle File Open on Launch

When a user double-clicks a `.md` file, the OS launches the app with the file path.
Each platform delivers this differently:

**macOS** — fires the `open-file` event (already handled in 5.4, but needs enhancement
for the case where the app isn't running yet):

```javascript
// In desktop/main.js — top level, before app.whenReady()

// macOS: file opened before app is ready (cold start from file double-click)
let pendingFilePath = null;

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    // App is already running — send to renderer
    openFileInRenderer(filePath);
  } else {
    // App is starting up — store for later
    pendingFilePath = filePath;
  }
});

// After window is created (inside app.whenReady):
if (pendingFilePath) {
  openFileInRenderer(pendingFilePath);
  pendingFilePath = null;
}
```

**Windows & Linux** — the file path is passed as a command-line argument:

```javascript
// In desktop/main.js — inside app.whenReady(), after window creation

function getFileFromArgs(argv) {
  // Find the first argument that looks like a file path
  // Skip Electron's own args (--inspect, --dev, etc.)
  const fileArg = argv.find(arg =>
    !arg.startsWith('-') &&
    !arg.includes('electron') &&
    (arg.endsWith('.md') || arg.endsWith('.markdown') || arg.endsWith('.txt'))
  );
  return fileArg || null;
}

// Check command-line args for a file path
const fileFromArgs = getFileFromArgs(process.argv);
if (fileFromArgs) {
  openFileInRenderer(fileFromArgs);
}
```

**Shared helper:**

```javascript
// In desktop/main.js
function openFileInRenderer(filePath) {
  const fs = require('fs');
  try {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      console.warn(`[Main] File not found: ${absolutePath}`);
      return;
    }
    const content = fs.readFileSync(absolutePath, 'utf-8');
    mainWindow.webContents.send('file:opened', {
      path: absolutePath,
      name: path.basename(absolutePath),
      content
    });
    // Update window title
    mainWindow.setTitle(`${path.basename(absolutePath)} — Markdown Viewer`);
  } catch (error) {
    console.error(`[Main] Failed to open file: ${error.message}`);
  }
}
```

#### 5.5.3 Second Instance Handling

When the app is already running and the user double-clicks another `.md` file,
the OS tries to launch a second instance. We need to catch this, prevent the
duplicate, and instead open the file in the existing window.

```javascript
// In desktop/main.js — top level

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running — quit this one
  // The file path was passed via argv and will be handled by second-instance event
  app.quit();
} else {
  app.on('second-instance', (event, argv, workingDirectory) => {
    // Windows/Linux: file path is in argv
    const filePath = getFileFromArgs(argv);
    if (filePath) {
      openFileInRenderer(path.resolve(workingDirectory, filePath));
    }

    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
```

#### 5.5.4 Frontend — Listen for File Open Events

Add a listener in the frontend to handle files sent from the main process:

```javascript
// Addition to scripts/main.js (additive, non-breaking)

// Listen for files opened via OS file association (Electron only)
if (typeof window.electronAPI !== 'undefined') {
  const { ipcRenderer } = window.electronAPI;

  // This event is sent from main.js when a file is opened via
  // double-click, drag-to-dock, or second-instance
  window.addEventListener('DOMContentLoaded', () => {
    // The preload script exposes this via contextBridge
    if (window.electronAPI.onFileOpened) {
      window.electronAPI.onFileOpened((fileData) => {
        // fileData = { path, name, content }
        setEditorContent(fileData.content);
        setDocumentTitle(fileData.name);
        setDocumentSource('local', { path: fileData.path, name: fileData.name });
      });
    }
  });
}
```

Update `desktop/preload.js` to expose the listener:

```javascript
// Addition to desktop/preload.js
const { ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods ...

  // File opened via OS file association
  onFileOpened: (callback) => {
    ipcRenderer.on('file:opened', (event, fileData) => callback(fileData));
  }
});
```

#### 5.5.5 App Icon for File Types

Create dedicated document icons so `.md` files show the Markdown Viewer icon in
the file explorer:

```
desktop/icons/
├── icon.icns          # App icon (macOS)
├── icon.ico           # App icon (Windows)
├── icon.png           # App icon (Linux)
├── md-icon.icns       # .md file icon (macOS)
├── md-icon.ico        # .md file icon (Windows)
└── txt-icon.icns      # .txt file icon (macOS)
```

The file icons should be visually related to the app icon but with a document
shape and the "MD" text overlay, following platform conventions.

#### 5.5.6 Summary of Platform Behavior

| Action | macOS | Windows | Linux |
|--------|-------|---------|-------|
| Double-click `.md` file (app closed) | `open-file` event after launch | File path in `process.argv` | File path in `process.argv` |
| Double-click `.md` file (app open) | `open-file` event | `second-instance` event with argv | `second-instance` event with argv |
| Drag file to dock/taskbar | `open-file` event | N/A | N/A |
| "Open With" context menu | `open-file` event | File path in `process.argv` | File path in `process.argv` |
| Set as default app | Finder → Get Info → Open With | Settings → Default Apps | `xdg-mime default` |

### Deliverables
- [ ] Native file dialogs (open/save) via IPC
- [ ] `desktop/menu.js` — full native menu bar
- [ ] Window state persistence (size, position, maximized)
- [ ] macOS dock file drop support
- [ ] Keyboard shortcuts mapped to menu items
- [ ] File type association for `.md`, `.markdown`, `.txt` extensions
- [ ] `forge.config.js` `fileAssociations` configured for all platforms
- [ ] Cold-start file open (app launched by double-clicking a file)
- [ ] Second-instance handling (file opens in existing window)
- [ ] Document type icons for file explorer
- [ ] Manual testing: double-click `.md` opens in app on all 3 platforms

---

## Phase 6 — GitHub OAuth for Desktop

### Goal
Adapt the GitHub OAuth flow to work in a desktop context where there's no public callback URL.

### 6.1 The Problem

The web version uses a standard OAuth redirect:
1. User clicks "GitHub" → redirected to `github.com/login/oauth/authorize`
2. GitHub redirects back to `http://localhost:5050/api/github/callback`
3. Flask exchanges the code for a token

In the desktop app, this still works because Flask runs on localhost. The flow is:

1. User clicks "GitHub" in the app
2. Open the GitHub auth URL in the **system default browser** (not inside Electron)
3. GitHub redirects to `http://localhost:<port>/api/github/callback`
4. Flask handles the callback, stores the token in session
5. Flask serves a small HTML page that says "Authentication successful. You can close this tab."
6. The Electron app detects the auth is complete (polls `/api/github/user`)

### 6.2 Implementation

```javascript
// Modification to scripts/file/github.js (additive)

function initiateGitHubAuth() {
  if (isElectron()) {
    // Open in system browser instead of redirecting the Electron window
    window.electronAPI.openExternal(authUrl);

    // Poll for auth completion
    pollGitHubAuth();
    return;
  }

  // Existing redirect behavior (unchanged)
  window.location.href = authUrl;
}

async function pollGitHubAuth(maxAttempts = 60, interval = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const user = await APIClient.get('/github/user');
      if (user && user.login) {
        // Auth successful
        showToast('GitHub authentication successful');
        updateGitHubUI(user);
        return;
      }
    } catch { /* not authenticated yet */ }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  showToast('GitHub authentication timed out', 'error');
}
```

### 6.3 Callback Page

Add a simple callback success page to the Flask backend:

```python
# Addition to backend/routes/github.py — after token exchange
# Return an HTML page instead of redirect when detected as desktop callback
@github_bp.route('/api/github/callback')
def github_callback():
    # ... existing token exchange logic ...

    # If this is a desktop app callback, show a close-tab page
    return '''
    <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h2>✅ Authentication Successful</h2>
      <p>You can close this tab and return to the app.</p>
      <script>setTimeout(() => window.close(), 3000);</script>
    </body></html>
    '''
```

### Deliverables
- [ ] GitHub OAuth opens in system browser
- [ ] Polling mechanism for auth completion
- [ ] Callback success page for desktop flow
- [ ] Existing web OAuth flow unchanged

---

## Phase 7 — Pandoc Integration

### Goal
Handle pandoc dependency for export features (PDF, DOCX).

### 7.1 Strategy: Detect & Guide (Phase 1)

On app startup, check if pandoc is available:

```javascript
// In desktop/flask-manager.js — after Flask starts
async checkPandoc() {
  const { execSync } = require('child_process');
  try {
    const version = execSync('pandoc --version').toString().split('\n')[0];
    console.log(`[FlaskManager] Pandoc found: ${version}`);
    return true;
  } catch {
    console.warn('[FlaskManager] Pandoc not found — export features will be limited');
    return false;
  }
}
```

If pandoc is missing, show a non-blocking notification:
- "PDF and DOCX export requires pandoc. [Install Instructions] [Dismiss]"
- Link to https://pandoc.org/installing.html
- Markdown export still works without pandoc

### 7.2 Strategy: Bundle Pandoc (Phase 2, optional)

For a fully self-contained app, bundle pandoc binaries per platform:

```
desktop/
└── vendor/
    ├── pandoc-darwin-arm64    # macOS Apple Silicon
    ├── pandoc-darwin-x64      # macOS Intel
    ├── pandoc-linux-x64       # Linux
    └── pandoc-win32-x64.exe   # Windows
```

Set `PANDOC_PATH` environment variable to point to the bundled binary when spawning Flask.
This adds ~30MB per platform to the app size.

### Deliverables
- [ ] Pandoc detection on startup
- [ ] User notification if pandoc is missing
- [ ] (Optional) Bundled pandoc binaries per platform

---

## Phase 8 — Python Bundling with PyInstaller

### Goal
Compile the Flask backend into a standalone executable so end users don't need Python installed.

### 8.1 PyInstaller Spec File

```python
# desktop/build/pyinstaller.spec
# -*- mode: python ; coding: utf-8 -*-

import sys
import os

block_cipher = None
project_root = os.path.abspath(os.path.join(os.path.dirname(SPEC), '..', '..'))

a = Analysis(
    [os.path.join(project_root, 'backend', 'app.py')],
    pathex=[project_root],
    binaries=[],
    datas=[
        (os.path.join(project_root, 'backend', 'routes'), 'backend/routes'),
        (os.path.join(project_root, 'backend', 'services'), 'backend/services'),
        (os.path.join(project_root, 'backend', 'config.py'), 'backend'),
        (os.path.join(project_root, 'backend', '__init__.py'), 'backend'),
        (os.path.join(project_root, 'LLM_PROMPTS.md'), '.'),
    ],
    hiddenimports=[
        'flask', 'flask_cors', 'dotenv',
        'backend.config', 'backend.routes.llm',
        'backend.routes.github', 'backend.routes.export',
        'backend.routes.bookstack', 'backend.services.openrouter',
        'backend.services.github_service', 'backend.services.bookstack_service',
        'backend.services.export_service',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'test', 'unittest'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='markdown-viewer-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # Keep console for logging
    target_arch=None,
)
```

### 8.2 Build Script

```bash
#!/bin/bash
# desktop/build/build-backend.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Building Flask backend with PyInstaller..."
echo "Project root: $PROJECT_ROOT"

# Ensure PyInstaller is installed
pip install pyinstaller

# Build
cd "$PROJECT_ROOT"
pyinstaller desktop/build/pyinstaller.spec \
  --distpath desktop/build/dist \
  --workpath desktop/build/work \
  --clean

echo "Build complete: desktop/build/dist/markdown-viewer-backend"
```

### 8.3 Integration with Flask Manager

The `flask-manager.js` already checks for the compiled binary (see Phase 2):
- If `desktop/build/dist/markdown-viewer-backend` exists → use it
- Otherwise → fall back to system Python

This means developers use system Python during development, and the packaged app
uses the compiled binary.

### Deliverables
- [ ] `desktop/build/pyinstaller.spec` — PyInstaller configuration
- [ ] `desktop/build/build-backend.sh` — build script (macOS/Linux)
- [ ] `desktop/build/build-backend.bat` — build script (Windows)
- [ ] Compiled binary runs Flask correctly
- [ ] Flask manager auto-detects compiled vs. system Python

---

## Phase 9 — Packaging & Distribution

### Goal
Package the Electron app into distributable installers for macOS, Windows, and Linux.

### 9.1 `desktop/forge.config.js` — Electron Forge Configuration

```javascript
// desktop/forge.config.js
const path = require('path');

module.exports = {
  packagerConfig: {
    name: 'Markdown Viewer',
    executableName: 'markdown-viewer',
    icon: path.join(__dirname, 'icons', 'icon'),
    appBundleId: 'com.markdownviewer.desktop',
    appCategoryType: 'public.app-category.developer-tools',

    // Include backend and frontend as extra resources
    extraResource: [
      path.join(__dirname, '..', 'backend'),
      path.join(__dirname, '..', 'public'),
      path.join(__dirname, '..', 'scripts'),
      path.join(__dirname, '..', 'styles'),
      path.join(__dirname, '..', 'icons'),
      path.join(__dirname, '..', 'LLM_PROMPTS.md'),
      // Include compiled backend binary if it exists
      path.join(__dirname, 'build', 'dist'),
    ],

    // macOS code signing (optional, for distribution)
    osxSign: {},
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    },

    // Ignore development files
    ignore: [
      /\.git/,
      /node_modules/,
      /docs\//,
      /backend\/tests/,
      /backend\/logs/,
      /\.env$/,
      /\.env\.example$/,
      /docker-compose\.yml$/,
      /Dockerfile$/,
      /nginx\.conf$/,
      /supervisord\.conf$/,
      /\.md$/,  // Except LLM_PROMPTS.md (in extraResource)
    ]
  },

  makers: [
    // macOS DMG
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        icon: path.join(__dirname, 'icons', 'icon.icns'),
        background: path.join(__dirname, 'icons', 'dmg-background.png'),
        contents: [
          { x: 130, y: 220, type: 'file', path: '' },  // App
          { x: 410, y: 220, type: 'link', path: '/Applications' }
        ]
      }
    },

    // macOS/Linux ZIP (fallback)
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux']
    },

    // Windows Squirrel installer
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'MarkdownViewer',
        authors: 'Markdown Viewer Team',
        description: 'Markdown Viewer & Editor Desktop Application',
        iconUrl: 'https://raw.githubusercontent.com/your-repo/markdown-viewer/main/desktop/icons/icon.ico',
        setupIcon: path.join(__dirname, 'icons', 'icon.ico')
      }
    },

    // Linux DEB
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Markdown Viewer Team',
          homepage: 'https://github.com/your-repo/markdown-viewer',
          icon: path.join(__dirname, 'icons', 'icon.png'),
          categories: ['Development', 'TextEditor'],
          description: 'Markdown Viewer & Editor with LLM transformations'
        }
      }
    },

    // Linux RPM
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          homepage: 'https://github.com/your-repo/markdown-viewer',
          icon: path.join(__dirname, 'icons', 'icon.png'),
          categories: ['Development', 'TextEditor']
        }
      }
    }
  ]
};
```

### 9.2 Build Commands

```bash
# Development
cd desktop
npm start              # Run in dev mode (uses system Python)
npm run start:dev      # Same, with --dev flag (connects to external Flask)

# Package (creates distributable in desktop/out/)
cd desktop
npm run build:backend  # Compile Flask with PyInstaller first
npm run package        # Package Electron app
npm run make           # Create platform-specific installers

# Output locations:
# macOS:   desktop/out/make/Markdown Viewer.dmg
# Windows: desktop/out/make/squirrel.windows/x64/MarkdownViewerSetup.exe
# Linux:   desktop/out/make/deb/x64/markdown-viewer_2.0.0_amd64.deb
```

### 9.3 Resource Mapping in Packaged App

When packaged, Electron Forge places extra resources in:
- macOS: `Markdown Viewer.app/Contents/Resources/app-resources/`
- Windows: `resources/app-resources/`
- Linux: `resources/app-resources/`

The `flask-manager.js` and `protocol.js` already handle this via:
```javascript
if (app.isPackaged) {
  return path.join(process.resourcesPath, 'app-resources');
}
```

### 9.4 App Size Estimates

| Component | Size |
|-----------|------|
| Electron shell | ~80 MB |
| Frontend (HTML/CSS/JS) | ~2 MB |
| Flask backend (PyInstaller) | ~50 MB |
| Python dependencies | included in PyInstaller |
| Pandoc (if bundled) | ~30 MB |
| **Total (without pandoc)** | **~132 MB** |
| **Total (with pandoc)** | **~162 MB** |

### Deliverables
- [ ] `desktop/forge.config.js` — packaging configuration
- [ ] macOS `.dmg` builds successfully
- [ ] Windows `.exe` installer builds successfully
- [ ] Linux `.deb` and `.rpm` build successfully
- [ ] Packaged app runs standalone (no Python/Node required)

---

## Phase 10 — Testing Strategy

### Goal
Ensure the desktop app works correctly across platforms.

### 10.1 Unit Tests

```
desktop/test/
├── flask-manager.test.js    # Flask lifecycle tests
├── settings-manager.test.js # Settings persistence tests
├── protocol.test.js         # Protocol handler tests
└── menu.test.js             # Menu construction tests
```

Test areas:
- Flask process starts and stops cleanly
- Health check polling works
- Settings are persisted and encrypted
- Protocol handler serves correct MIME types
- Protocol handler proxies API calls correctly
- Path traversal prevention works
- Menu items are correctly constructed per platform

### 10.2 Integration Tests

- App launches and shows the main window
- Flask backend starts and responds to health checks
- Frontend loads correctly via `app://` protocol
- API calls from frontend reach Flask and return data
- Settings changes restart Flask with new environment
- File open/save dialogs work
- Window state is persisted between sessions

### 10.3 Manual Testing Checklist

**Core Features:**
- [ ] Open local markdown file via File → Open
- [ ] Edit markdown and see live preview
- [ ] Save file via File → Save
- [ ] Export to MD, HTML, PDF, DOCX
- [ ] All LLM transformations work (translate, tone, summarize, expand)
- [ ] Custom LLM prompt works
- [ ] Find & Replace works
- [ ] Newline removal works (all three modes)

**Integrations:**
- [ ] GitHub OAuth flow (opens browser, polls, completes)
- [ ] GitHub file browse and open
- [ ] GitHub file save
- [ ] BookStack authentication
- [ ] BookStack browse and open
- [ ] BookStack save with conflict detection
- [ ] BookStack export from local file

**Desktop-Specific:**
- [ ] Native file dialogs (open/save)
- [ ] Menu bar works (all items)
- [ ] Keyboard shortcuts work
- [ ] Window state persists (size, position)
- [ ] Settings panel opens and saves
- [ ] First-run experience shows settings
- [ ] App quits cleanly (Flask process killed)
- [ ] macOS dock icon file drop
- [ ] Dark mode follows system theme

**Cross-Platform:**
- [ ] macOS (Apple Silicon + Intel)
- [ ] Windows 10/11
- [ ] Ubuntu/Debian Linux
- [ ] Fedora/RHEL Linux

### Deliverables
- [ ] Unit test suite for desktop-specific code
- [ ] Integration test suite
- [ ] Manual testing checklist completed per platform

---

## Development Workflow

### Daily Development

```bash
# Terminal 1: Start Flask backend (with hot reload)
source venv/bin/activate
DEBUG=true python backend/app.py --port 5050

# Terminal 2: Start Electron in dev mode
cd desktop
npm run start:dev
# Electron connects to the already-running Flask on port 5050
# Changes to frontend files (scripts/, styles/, public/) are reflected on reload (Ctrl+R)
# Changes to backend files require Flask restart (automatic with DEBUG=true)
```

### Production Build

```bash
# Step 1: Compile Flask backend
cd desktop
npm run build:backend

# Step 2: Package Electron app
npm run make

# Step 3: Test the packaged app
open out/make/Markdown\ Viewer.dmg  # macOS
```

### CI/CD Pipeline (future)

```yaml
# .github/workflows/desktop-build.yml
name: Build Desktop App
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.13' }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pip install -r backend/requirements.txt pyinstaller
      - run: cd desktop && npm install
      - run: cd desktop && npm run build:backend
      - run: cd desktop && npm run make
      - uses: actions/upload-artifact@v4
        with:
          name: desktop-${{ matrix.os }}
          path: desktop/out/make/**/*
```

---

## Impact on Existing Codebase

### Files Modified (minimal, non-breaking)

| File | Change | Web Impact |
|------|--------|------------|
| `scripts/file/local.js` | Add `isElectron()` check before file dialogs | None — browser path unchanged |
| `scripts/file/github.js` | Add Electron OAuth flow (poll-based) | None — redirect path unchanged |
| `scripts/main.js` | Add Electron environment detection | None — additive only |
| `backend/routes/github.py` | Add HTML callback page for desktop | Minimal — web still redirects |

### Files NOT Modified

| File | Reason |
|------|--------|
| `scripts/config.js` | Custom protocol makes `/api` work as-is |
| `scripts/utils/api.js` | No URL changes needed |
| `public/index.html` | Loaded as-is via protocol |
| `styles/**` | No changes |
| `backend/app.py` | No changes |
| `backend/config.py` | No changes |
| `backend/services/**` | No changes |
| `docker-compose.yml` | Web deployment unchanged |
| `Dockerfile` | Web deployment unchanged |
| `nginx.conf` | Web deployment unchanged |

### Backward Compatibility

The web version continues to work exactly as before:
- Docker deployment: unchanged
- Manual setup: unchanged
- Reverse proxy: unchanged
- All existing tests pass without modification

---

## Risk Assessment

### High Risk

| Risk | Mitigation |
|------|------------|
| PyInstaller compatibility with all Flask dependencies | Test early; maintain a list of hidden imports; use `--collect-all` for problematic packages |
| Cross-platform Python bundling | Build on each target platform (CI matrix); don't cross-compile |
| Electron + Flask process management on Windows | Windows uses different signals (no SIGTERM); use `process.kill()` with tree-kill package |

### Medium Risk

| Risk | Mitigation |
|------|------------|
| App size too large for users | Start without bundled pandoc; use UPX compression; consider Tauri for v3 |
| GitHub OAuth callback port conflicts | Dynamic port allocation already handles this |
| CDN dependencies (marked.js, tiktoken) need internet | Bundle these locally for offline support in a future phase |

### Low Risk

| Risk | Mitigation |
|------|------------|
| Custom protocol security | Path traversal prevention already implemented; CSP headers |
| Settings encryption | electron-store handles this; sensitive data encrypted at rest |
| macOS code signing | Optional for development; required only for App Store / notarization |

---

## Implementation Timeline

### Estimated Effort

| Phase | Description | Effort | Dependencies |
|-------|-------------|--------|--------------|
| Phase 1 | Project Setup | 1 day | None |
| Phase 2 | Main Process + Flask Manager | 2-3 days | Phase 1 |
| Phase 3 | Custom Protocol + Preload | 2 days | Phase 2 |
| Phase 4 | Settings UI | 2 days | Phase 3 |
| Phase 5 | Native Integrations | 2-3 days | Phase 3 |

Phase 5 includes file type association (5.5) which adds ~1 day for cross-platform
testing of file associations, second-instance handling, and document icons.

| Phase 6 | GitHub OAuth | 1 day | Phase 3 |
| Phase 7 | Pandoc Integration | 0.5 day | Phase 2 |
| Phase 8 | PyInstaller Bundling | 2 days | Phase 2 |
| Phase 9 | Packaging & Distribution | 2-3 days | Phase 8 |
| Phase 10 | Testing | 2-3 days | All phases |
| **Total** | | **~18-21 days** | |

### Suggested Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 4 → Phase 6 → Phase 7
                                                                  ↓
                                              Phase 8 → Phase 9 → Phase 10
```

Phases 4 (Settings) and 6 (GitHub OAuth) can be done in parallel.
Phase 7 (Pandoc) is independent and can be done anytime after Phase 2.
Phase 8 (PyInstaller) should be started early to catch compatibility issues.

---

## Appendix: CDN Dependencies for Offline Support

The current frontend loads two libraries from CDN:

```html
<!-- public/index.html -->
<script src="https://cdn.jsdelivr.net/npm/marked@11.1.0/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/js-tiktoken@1.0.7/dist/tiktoken.js"></script>
```

For a desktop app, these should be bundled locally for offline support:

1. Download the files to `scripts/vendor/`:
   ```bash
   mkdir -p scripts/vendor
   curl -o scripts/vendor/marked.min.js https://cdn.jsdelivr.net/npm/marked@11.1.0/marked.min.js
   curl -o scripts/vendor/tiktoken.js https://cdn.jsdelivr.net/npm/js-tiktoken@1.0.7/dist/tiktoken.js
   ```

2. Update `public/index.html` to detect environment:
   ```html
   <!-- Use local files in Electron, CDN in browser -->
   <script src="/scripts/vendor/marked.min.js"></script>
   <script src="/scripts/vendor/tiktoken.js"></script>
   ```

   Since the web version also benefits from self-hosted libraries (no CDN dependency),
   this change can be applied universally.

This is a low-priority enhancement that can be done in any phase.

---

**End of Implementation Plan** • Status: 📋 Ready for Implementation
