# Markdown Viewer — Desktop Application

Cross-platform desktop app (macOS, Windows, Linux) wrapping the existing Markdown Viewer
web application using Electron. The desktop version provides identical functionality to the
web version plus native desktop benefits: file dialogs, system menus, window state
persistence, standalone executable (no Python/Node required for end users).

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Electron Application                    │
│                                                           │
│  ┌─────────────────┐      ┌────────────────────────────┐ │
│  │  Main Process    │      │   Renderer (BrowserWindow) │ │
│  │                  │      │                            │ │
│  │  - Spawns Flask  │      │   public/index.html        │ │
│  │  - app:// proto  │      │   scripts/*.js             │ │
│  │  - IPC handlers  │      │   styles/*.css             │ │
│  │  - Native menus  │      │                            │ │
│  │  - Settings mgmt │      │   fetch('/api/*') ──┐      │ │
│  └────────┬─────────┘      └────────────────────┼──────┘ │
│           │                                      │        │
│  ┌────────▼──────────────────────────────────────▼──────┐ │
│  │            Custom Protocol Handler (app://)           │ │
│  │                                                       │ │
│  │  app://./styles/*   → serve from filesystem           │ │
│  │  app://./scripts/*  → serve from filesystem           │ │
│  │  app://./api/*      → proxy to Flask localhost:PORT   │ │
│  └───────────────────────────────┬───────────────────────┘ │
│                                  │                         │
│  ┌───────────────────────────────▼───────────────────────┐ │
│  │          Flask Backend (Child Process)                 │ │
│  │                                                        │ │
│  │  python backend/app.py --port <dynamic>                │ │
│  │  OpenRouter / GitHub / BookStack / Pandoc              │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

- **Custom `app://` protocol** — serves static files and proxies API calls so the
  frontend uses relative `/api/*` URLs without any changes
- **Dynamic port allocation** — Flask binds to a random free port to avoid conflicts
- **Zero changes to web version** — Docker/web deployment continues to work unchanged
- **PyInstaller for production** — compiles Flask into a standalone binary, eliminating
  the Python dependency for end users
- **electron-store for settings** — replaces `.env` with an encrypted GUI settings panel
- **Single-instance lock** — double-clicking a second `.md` file opens it in the
  existing window instead of launching a duplicate

## Project Structure

```
desktop/
├── main.js                  # Electron main process entry point
├── preload.js               # Secure IPC bridge (contextBridge)
├── protocol.js              # Custom app:// protocol handler + API proxy
├── flask-manager.js         # Flask process lifecycle (start/stop/restart/health)
├── settings-manager.js      # Encrypted persistent settings (electron-store)
├── menu.js                  # Native application menu bar
├── package.json             # Dependencies & scripts
├── placeholder.html         # Fallback page (Phase 1 artifact)
├── .gitignore
├── settings/
│   ├── settings.html        # Settings window UI
│   ├── settings.css         # Settings window styles (dark theme)
│   └── settings.js          # Settings window logic + validation
└── build/
    ├── pyinstaller.spec     # PyInstaller spec for Flask backend
    ├── build-backend.sh     # Build script (macOS/Linux)
    └── build-backend.bat    # Build script (Windows)
```

## Development

### Prerequisites

- Node.js 18+
- Python 3.11+ with project dependencies installed (`pip install -r backend/requirements.txt`)
- The web app's backend and frontend code in the parent directory

### Quick Start (dev mode)

Run Flask externally, then connect Electron to it:

```bash
# Terminal 1 — start Flask backend with hot reload
source venv/bin/activate
DEBUG=true python backend/app.py --port 5050

# Terminal 2 — start Electron in dev mode (connects to external Flask on port 5050)
cd desktop
npm install   # first time only
npm run start:dev
```

In dev mode, Electron skips spawning Flask and connects to port 5050 (configurable
via Settings → Dev Flask Port).

### Quick Start (integrated mode)

Electron spawns Flask automatically:

```bash
cd desktop
npm install   # first time only
npm start
```

Flask manager auto-detects Python from: user setting → `python3` → `python` →
platform-specific paths. Configure a custom path in Settings → Python Path if needed.

## Production Build

### 1. Compile Flask backend (PyInstaller)

```bash
cd desktop
npm run build:backend
# Output: desktop/build/dist/markdown-viewer-backend
```

The build script creates an isolated virtualenv, installs dependencies, and runs
PyInstaller. The resulting binary is ~50 MB and includes all Python dependencies.

### 2. Package Electron app (Electron Forge)

```bash
cd desktop
npm run package    # creates app in desktop/out/
npm run make       # creates platform installers in desktop/out/make/
```

When packaged, `flask-manager.js` automatically detects the compiled binary at
`build/dist/markdown-viewer-backend` and uses it instead of system Python.

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Launch Electron (spawns Flask automatically) |
| `npm run start:dev` | Launch Electron in dev mode (uses external Flask) |
| `npm run build:backend` | Compile Flask with PyInstaller |
| `npm run package` | Package app with Electron Forge |
| `npm run make` | Create platform-specific installers |
| `npm test` | Run tests (vitest) |

## Configuration

All settings are managed through the GUI: **File → Settings** (Windows/Linux) or
**App → Preferences** (macOS), keyboard shortcut `Ctrl+,` / `Cmd+,`.

Settings are stored encrypted on disk via `electron-store` at the OS-standard config
location (`~/Library/Application Support/` on macOS, `%APPDATA%` on Windows,
`~/.config/` on Linux).

| Setting | Description | Default |
|---------|-------------|---------|
| OpenRouter API Key | Required for LLM features | — |
| Default Model | LLM model for transformations | `anthropic/claude-3.5-sonnet` |
| Available Models | Comma-separated model list | (several pre-configured) |
| Max Tokens | LLM response token limit | 8000 |
| Translation Languages | Comma-separated language list | 15 languages |
| GitHub Client ID/Secret | Optional, for GitHub integration | — |
| BookStack URL | Optional, for BookStack integration | — |
| Python Path | Override auto-detected Python | auto-detect |
| API Port | Fixed Flask port (0 = auto) | 0 |
| Log Level | Backend log verbosity | INFO |

On first launch, if no API key is configured, a welcome dialog prompts the user to
open Settings.

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project setup & dependencies | ✅ Complete |
| 2 | Electron main process + Flask manager | ✅ Complete |
| 3 | Custom `app://` protocol + API proxy | ✅ Complete |
| 4 | Settings UI (API key management) | ✅ Complete |
| 5 | Native desktop integrations (menus, dialogs, single-instance) | ✅ Complete |
| 6 | GitHub OAuth for desktop (system browser + polling) | ✅ Complete |
| 7 | Pandoc integration (detect & guide) | ✅ Complete |
| 8 | Python bundling with PyInstaller | ✅ Complete (scripts ready, binary untested) |
| 9 | Packaging & distribution (Electron Forge) | ⬜ Not started |
| 10 | Testing strategy | ⬜ Not started |

### Phase 9 remaining work

- `forge.config.js` — Electron Forge packaging configuration
- App icons (`icon.icns`, `icon.ico`, `icon.png`)
- File type associations for `.md` / `.markdown` / `.txt`
- Document type icons for file explorer
- Platform-specific installer testing (DMG, Squirrel, DEB, RPM)

### Phase 10 remaining work

- Unit tests for flask-manager, settings-manager, protocol handler
- Integration tests (app launch → Flask health → frontend load → API round-trip)
- Manual cross-platform testing checklist

## Features Implemented

- **Flask lifecycle management** — auto-start, health check polling, graceful shutdown,
  restart on settings change, early-exit detection with stderr capture
- **Python auto-detection** — tries multiple candidates, supports user override
- **Custom protocol** — serves static files with correct MIME types, proxies API calls
  to Flask, path traversal protection
- **Native file dialogs** — open/save via IPC, Electron-aware detection in frontend
- **Native menu bar** — File (New/Open/Save/Export), Edit, View, Integrations
  (GitHub/BookStack), Help; platform-correct layout (macOS app menu vs Windows File menu)
- **Window state persistence** — size, position, maximized state saved between sessions
- **Single-instance lock** — second launch focuses existing window, opens file argument
- **macOS open-file** — double-click `.md` or drag to dock opens in app
- **Settings UI** — dark-themed form with validation, encrypted storage, backend restart
- **First-run onboarding** — welcome dialog prompts for API key configuration
- **Pandoc detection** — non-blocking dialog with install link if pandoc is missing
- **GitHub OAuth** — opens system browser, polls for completion, no redirect needed
- **Secure IPC bridge** — contextIsolation enabled, no nodeIntegration, explicit API surface
