# ARCHITECTURE.md

**Version:** 1.4.0
**Last Updated:** 2025-12-29
**Status:** ✅ Current

---

## 1. Purpose of This Document

This document serves as the **architectural source of truth** for the Markdown Viewer project.
It maps the system structure, component relationships, stability zones, and behavioral contracts
for AI coding assistants. This is NOT a coding guide—see [AI*.md](#8-ai-coding-rules-and-behavioral-contracts) for that.

**Target audience:** AI coding assistants joining the project.
**Read time:** < 5 minutes.
**Maintenance:** Update when architecture changes, not when features are added.

---

## 2. High-Level System Overview

Markdown Viewer is a **full-stack web application** for editing markdown with LLM-powered transformations,
GitHub integration, and BookStack wiki sync. No build step required for frontend.

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
┌───────▼────────┐              ┌─────────▼────────┐
│   Frontend     │              │   Backend API    │
│   (Static)     │◄─────────────┤   (Flask)        │
│   HTML/CSS/JS  │   /api/*     │   Port 5050      │
│   Port 8000    │              └─────────┬────────┘
└────────────────┘                        │
                                ┌─────────┴─────────┐
                                │                   │
                     ┌──────────▼──────┐   ┌────────▼────────┐
                     │   Services      │   │  External APIs  │
                     │   - OpenRouter  │   │  - OpenRouter   │
                     │   - GitHub      │   │  - GitHub       │
                     │   - BookStack   │   │  - BookStack    │
                     │   - Export      │   │  - pandoc       │
                     └─────────────────┘   └─────────────────┘
```

**Key characteristics:**
- **Frontend:** Vanilla JS (ES6 modules), no build step, served via nginx/Python HTTP
- **Backend:** Flask REST API, session-based auth for BookStack, OAuth for GitHub
- **Communication:** Relative URLs (`/api/*`) for zero-config deployment
- **Deployment:** Docker Compose with nginx reverse proxy

---

## 3. Repository Structure

```
markdown-viewer/
├── backend/                    # Flask application (Python 3.11+)
│   ├── app.py                 # Application factory & entry point
│   ├── config.py              # Environment-based configuration
│   ├── routes/                # API endpoints (blueprints)
│   │   ├── llm.py            # LLM transformations (translate, summarize, etc.)
│   │   ├── github.py         # GitHub OAuth & file operations
│   │   ├── bookstack.py      # BookStack wiki integration
│   │   └── export.py         # Document export (HTML, PDF, DOCX)
│   ├── services/              # Business logic layer
│   │   ├── openrouter.py     # OpenRouter API client
│   │   ├── github_service.py # GitHub API wrapper (PyGithub)
│   │   ├── bookstack_service.py # BookStack API client
│   │   └── export_service.py # Pandoc wrapper
│   └── tests/                 # pytest test suite
│       ├── unit/             # Service layer tests
│       ├── integration/      # Route/API tests
│       └── fixtures/         # Test data & mocks
│
├── public/                     # Frontend HTML entry point
│   └── index.html             # Single-page application
│
├── scripts/                    # Frontend JavaScript (ES6 modules)
│   ├── main.js                # Application bootstrap
│   ├── config.js              # Frontend configuration (API URLs)
│   ├── editor/                # CodeMirror integration
│   │   ├── editor.js         # Editor initialization & management
│   │   └── sync.js           # Scroll synchronization (v1.3.0)
│   ├── markdown/              # Markdown rendering
│   │   ├── parser.js         # marked.js wrapper
│   │   └── renderer.js       # Custom renderer extensions
│   ├── transforms/            # LLM transformation UI
│   │   ├── transform-ui.js   # Transform panel controller
│   │   ├── llm-client.js     # Backend API client
│   │   ├── newline-remover.js # Smart newline removal
│   │   ├── find-replace.js   # Search and replace
│   │   └── ai-regex.js       # AI-powered regex builder
│   ├── file/                  # File operations
│   │   ├── local.js          # File System Access API
│   │   ├── github.js         # GitHub file browser
│   │   ├── bookstack.js      # BookStack browser & smart save
│   │   └── export.js         # Multi-format export
│   ├── ui/                    # UI components
│   │   └── editable-title.js # Document title editor
│   ├── utils/                 # Utilities
│   │   ├── api.js            # Fetch wrapper
│   │   ├── storage.js        # LocalStorage manager
│   │   └── tokenizer.js      # Token counter
│   └── tests/                 # Frontend tests
│       ├── unit/             # Vitest unit tests
│       └── e2e/              # Playwright E2E tests
│
├── styles/                     # CSS (Material Design 3)
│   ├── base.css               # Design tokens & variables
│   ├── layout.css             # Grid & responsive layout
│   └── components/            # Component-specific styles
│
├── docs/                       # Documentation & chat logs
│   ├── chats/                 # Conversation history (context)
│   ├── BOOKSTACK_API_INTEGRATION.md
│   └── CODE_REVIEW_*.md
│
├── AI.md                       # Frontend coding rules (HTML/CSS/JS)
├── AI_FLASK.md                 # Backend coding rules (Python/Flask)
├── CLAUDE.md                   # Project-level AI instructions
├── README.md                   # User documentation
├── DOCUMENTATION_INDEX.md      # Documentation map
├── PROJECT_SUMMARY.md          # Technical overview
├── CONFIGURATION.md            # Config reference
├── .env.example                # Environment template
├── docker-compose.yml          # Container orchestration
├── Dockerfile                  # Multi-stage build
├── nginx.conf                  # Reverse proxy config
├── supervisord.conf            # Process manager
└── package.json                # Frontend test dependencies
```

**File size compliance:** All JS files ≤ 800 lines per [AI.md](AI.md) guidelines.

---

## 4. Core Components

### 4.1 Backend (Flask REST API)

**Location:** `backend/`
**Language:** Python 3.11+
**Framework:** Flask 3.0, Flask-CORS

**Routes (Blueprints):**
- `llm.py` - LLM transformations via OpenRouter (translate, summarize, expand, custom prompts)
- `github.py` - GitHub OAuth flow & repository file operations
- `bookstack.py` - BookStack session auth, hierarchical browsing, page CRUD with conflict detection
- `export.py` - Document export via pandoc (HTML, PDF with XeLaTeX, DOCX)

**Services:**
- `openrouter.py` - OpenRouter API client, prompt construction, 300+ model support
- `github_service.py` - PyGithub wrapper for repos, files, commits
- `bookstack_service.py` - BookStack REST API client, markdown export with fallback
- `export_service.py` - Pandoc subprocess wrapper, Unicode support

**Configuration:** `config.py` loads from environment (.env), validates required keys, provides defaults.

**Testing:** Comprehensive pytest suite with mocked external APIs (80%+ coverage target).

### 4.2 Frontend (Vanilla JavaScript)

**Location:** `public/`, `scripts/`, `styles/`
**Architecture:** ES6 modules, no build step, progressive enhancement
**Design System:** Material Design 3 (tokens, 8px spacing, elevation)

**Key modules:**
- `main.js` - Bootstraps app, wires event handlers, initializes components
- `editor/editor.js` - CodeMirror 6 initialization with textarea fallback
- `editor/sync.js` - Proportional bidirectional scroll sync (v1.3.0)
- `transforms/transform-ui.js` - LLM transform panel controller
- `file/bookstack.js` - BookStack browser with hierarchical navigation & smart save
- `file/github.js` - GitHub OAuth & file browser
- `file/local.js` - File System Access API with fallback

**CDN dependencies:**
- marked.js v11 (GFM parser)
- CodeMirror 6 (planned full integration, currently textarea fallback)

**Testing:** Vitest (unit), Playwright (E2E workflows).

### 4.3 External Integrations

**OpenRouter (Required):**
- API: https://openrouter.ai/api/v1
- Auth: Bearer token via `OPENROUTER_API_KEY`
- Models: Configurable via `OPENROUTER_MODELS` env var
- Cost: Pay-per-use (varies by model)

**GitHub (Optional):**
- API: GitHub REST v3
- Auth: OAuth2 flow (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)
- Scopes: `repo` (read/write repository files)

**BookStack (Optional):**
- API: BookStack REST API (`/api/*`)
- Auth: Session-based with Token ID + Token Secret (24h expiry)
- Version: Compatible with v21.12+
- Export: Native markdown endpoint with HTML fallback

**Pandoc (Required for export):**
- CLI tool for document conversion
- PDF: Uses XeLaTeX engine for Unicode support
- Install: System package (brew, apt, etc.)

### 4.4 Deployment & Infrastructure

**Docker:**
- Multi-stage Dockerfile (build → production image)
- `docker-compose.yml` orchestrates nginx + Flask
- Supervisor manages Flask process (stdout/stderr logging)

**nginx:**
- Serves static files (`/public`, `/scripts`, `/styles`)
- Reverse proxies `/api/*` to Flask (port 5050)
- Configured for relative URL support (zero-config deployment)

**Environment:**
- `.env` file for secrets (not committed)
- `.env.example` template with all options
- Config priority: CLI args > env vars > defaults

---

## 5. Data Flow & Runtime Model

### 5.1 LLM Translation Flow

```
User clicks "Translate" → Spanish
         │
         ▼
scripts/transforms/transform-ui.js
  - Captures event, reads editor content
  - Calls llm-client.js
         │
         ▼
scripts/transforms/llm-client.js
  POST /api/llm/transform
  { operation: "translate", target_language: "Spanish", content: "..." }
         │
         ▼
backend/routes/llm.py
  - Validates request
  - Calls openrouter.py service
         │
         ▼
backend/services/openrouter.py
  - Constructs prompt from LLM_PROMPTS.md
  - Calls OpenRouter API
  - Returns translated markdown
         │
         ▼
Response flows back ← ← ← ← ←
         │
         ▼
transform-ui.js
  - Updates editor content
  - Shows success toast
```

### 5.2 BookStack Smart Save Flow

```
User edits page loaded from BookStack
User presses Ctrl+S (or Save button)
         │
         ▼
scripts/file/bookstack.js
  - Detects source: BookStack (has page_id in metadata)
  - Calls savePage(page_id, content)
         │
         ▼
  PUT /api/bookstack/pages/{id}
  { markdown: "...", updated_at: "..." }
         │
         ▼
backend/routes/bookstack.py
  - Validates session auth
  - Checks for conflicts (updated_at)
         │
         ▼
backend/services/bookstack_service.py
  - Calls BookStack API: PUT /api/pages/{id}
  - Handles 409 Conflict (offers overwrite)
         │
         ▼
Response: { id, slug, updated_at }
         │
         ▼
bookstack.js
  - Updates metadata with new updated_at
  - Shows "Saved to BookStack" toast
```

### 5.3 Reverse Proxy Runtime Model

```
Production Deployment (HTTPS)
────────────────────────────────

Browser → https://md.yourdomain.com/api/health
              │
              ▼
External Reverse Proxy (nginx/Traefik)
  - Terminates SSL
  - X-Forwarded-Proto: https
              │
              ▼
Docker Container (port 80)
  └─ nginx (internal)
      - Serves /public, /scripts, /styles
      - Proxies /api/* → localhost:5050
              │
              ▼
      Flask (port 5050)
        - Processes request
        - Returns JSON
```

**Key:** Frontend uses `/api` (relative URL) → works in all environments.

---

## 6. Configuration & Environment Assumptions

### 6.1 Required Environment Variables

```bash
OPENROUTER_API_KEY=sk-or-v1-...     # Required for LLM features
```

### 6.2 Optional Environment Variables

```bash
# Backend
BACKEND_PORT=5050                   # Default: 5050
BACKEND_HOST=0.0.0.0                # Default: 0.0.0.0
DEBUG=false                         # Default: false
SECRET_KEY=<random>                 # Auto-generated if not set

# Logging
LOG_LEVEL=INFO                      # DEBUG, INFO, WARNING, ERROR
LOG_FORMAT=detailed                 # simple, detailed
DISABLE_FILE_LOGGING=true           # Recommended for Docker

# OpenRouter
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_MODELS=claude-3.5-sonnet,gpt-4-turbo,...  # Comma-separated
TRANSLATION_LANGUAGES=Spanish,French,German,...       # Comma-separated

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:5050/api/github/callback

# BookStack (optional)
BOOKSTACK_URL=https://wiki.yourdomain.com
BOOKSTACK_API_TIMEOUT=30

# CORS
CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
```

### 6.3 Runtime Assumptions

- **Python:** 3.11+ with venv at `venv/`
- **pandoc:** Installed system-wide for export features
- **Docker:** Uses multi-stage build, supervisor for process management
- **Browser:** Modern browser with ES6 module support
- **File System Access API:** Progressive enhancement (has fallback)

---

## 7. Stability Zones

Components mapped by production-readiness and change risk:

### ✅ Stable (Production-ready, low change risk)

**Backend:**
- `backend/app.py` - Flask application factory
- `backend/config.py` - Environment configuration
- `backend/routes/llm.py` - LLM transformations
- `backend/routes/export.py` - Export endpoints
- `backend/services/openrouter.py` - OpenRouter client
- `backend/services/export_service.py` - Pandoc wrapper

**Frontend:**
- `scripts/main.js` - Application bootstrap
- `scripts/editor/editor.js` - Editor management
- `scripts/markdown/parser.js` - marked.js wrapper
- `scripts/transforms/transform-ui.js` - Transform panel
- `scripts/transforms/llm-client.js` - API client
- `scripts/file/local.js` - Local file operations
- `scripts/file/export.js` - Export manager
- `scripts/utils/api.js` - Fetch wrapper
- `scripts/utils/storage.js` - LocalStorage

**Styles:**
- `styles/base.css` - Design tokens
- `styles/layout.css` - Grid system
- All component styles in `styles/components/`

### 🔄 Semi-Stable (Functional, may evolve)

**Backend:**
- `backend/routes/github.py` - GitHub integration (OAuth stable, may add features)
- `backend/routes/bookstack.py` - BookStack integration (v1.4.0, conflict detection evolving)
- `backend/services/github_service.py` - GitHub wrapper
- `backend/services/bookstack_service.py` - BookStack client (native export added v1.4.1)

**Frontend:**
- `scripts/editor/sync.js` - Scroll sync (v1.3.0, may refine algorithm)
- `scripts/file/github.js` - GitHub browser (flat list, may add tree view)
- `scripts/file/bookstack.js` - BookStack browser (smart save added v1.4.0)
- `scripts/transforms/find-replace.js` - Search/replace feature
- `scripts/ui/editable-title.js` - Title editor

### ⚠️ Experimental (Working, may be replaced)

**Frontend:**
- `scripts/transforms/ai-regex.js` - AI-powered regex (new feature)
- CodeMirror 6 full integration (currently using textarea fallback)

**Backend:**
- BookStack conflict resolution strategy (may enhance diff viewer)

### 🔮 Planned (Not yet implemented)

- Real-time collaboration (multi-user editing)
- Dropbox/Google Drive integrations
- Vim keybindings
- Custom markdown extensions
- Plugin system
- Templates library

**Rule:** Only modify ✅ Stable components with explicit user request. Refactors require approval.

---

## 8. AI Coding Rules and Behavioral Contracts

### 8.1 Rule Precedence Hierarchy

When coding rules conflict, follow this priority order (highest to lowest):

```
1. CLAUDE.md           - Project-level overrides (Python path, venv, behavior)
2. AI_FLASK.md         - Backend-specific rules (Flask, testing, structure)
3. AI.md               - Frontend-specific rules (HTML/CSS/JS, Material Design)
4. ARCHITECTURE.md     - Architectural constraints (stability zones)
5. Language defaults   - PEP8, ES6 best practices
```

**Example conflict resolution:**
- [CLAUDE.md](CLAUDE.md) says: "Never start code right after USER question. Propose solution first."
- AI.md says: "Keep JS files ~800 lines max."
- Both apply, CLAUDE.md takes precedence for behavior, AI.md for structure.

### 8.2 Mandatory Rule Files

**ALL AI assistants MUST read and follow these files before coding:**

1. **[CLAUDE.md](CLAUDE.md)** - Project-level instructions
   - Use `/opt/homebrew/bin/python3.13` for Python
   - Use `venv/bin/activate` for backend tests
   - **CRITICAL:** Propose solutions, ask for approval before implementing
   - Check `docs/chats/` for prior context

2. **[AI_FLASK.md](AI_FLASK.md)** - Backend coding rules
   - Follow PEP8 with type hints
   - Separate business logic (services) from routes
   - **Testing MANDATORY:** Write pytest tests BEFORE marking work complete
   - Target 80%+ test coverage
   - Mock external APIs (OpenRouter, GitHub, BookStack, pandoc)
   - Files ≤ 800 lines

3. **[AI.md](AI.md)** - Frontend coding rules
   - Material Design 3 principles (8px spacing, elevation, tokens)
   - **No inline CSS/JS** (strict separation of concerns)
   - ES6 modules, each file ≤ 800 lines
   - **Relative URLs only** for APIs (`/api/*`, never `http://localhost`)
   - Progressive enhancement (functional HTML/CSS baseline)
   - Accessibility first (focus states, contrast, keyboard support)

### 8.3 Critical Behavioral Contracts

**DO NOT:**
- ❌ Start coding immediately after user request (violates CLAUDE.md)
- ❌ Hardcode URLs like `http://localhost:5000` (violates AI.md)
- ❌ Create files with inline CSS/JS (violates AI.md)
- ❌ Skip tests for new features (violates AI_FLASK.md)
- ❌ Modify ✅ Stable components without explicit request (violates Section 7)
- ❌ Duplicate coding rules in ARCHITECTURE.md (you're reading them now)

**DO:**
- ✅ Propose solution → Get approval → Implement
- ✅ Read `docs/chats/` for context before starting
- ✅ Use relative URLs (`/api/health` not `http://...`)
- ✅ Write tests BEFORE marking work complete
- ✅ Check stability zones before modifying components
- ✅ Consult AI*.md files as authoritative sources

### 8.4 Testing Requirements

**Backend (pytest):**
- Unit tests for all services in `backend/tests/unit/`
- Integration tests for all routes in `backend/tests/integration/`
- Mock external APIs using fixtures in `backend/tests/fixtures/`
- Run: `pytest backend/tests/` (from venv)

**Frontend (Vitest + Playwright):**
- Unit tests for utilities in `scripts/tests/unit/`
- E2E tests for workflows in `scripts/tests/e2e/`
- Run: `npm test` (unit), `npm run test:e2e` (E2E)

**Coverage target:** 80%+ for services and routes.

### 8.5 Architecture Constraints

**Path references:**
- Frontend → Backend: Always use `/api/*` (relative)
- Module imports: Use relative paths (`./utils/api.js`, `../config.js`)
- Static assets: Relative (`/styles/base.css`, `/icons/favicon.ico`)

**File organization:**
- Backend: `routes/` for endpoints, `services/` for logic
- Frontend: Feature-based folders (`editor/`, `transforms/`, `file/`)
- Tests: Mirror source structure (`tests/unit/`, `tests/integration/`)

**Deployment compatibility:**
- Code must work in: local dev, Docker, reverse proxy (nginx/Traefik)
- No environment-specific URLs in source code
- Configuration via `.env`, never hardcoded

---

## 9. Quick Start for AI Assistants

### Step 1: Read Rule Files (< 2 min)

```bash
cat CLAUDE.md      # Project behavior & constraints
cat AI_FLASK.md    # Backend rules (if touching Python)
cat AI.md          # Frontend rules (if touching JS/CSS)
```

### Step 2: Check Prior Context (< 1 min)

```bash
ls docs/chats/     # Recent conversations
# Look for relevant filenames matching current task
```

### Step 3: Understand Current Task Scope (< 2 min)

**Ask yourself:**
- Is this a new feature, bug fix, refactor, or question?
- Which components are affected? (Check Section 7 stability zones)
- Do I need to write tests? (Yes, if touching services/routes)
- Does this require user approval? (Yes, per CLAUDE.md)

### Step 4: Propose Solution

**Template:**
```
I've analyzed the codebase. Here's my proposed solution:

1. [Component to modify] - [Reason]
2. [Tests to write] - [Coverage]
3. [Files affected] - [Stability zone: ✅/🔄/⚠️]

Would you like me to proceed with this implementation?
```

### Step 5: Implement with Compliance

**Checklist:**
- [ ] Using correct Python path (`/opt/homebrew/bin/python3.13`)
- [ ] Backend tests use venv (`venv/bin/activate`)
- [ ] No inline CSS/JS in HTML
- [ ] Relative URLs for API calls (`/api/*`)
- [ ] Files ≤ 800 lines
- [ ] Tests written and passing
- [ ] Only modified components with explicit approval

### Common Tasks Quick Reference

**Add new LLM transformation:**
1. Check `backend/routes/llm.py` (✅ Stable - needs approval)
2. Add prompt to `LLM_PROMPTS.md`
3. Update `backend/services/openrouter.py`
4. Add tests: `backend/tests/integration/test_llm_routes.py`
5. Update frontend: `scripts/transforms/transform-ui.js` (✅ Stable)

**Add new file source integration:**
1. Create `scripts/file/newsource.js` (🔮 Planned → ⚠️ Experimental)
2. Create `backend/routes/newsource.py` (🔮 Planned → ⚠️ Experimental)
3. Create `backend/services/newsource_service.py`
4. Write tests for both layers
5. Update `scripts/main.js` to wire UI (✅ Stable - needs care)

**Fix bug in stable component:**
1. Identify root cause
2. Write failing test that reproduces bug
3. Fix bug
4. Verify test passes
5. Check no regressions in related tests

**Modify configuration:**
1. Update `.env.example` with new variable
2. Update `backend/config.py` to load it
3. Document in `CONFIGURATION.md`
4. Update `README.md` if user-facing

---

## Appendix: Key Documentation Links

**For AI assistants:**
- [CLAUDE.md](CLAUDE.md) - Your behavioral contract (READ FIRST)
- [AI_FLASK.md](AI_FLASK.md) - Backend coding rules
- [AI.md](AI.md) - Frontend coding rules
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) - Full docs map

**For users:**
- [README.md](README.md) - User guide & setup
- [QUICKSTART.md](QUICKSTART.md) - 5-minute setup
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Technical overview
- [CONFIGURATION.md](CONFIGURATION.md) - Environment variables
- [docs/BOOKSTACK_API_INTEGRATION.md](docs/BOOKSTACK_API_INTEGRATION.md) - BookStack guide

**For developers:**
- [LLM_PROMPTS.md](LLM_PROMPTS.md) - All LLM prompts
- [README_TESTING.md](README_TESTING.md) - Testing guide
- [SECURITY.md](SECURITY.md) - Security considerations
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Production deployment

---

**End of ARCHITECTURE.md** • Lines: ~290 • Compliance: ✅
