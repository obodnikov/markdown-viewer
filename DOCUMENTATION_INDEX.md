# Documentation Index

Complete reference for all documentation in the Markdown Viewer project.

---

## Quick Start

- **[README.md](README.md)** - Main project documentation
- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute setup guide
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Technical overview

---

## Configuration Guides

### Backend Configuration

- **[PORT_CONFIGURATION.md](PORT_CONFIGURATION.md)** - Backend port setup
- **[MODEL_CONFIGURATION.md](MODEL_CONFIGURATION.md)** - LLM model configuration
- **[CONFIGURATION.md](CONFIGURATION.md)** - Complete backend configuration reference
- **[.env.example](.env.example)** - Environment variables template

### Frontend Configuration

- **[FRONTEND_CONFIGURATION.md](FRONTEND_CONFIGURATION.md)** - Frontend backend URL setup
- **[scripts/config.js](scripts/config.js)** - Frontend configuration file

---

## LLM & Prompts

- **[LLM_PROMPTS.md](LLM_PROMPTS.md)** - 📋 **Complete LLM prompts reference**
  - All system prompts
  - All operation prompts (translate, summarize, etc.)
  - API parameters
  - Temperature settings
  - Prompt engineering principles
  - Testing guidelines

---

## Troubleshooting & Fixes

### Translation Issues

- **[TRANSLATION_DEEP_ANALYSIS.md](TRANSLATION_DEEP_ANALYSIS.md)** - Deep dive into translation truncation issue
  - Root cause analysis (behavioral, not technical)
  - Model behavior comparison
  - Temperature explanation
  - Prompt engineering solutions

- **[TRANSLATION_TRUNCATION_FIX.md](TRANSLATION_TRUNCATION_FIX.md)** - Initial fix documentation
  - Token limit configuration
  - max_tokens parameter
  - Cost implications

### Port & CORS Issues

- **[FIXES_PORT_AND_CORS.md](FIXES_PORT_AND_CORS.md)** - Port configuration and CORS fixes
  - Frontend hardcoded port fix
  - CORS preflight configuration
  - Testing commands

### Frontend Server Issues

- **[FRONTEND_SERVER_FIX.md](FRONTEND_SERVER_FIX.md)** - Frontend 404 errors fix
  - serve-frontend.py creation
  - Path resolution issues

---

## Implementation Details

- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Configurable model list implementation
  - Data flow diagram
  - Frontend integration
  - Testing procedures

- **[FIXES_APPLIED.md](FIXES_APPLIED.md)** - All fixes chronologically
  - OpenRouter package version
  - Import errors
  - Port configuration

---

## Deployment

- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment guide
  - Prerequisites
  - Installation
  - Configuration
  - Testing
  - Production deployment

---

## Code Documentation

### Backend

#### Core Files
- **[backend/app.py](backend/app.py)** - Flask application
- **[backend/config.py](backend/config.py)** - Configuration management
- **[start.py](start.py)** - Backend launcher

#### Services
- **[backend/services/openrouter.py](backend/services/openrouter.py)** - OpenRouter LLM integration
- **[backend/services/github_service.py](backend/services/github_service.py)** - GitHub API integration

#### Routes
- **[backend/routes/llm.py](backend/routes/llm.py)** - LLM transformation endpoints
- **[backend/routes/github.py](backend/routes/github.py)** - GitHub integration endpoints
- **[backend/routes/export.py](backend/routes/export.py)** - Export endpoints (PDF, DOCX, HTML)

### Frontend

#### Core Files
- **[public/index.html](public/index.html)** - Main HTML structure
- **[scripts/main.js](scripts/main.js)** - Application entry point
- **[scripts/config.js](scripts/config.js)** - Frontend configuration

#### Transforms
- **[scripts/transforms/transform-ui.js](scripts/transforms/transform-ui.js)** - Transform UI controller
- **[scripts/transforms/llm-client.js](scripts/transforms/llm-client.js)** - LLM API client
- **[scripts/transforms/newline-remover.js](scripts/transforms/newline-remover.js)** - Client-side newline removal

#### Utilities
- **[scripts/utils/api.js](scripts/utils/api.js)** - Backend API client
- **[scripts/utils/storage.js](scripts/utils/storage.js)** - Local storage utilities

#### Markdown
- **[scripts/markdown/parser.js](scripts/markdown/parser.js)** - Markdown parser (marked.js integration)
- **[scripts/markdown/renderer.js](scripts/markdown/renderer.js)** - Custom markdown renderer

#### Editor
- **[scripts/editor/editor.js](scripts/editor/editor.js)** - Editor initialization and management
- **[scripts/editor/sync.js](scripts/editor/sync.js)** - Scroll synchronization (v1.3.0)

#### File Operations
- **[scripts/file/local.js](scripts/file/local.js)** - Local file operations
- **[scripts/file/github.js](scripts/file/github.js)** - GitHub file operations
- **[scripts/file/export.js](scripts/file/export.js)** - Export functionality

---

## Architecture Documentation

### System Architecture

```
Frontend (Python HTTP Server)
    ↓
JavaScript (ES6 Modules)
    ↓
API Client (scripts/utils/api.js)
    ↓
Backend (Flask + Flask-CORS)
    ↓
Services (OpenRouter, GitHub, Pandoc)
    ↓
External APIs (OpenRouter.ai, GitHub API)
```

### Data Flow: Translation

```
1. User clicks "Translate" button
   ↓
2. transform-ui.js captures event
   ↓
3. llm-client.js sends POST to /api/llm/transform
   ↓
4. backend/routes/llm.py receives request
   ↓
5. openrouter.py builds prompt and calls OpenRouter API
   ↓
6. Response flows back through layers
   ↓
7. UI updates with translated content
```

### Configuration Priority

**Backend Port:**
```
CLI argument --port
    ↓ (if not provided)
Environment variable BACKEND_PORT
    ↓ (if not set)
Config.py default (5000)
```

**Frontend Backend URL:**
```
localStorage 'api_base_url'
    ↓ (if not set)
URL parameter ?api_url=...
    ↓ (if not provided)
scripts/config.js BACKEND_URL
```

---

## Quick Reference by Task

### "I want to configure the backend port"
→ [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md)

### "I want to add/remove LLM models"
→ [MODEL_CONFIGURATION.md](MODEL_CONFIGURATION.md)

### "Translation is being truncated"
→ [TRANSLATION_DEEP_ANALYSIS.md](TRANSLATION_DEEP_ANALYSIS.md)

### "I want to understand the prompts"
→ [LLM_PROMPTS.md](LLM_PROMPTS.md)

### "CORS errors in browser console"
→ [FIXES_PORT_AND_CORS.md](FIXES_PORT_AND_CORS.md)

### "Frontend can't connect to backend"
→ [FRONTEND_CONFIGURATION.md](FRONTEND_CONFIGURATION.md)

### "I want to deploy to production"
→ [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

### "CSS/JS files showing 404"
→ [FRONTEND_SERVER_FIX.md](FRONTEND_SERVER_FIX.md)

### "How do I start the application?"
→ [QUICKSTART.md](QUICKSTART.md)

---

## File Organization

```
markdown-viewer/
├── README.md                          # Main documentation
├── DOCUMENTATION_INDEX.md             # This file
├── QUICKSTART.md                      # Quick setup
├── PROJECT_SUMMARY.md                 # Technical overview
│
├── Configuration/
│   ├── .env.example                   # Environment template
│   ├── CONFIGURATION.md               # Full config guide
│   ├── PORT_CONFIGURATION.md          # Port setup
│   ├── MODEL_CONFIGURATION.md         # Model setup
│   └── FRONTEND_CONFIGURATION.md      # Frontend setup
│
├── LLM Documentation/
│   ├── LLM_PROMPTS.md                 # All prompts
│   ├── TRANSLATION_DEEP_ANALYSIS.md   # Translation analysis
│   └── TRANSLATION_TRUNCATION_FIX.md  # Initial fix
│
├── Troubleshooting/
│   ├── FIXES_PORT_AND_CORS.md         # Port/CORS fixes
│   ├── FRONTEND_SERVER_FIX.md         # Server fixes
│   └── FIXES_APPLIED.md               # All fixes
│
├── Implementation/
│   ├── IMPLEMENTATION_COMPLETE.md     # Model config impl
│   └── DEPLOYMENT_CHECKLIST.md        # Deployment guide
│
├── Backend/
│   ├── backend/
│   │   ├── app.py                     # Flask app
│   │   ├── config.py                  # Configuration
│   │   ├── services/
│   │   │   ├── openrouter.py          # LLM integration
│   │   │   └── github_service.py      # GitHub API
│   │   └── routes/
│   │       ├── llm.py                 # LLM endpoints
│   │       ├── github.py              # GitHub endpoints
│   │       └── export.py              # Export endpoints
│   ├── start.py                       # Backend launcher
│   └── requirements.txt               # Python deps
│
├── Frontend/
│   ├── public/
│   │   └── index.html                 # Main HTML
│   ├── scripts/
│   │   ├── config.js                  # Frontend config
│   │   ├── main.js                    # Entry point
│   │   ├── transforms/                # LLM transforms
│   │   ├── utils/                     # Utilities
│   │   ├── markdown/                  # Markdown handling
│   │   ├── editor/                    # Editor management
│   │   └── file/                      # File operations
│   ├── styles/                        # CSS files
│   └── serve-frontend.py              # Frontend server
│
└── Development/
    ├── run-dev.sh                     # Dev launcher
    ├── verify-install.sh              # Installation check
    └── Dockerfile                     # Docker config
```

---

## Recent Changes

### Latest Features

1. **Synchronized Scrolling** (v1.3.0 - Latest)
   - Proportional bidirectional scroll sync in split view mode
   - Automatically enables/disables based on view mode
   - Supports both CodeMirror and textarea editor
   - Fixed: Now correctly syncs with preview-pane scroll container

2. **Configurable LLM Models**
   - Models now configured in .env file
   - Frontend auto-loads from backend API
   - [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)

3. **Translation Truncation Fixed**
   - Enhanced prompts to prevent meta-commentary
   - Added temperature=0.3 for focused output
   - [TRANSLATION_DEEP_ANALYSIS.md](TRANSLATION_DEEP_ANALYSIS.md)

4. **Port Configuration**
   - Backend port configurable via .env or CLI
   - Frontend config.js for backend URL
   - [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md)

5. **CORS Issues Resolved**
   - Enhanced CORS configuration with preflight support
   - [FIXES_PORT_AND_CORS.md](FIXES_PORT_AND_CORS.md)

---

## Contributing

When adding new features or fixes:

1. **Update relevant documentation** in this index
2. **Add to [FIXES_APPLIED.md](FIXES_APPLIED.md)** if it's a fix
3. **Update [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** for architectural changes
4. **Add prompts to [LLM_PROMPTS.md](LLM_PROMPTS.md)** if adding LLM features

---

## Support

### Getting Help

1. Check relevant documentation from this index
2. Review [TROUBLESHOOTING](#quick-reference-by-task) section
3. Check [FIXES_APPLIED.md](FIXES_APPLIED.md) for known issues

### Reporting Issues

Include:
- Error messages (browser console + server logs)
- Configuration (.env settings)
- Steps to reproduce
- Expected vs actual behavior

---

## License & Credits

See [README.md](README.md) for license information.

**Key Technologies:**
- Backend: Flask, OpenRouter SDK, PyGithub, Pandoc
- Frontend: Vanilla JavaScript (ES6), marked.js
- UI: Material Design 3
- LLM: OpenRouter.ai (Claude, GPT-4, Gemini, Llama)

---

**Last Updated:** 2025-12-12

**Version:** 1.3.0

**Documentation Status:** ✅ Complete and current
