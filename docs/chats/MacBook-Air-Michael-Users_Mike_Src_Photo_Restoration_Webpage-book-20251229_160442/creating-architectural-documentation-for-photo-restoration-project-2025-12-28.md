# Claude Chat Export
**Generated: 2025-12-29 16:04:57**

---

👤 **USER:**
> You are acting as a senior software architect and AI coding assistant.

Context:
This is a long-living personal PET project that has evolved over time.
Coding rules and AI behavior are defined in dedicated AI*.md files
and MUST NOT be duplicated or redefined in architecture documents.

Your task is to analyze the repository structure, existing documentation in root and docs/ directories and prvious conversations under docs/chats/ directory,
then create or update ARCHITECTURE.md as an architectural source of truth.

––––––––––––––––––––
IMPORTANT CONSTRAINT:

- Do NOT redefine coding rules, formatting rules, or stack-specific practices
- Do NOT duplicate content from AI*.md files
- ARCHITECTURE.md must only reference AI*.md files as authoritative sources
- If AI rules are missing for a stack, explicitly mark this as a gap

––––––––––––––––––––
YOUR OBJECTIVES:

1. Analyze repository structure and identify architectural components
2. Cross-check existing documentation and identify outdated or conflicting parts
3. Document the current architecture as it exists today
4. Add a clear section that instructs AI coders to follow AI*.md files
5. Explicitly mark stable, evolving, and experimental areas

––––––––––––––––––––
FINAL GOAL:

ARCHITECTURE.md should allow any AI coder to:
- Understand system structure
- Know WHERE to find coding rules
- Avoid architectural violations
- Behave conservatively and predictably

I'll analyze the repository structure, documentation, and previous conversations to create or update ARCHITECTURE.md as an architectural source of truth.

Let me start by exploring the repository structure and existing documentation.

Now let me check if ARCHITECTURE.md already exists and examine the docker-compose and deployment structure:

Perfect! Now I have a comprehensive understanding of the project. Let me create a task plan and then propose the ARCHITECTURE.md:

Based on my analysis, I'll now propose an ARCHITECTURE.md that serves as the architectural source of truth while properly delegating to AI*.md files for coding rules.

## Proposed ARCHITECTURE.md

I've analyzed your repository structure, existing documentation, and AI rules. Here's my proposal for ARCHITECTURE.md:

### Key Design Decisions:

1. **Separation of Concerns**: ARCHITECTURE.md documents the **system structure**, not coding rules
2. **No Duplication**: References AI*.md files as authoritative sources for coding standards
3. **Current State Documentation**: Documents the architecture as it exists today
4. **Stability Markers**: Clearly marks stable vs evolving components
5. **Integration Flow**: Shows how components interact without duplicating implementation details

### Structure:

```markdown
# Photo Restoration Webpage - Architecture Documentation

**Last Updated:** 2025-12-28  
**Version:** 1.0.0  
**Status:** Production-Ready (Phase 1 Complete, Phase 2.4 Complete)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [AI Coding Rules](#ai-coding-rules)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Directory Structure](#directory-structure)
6. [Component Architecture](#component-architecture)
7. [Data Flow](#data-flow)
8. [Configuration System](#configuration-system)
9. [Authentication & Authorization](#authentication--authorization)
10. [Deployment Architecture](#deployment-architecture)
11. [Testing Strategy](#testing-strategy)
12. [Architectural Stability Map](#architectural-stability-map)
13. [Integration Points](#integration-points)

---

## System Overview

Photo Restoration Webpage is an AI-powered web application for restoring old scanned photos using multiple AI providers (HuggingFace, Replicate). It features a modern React frontend, async Python backend, and containerized deployment.

### Project Characteristics

- **Type:** Long-living personal PET project
- **Evolution:** Incremental development through documented phases
- **Architecture Documentation:** This file (ARCHITECTURE.md)
- **Coding Rules:** Separate AI*.md files (see [AI Coding Rules](#ai-coding-rules))

---

## AI Coding Rules

⚠️ **CRITICAL: DO NOT duplicate coding rules in this file**

All AI assistants MUST follow the coding standards defined in these files:

### Backend Rules
- **[AI.md](AI.md)** - General Python rules (PEP8, type hints, structure)
- **[AI_FastAPI.md](AI_FastAPI.md)** - FastAPI-specific patterns
- **[AI-PYTHON-REST-API.md](AI-PYTHON-REST-API.md)** - REST API conventions
- **[AI_SQLite.md](AI_SQLite.md)** - Database patterns with SQLAlchemy
- **[AI_FLASK.md](AI_FLASK.md)** - (Legacy, not used in current architecture)

### Frontend Rules
- **[AI_FRONTEND.md](AI_FRONTEND.md)** - Vite + React + TypeScript standards
- **[AI_WEB_COMMON.md](AI_WEB_COMMON.md)** - General web development rules
- **[tmp/AI_WEB_DESIGN_SQOWE.md](tmp/AI_WEB_DESIGN_SQOWE.md)** - sqowe brand design system

### Provider-Specific Rules
- **[AI_replicate_provider.md](AI_replicate_provider.md)** - Replicate API integration patterns

### General Project Rules
- **[CLAUDE.md](CLAUDE.md)** - Project workflow and AI assistant behavior
  - Always propose before implementing
  - Never auto-stage/commit
  - Check previous conversations in docs/chats/
  - Use specific Python/Node versions

### Reference Documentation
- **[ROADMAP.md](ROADMAP.md)** - Development phases and feature timeline
- **[TECHNICAL_DEBTS.md](TECHNICAL_DEBTS.md)** - Known issues and future improvements
- **[docs/chats/](docs/chats/)** - Previous implementation conversations
- **[tmp/Brand-Guidelines.pdf](tmp/Brand-Guidelines.pdf)** - sqowe brand guidelines

---

## Technology Stack

### Backend
| Component | Technology | Version | Status |
|-----------|-----------|---------|--------|
| Language | Python | 3.13+ | Stable |
| Framework | FastAPI | Latest | Stable |
| ORM | SQLAlchemy (async) | Latest | Stable |
| Database | SQLite | 3.x | Stable (MVP), Evolving (may migrate to PostgreSQL) |
| Auth | JWT (python-jose) | Latest | Stable |
| Password Hash | bcrypt (passlib) | Latest | Stable |
| HTTP Client | httpx (async) | Latest | Stable |
| Image Processing | Pillow | Latest | Stable |
| Migrations | Alembic | Latest | Stable |

### Frontend
| Component | Technology | Version | Status |
|-----------|-----------|---------|--------|
| Build Tool | Vite | Latest | Stable |
| Framework | React | 18+ | Stable |
| Language | TypeScript | Latest (strict mode) | Stable |
| State Management | Zustand | Latest | Stable |
| Testing | Vitest + RTL | Latest | Stable |
| Styling | CSS Modules + sqowe brand | N/A | Stable |

### Deployment
| Component | Technology | Version | Status |
|-----------|-----------|---------|--------|
| Container Runtime | Docker | Latest | Stable |
| Orchestration | Docker Compose | v3.8 | Stable |
| Frontend Server | serve (npm) | Latest | Stable |
| Backend Server | uvicorn | Latest | Stable |
| Reverse Proxy | External (nginx/Apache/Traefik/Caddy) | User-provided | Stable |

### AI Providers
| Provider | Purpose | Status |
|----------|---------|--------|
| HuggingFace Inference API | Upscaling, enhancement | Stable |
| Replicate API | Advanced restoration models | Stable |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External Reverse Proxy                    │
│              (nginx/Apache/Traefik/Caddy)                   │
│                         Port 80/443                          │
└───────────┬──────────────────────────────┬──────────────────┘
            │                              │
            │ /api, /uploads, /processed   │ / (SPA)
            ↓                              ↓
┌───────────────────────┐      ┌───────────────────────┐
│   Backend Container   │      │  Frontend Container   │
│     (FastAPI)        │      │   (serve + React)     │
│      Port 8000       │      │      Port 3000        │
│                      │      │                       │
│  ┌────────────────┐  │      │  ┌────────────────┐  │
│  │ REST API       │  │      │  │ Static Files   │  │
│  │ /api/v1/*      │  │      │  │ (built React)  │  │
│  ├────────────────┤  │      │  └────────────────┘  │
│  │ Auth (JWT)     │  │      │                       │
│  ├────────────────┤  │      │  Features:            │
│  │ SQLAlchemy     │  │      │  - Authentication     │
│  │ (async ORM)    │  │      │  - Photo Restoration  │
│  ├────────────────┤  │      │  - History            │
│  │ AI Providers   │  │      │  - Admin Panel        │
│  │ - HuggingFace  │  │      │  - Profile            │
│  │ - Replicate    │  │      │                       │
│  └────────────────┘  │      └───────────────────────┘
│                      │
│  ┌────────────────┐  │
│  │ SQLite DB      │  │
│  │ /data/*.db     │  │
│  ├────────────────┤  │
│  │ File Storage   │  │
│  │ /data/uploads  │  │
│  │ /data/processed│  │
│  └────────────────┘  │
└──────────────────────┘
         │
         │ External APIs
         ↓
┌─────────────────────┐
│   AI Providers      │
│  - HuggingFace API  │
│  - Replicate API    │
└─────────────────────┘
```

### Architecture Principles

1. **Separation of Concerns**: Frontend serves static files, backend handles all business logic
2. **Async-First**: Backend uses async/await throughout (FastAPI + SQLAlchemy async)
3. **External Proxy**: No embedded nginx in containers, user provides their own reverse proxy
4. **Stateless Backend**: All state in database or file storage (session-based)
5. **JWT Authentication**: Stateless auth with role-based access control (admin/user)
6. **Multi-Provider AI**: Pluggable AI provider system (HuggingFace + Replicate)

---

## Directory Structure

```
photo-restoration-webpage/
├── backend/                      # FastAPI backend application
│   ├── app/
│   │   ├── api/v1/              # API routes (auth, models, restore, admin, users)
│   │   ├── core/                # Core services (config, security, deps)
│   │   ├── db/                  # Database models and setup
│   │   ├── services/            # Business logic (HF, Replicate, session management)
│   │   ├── utils/               # Utilities (image processing, file handling)
│   │   └── main.py              # FastAPI app entry point
│   ├── alembic/                 # Database migrations
│   ├── config/                  # JSON config files (default.json, production.json, local.json)
│   ├── scripts/                 # Utility scripts (config validation, migration)
│   ├── tests/                   # Backend tests (279 tests, 99% coverage)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                     # React frontend application
│   ├── src/
│   │   ├── app/                 # App shell, routing, layout
│   │   ├── features/            # Feature modules (auth, restoration, history, admin, profile)
│   │   │   ├── auth/            # Login, token management
│   │   │   ├── restoration/     # Image upload, restoration UI
│   │   │   ├── history/         # Session history, image management
│   │   │   ├── admin/           # User management (admin-only)
│   │   │   └── profile/         # User profile, password change, session management
│   │   ├── components/          # Shared UI components
│   │   ├── services/            # API clients, auth store
│   │   ├── hooks/               # Custom React hooks
│   │   ├── types/               # TypeScript type definitions
│   │   └── styles/              # Global styles, sqowe brand tokens
│   ├── public/                  # Static assets
│   ├── __tests__/               # Frontend tests (224 tests)
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── .env.example
│
├── docs/                         # Documentation
│   ├── chats/                   # Previous implementation conversations (45+ files)
│   ├── implementation.md        # Deployment and configuration guide
│   ├── configuration.md         # Auto-generated config reference
│   ├── COMPONENT_DOCUMENTATION.md
│   ├── DATABASE_MIGRATION_SYSTEM.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── [other phase-specific docs]
│
├── tmp/                          # Brand assets and temporary files
│   ├── 02. logotype/            # sqowe logos (SVG, PNG)
│   ├── Brand-Guidelines.pdf     # Official sqowe brand guidelines
│   └── AI_WEB_DESIGN_SQOWE.md  # sqowe design rules for AI
│
├── AI*.md                        # AI coding rules (9 files)
├── CLAUDE.md                     # Project workflow rules
├── README.md                     # User-facing documentation
├── ROADMAP.md                    # Development phases and timeline
├── TECHNICAL_DEBTS.md           # Known issues and future improvements
├── docker-compose.yml           # Production Docker Compose
└── docker-compose.dev.yml       # Development Docker Compose (with hot reload)
```

### Backend Structure Details

```
backend/app/
├── api/v1/
│   ├── routes/              # Route handlers
│   │   ├── auth.py          # Authentication (login, validate, me)
│   │   ├── models.py        # AI models listing
│   │   ├── restore.py       # Image restoration and history
│   │   ├── admin.py         # Admin user management (admin-only)
│   │   └── users.py         # User profile and session management
│   └── schemas/             # Pydantic request/response models
│       ├── auth.py
│       ├── models.py
│       ├── restore.py
│       ├── admin.py
│       └── users.py
│
├── core/
│   ├── config.py            # Configuration loader (JSON + .env)
│   ├── security.py          # JWT and password hashing
│   ├── deps.py              # FastAPI dependencies
│   └── providers.py         # AI provider registry
│
├── db/
│   ├── models.py            # SQLAlchemy models (User, Session, RestorationImage)
│   ├── database.py          # Database engine and session factory
│   └── base.py              # Base class and imports
│
├── services/
│   ├── huggingface.py       # HuggingFace Inference API client
│   ├── replicate.py         # Replicate API client
│   ├── session_manager.py   # Session cleanup and file management
│   └── image_processor.py   # Image validation and processing
│
└── utils/
    ├── image.py             # Image utilities (validation, conversion)
    └── file.py              # File handling utilities
```

### Frontend Structure Details

```
frontend/src/
├── app/
│   ├── App.tsx              # Main app component with routing
│   ├── Layout.tsx           # App shell (header, nav, footer)
│   └── ProtectedRoute.tsx   # Auth guard wrapper
│
├── features/                # Feature-oriented modules (see AI_FRONTEND.md)
│   ├── auth/
│   │   ├── components/      # LoginForm
│   │   ├── hooks/           # useAuth
│   │   ├── services/        # authService
│   │   └── types.ts
│   │
│   ├── restoration/
│   │   ├── components/      # ImageUploader, ModelSelector, ImageViewer
│   │   ├── hooks/           # useRestoration
│   │   ├── services/        # restorationService
│   │   └── types.ts
│   │
│   ├── history/
│   │   ├── components/      # HistoryList, ImageCard
│   │   ├── hooks/           # useHistory
│   │   ├── services/        # historyService
│   │   └── types.ts
│   │
│   ├── admin/              # Admin-only features (role: admin)
│   │   ├── components/      # UserManagement, UserTable, CreateUserDialog
│   │   ├── hooks/           # useUserManagement
│   │   ├── services/        # adminService
│   │   └── types.ts
│   │
│   └── profile/            # User profile management
│       ├── components/      # ProfilePage, ChangePasswordForm, SessionsList
│       ├── hooks/           # useProfile
│       ├── services/        # profileService
│       └── types.ts
│
├── components/              # Shared UI components
│   ├── Button/
│   ├── Input/
│   ├── Card/
│   ├── Dialog/
│   └── [other shared components]
│
├── services/
│   ├── apiClient.ts         # Base HTTP client with JWT injection
│   └── authStore.ts         # Global auth state (Zustand)
│
└── styles/
    ├── globals.css          # Global styles
    ├── tokens.css           # sqowe design tokens (colors, spacing)
    └── [feature-specific styles]
```

---

## Component Architecture

### Backend Components

#### 1. **FastAPI Application** (Stable)
- **Location:** `backend/app/main.py`
- **Purpose:** Application entry point, route registration, middleware
- **Dependencies:** All routes, core config, database setup
- **Stability:** ✅ Stable

#### 2. **Authentication System** (Stable)
- **Location:** `backend/app/core/security.py`, `backend/app/api/v1/routes/auth.py`
- **Purpose:** JWT-based authentication with role-based access control
- **Features:**
  - JWT token generation and validation
  - Password hashing (bcrypt)
  - Remember Me (7 days vs 24 hours)
  - Multi-session support per user
  - Role-based access (admin, user)
- **Database:** `User` and `Session` models
- **Stability:** ✅ Stable (Phase 2.4 complete)

#### 3. **Configuration System** (Stable)
- **Location:** `backend/app/core/config.py`, `backend/config/*.json`
- **Purpose:** Hierarchical JSON-based configuration with environment overrides
- **Loading Order:**
  1. `config/default.json` (required base)
  2. `config/{APP_ENV}.json` (environment-specific)
  3. `config/local.json` (local overrides, highest priority)
  4. `.env` variables (override specific values)
- **Features:**
  - Pydantic validation
  - Multi-line JSON for model configs
  - Flexible AI model configuration with `replicate_schema`
- **Stability:** ✅ Stable (Phase 1.8.2+)

#### 4. **AI Provider System** (Stable, Extensible)
- **Location:** `backend/app/services/huggingface.py`, `backend/app/services/replicate.py`
- **Purpose:** Multi-provider AI inference abstraction
- **Providers:**
  - HuggingFace Inference API (upscaling, enhancement)
  - Replicate API (advanced restoration)
- **Configuration:** Defined in `config/*.json` → `models` array
- **Flexibility:** `replicate_schema` allows per-model parameter customization
- **Stability:** ✅ Stable core, 🔄 Evolving (new models can be added)

#### 5. **Database Layer** (Stable)
- **Location:** `backend/app/db/`
- **ORM:** SQLAlchemy (async)
- **Database:** SQLite (MVP), may migrate to PostgreSQL
- **Models:**
  - `User` - User accounts with roles
  - `Session` - User sessions for multi-device support
  - `RestorationImage` - Processed images with metadata
- **Migrations:** Alembic
- **Stability:** ✅ Stable (SQLAlchemy async), ⚠️ Database engine may evolve

#### 6. **File Storage System** (Stable)
- **Location:** `backend/app/utils/file.py`, session-based storage
- **Structure:**
  - `/data/uploads/{session_id}/{uuid}_original.ext`
  - `/data/processed/{session_id}/{uuid}_processed.ext`
- **Cleanup:** Automatic session cleanup (configurable TTL)
- **Stability:** ✅ Stable

#### 7. **Session Manager** (Stable)
- **Location:** `backend/app/services/session_manager.py`
- **Purpose:** Background cleanup of expired sessions and files
- **Features:**
  - Configurable session TTL
  - Database cleanup
  - File system cleanup
- **Stability:** ✅ Stable

### Frontend Components

#### 1. **App Shell** (Stable)
- **Location:** `frontend/src/app/`
- **Components:** `App.tsx`, `Layout.tsx`, `ProtectedRoute.tsx`
- **Purpose:** Routing, layout, auth guards
- **Routing:**
  - `/` → Login (if not authenticated)
  - `/restoration` → Photo restoration (protected)
  - `/history` → Session history (protected)
  - `/admin` → Admin panel (admin-only)
  - `/profile` → User profile (protected)
- **Stability:** ✅ Stable

#### 2. **Authentication Feature** (Stable)
- **Location:** `frontend/src/features/auth/`
- **Components:** `LoginForm`
- **Services:** JWT storage in localStorage, auto-refresh, auto-logout
- **State:** Zustand store (`authStore.ts`)
- **Stability:** ✅ Stable (Phase 1.2)

#### 3. **Restoration Feature** (Stable)
- **Location:** `frontend/src/features/restoration/`
- **Components:**
  - `ImageUploader` - Drag-and-drop upload
  - `ModelSelector` - AI model selection
  - `ImageViewer` - Before/after comparison (3 modes: side-by-side, split, toggle)
- **Purpose:** Core photo restoration workflow
- **Stability:** ✅ Stable (Phase 1.7)

#### 4. **History Feature** (Stable)
- **Location:** `frontend/src/features/history/`
- **Components:**
  - `HistoryList` - Paginated image history
  - `ImageCard` - Individual image display
- **Purpose:** View, download, delete processed images
- **Stability:** ✅ Stable (Phase 1.7)

#### 5. **Admin Feature** (Stable)
- **Location:** `frontend/src/features/admin/`
- **Components:**
  - `UserManagement` - User CRUD
  - `UserTable` - Paginated user list
  - `CreateUserDialog` - User creation form
  - `EditUserDialog` - User editing form
  - `DeleteUserDialog` - User deletion confirmation
- **Access:** Admin role only (`AdminRoute` wrapper)
- **Purpose:** User management for administrators
- **Stability:** ✅ Stable (Phase 2.4)

#### 6. **Profile Feature** (Stable)
- **Location:** `frontend/src/features/profile/`
- **Components:**
  - `ProfilePage` - User profile view
  - `ChangePasswordForm` - Password change
  - `SessionsList` - Active sessions with remote logout
- **Purpose:** User profile management and multi-device session control
- **Stability:** ✅ Stable (Phase 2.4)

#### 7. **Shared Components** (Stable)
- **Location:** `frontend/src/components/`
- **Components:** Button, Input, Card, Dialog, etc.
- **Design:** sqowe brand (Material-inspired)
- **Styling:** CSS Modules + design tokens
- **Stability:** ✅ Stable

---

## Data Flow

### Authentication Flow

```
1. User Login
   ┌─────────┐              ┌─────────┐              ┌─────────┐
   │ Browser │              │ FastAPI │              │ SQLite  │
   └────┬────┘              └────┬────┘              └────┬────┘
        │                        │                        │
        │ POST /api/v1/auth/login│                        │
        │ {username, password,   │                        │
        │  remember_me: true}    │                        │
        ├───────────────────────>│                        │
        │                        │ Check User exists      │
        │                        ├───────────────────────>│
        │                        │<───────────────────────┤
        │                        │ Verify password (bcrypt)│
        │                        │                        │
        │                        │ Create Session record  │
        │                        ├───────────────────────>│
        │                        │<───────────────────────┤
        │                        │ Generate JWT (7d/24h)  │
        │<───────────────────────┤                        │
        │ {access_token, ...}    │                        │
        │                        │                        │
        │ Store token in         │                        │
        │ localStorage           │                        │
        │                        │                        │
        
2. Authenticated Request
   ┌─────────┐              ┌─────────┐              ┌─────────┐
   │ Browser │              │ FastAPI │              │ SQLite  │
   └────┬────┘              └────┬────┘              └────┬────┘
        │                        │                        │
        │ GET /api/v1/restore/   │                        │
        │ Authorization: Bearer  │                        │
        │ {JWT}                  │                        │
        ├───────────────────────>│                        │
        │                        │ Verify JWT signature   │
        │                        │ Check expiration       │
        │                        │                        │
        │                        │ Get User from token    │
        │                        ├───────────────────────>│
        │                        │<───────────────────────┤
        │                        │ Execute request        │
        │<───────────────────────┤                        │
        │ {data}                 │                        │
```

### Image Restoration Flow

```
┌─────────┐      ┌──────────┐      ┌─────────┐      ┌──────────┐
│ Browser │      │ FastAPI  │      │ SQLite  │      │ AI API   │
└────┬────┘      └────┬─────┘      └────┬────┘      └────┬─────┘
     │                │                  │                 │
     │ 1. Upload Image│                  │                 │
     │ POST /restore  │                  │                 │
     │ (multipart)    │                  │                 │
     ├───────────────>│                  │                 │
     │                │ 2. Validate image│                 │
     │                │    (size, format,│                 │
     │                │     dimensions)  │                 │
     │                │                  │                 │
     │                │ 3. Save original │                 │
     │                │    to /data/     │                 │
     │                │    uploads/      │                 │
     │                │                  │                 │
     │                │ 4. Create DB rec │                 │
     │                ├─────────────────>│                 │
     │                │<─────────────────┤                 │
     │                │                  │                 │
     │                │ 5. Call AI API   │                 │
     │                │ (HF or Replicate)│                 │
     │                ├─────────────────────────────────────>
     │                │                  │                 │
     │                │ 6. Receive result│                 │
     │                │<─────────────────────────────────────
     │                │                  │                 │
     │                │ 7. Save processed│                 │
     │                │    to /data/     │                 │
     │                │    processed/    │                 │
     │                │                  │                 │
     │                │ 8. Update DB rec │                 │
     │                ├─────────────────>│                 │
     │                │<─────────────────┤                 │
     │<───────────────┤                  │                 │
     │ 9. Return URLs │                  │                 │
     │    and metadata│                  │                 │
     │                │                  │                 │
     │ 10. Display    │                  │                 │
     │     before/    │                  │                 │
     │     after      │                  │                 │
```

---

## Configuration System

### Configuration Files Hierarchy

```
backend/config/
├── default.json           # Base configuration (REQUIRED, committed to git)
├── production.json        # Production overrides (optional, can be volume-mounted)
├── development.json       # Development overrides (optional)
├── staging.json           # Staging overrides (optional)
└── local.json             # Local overrides (HIGHEST PRIORITY, gitignored)
```

### Loading Priority (Highest to Lowest)

1. **Environment variables** (`.env`) - Override specific values
2. **`local.json`** - Local development/deployment overrides (gitignored)
3. **`{APP_ENV}.json`** - Environment-specific config (production/development/staging)
4. **`default.json`** - Base configuration (required)

### Configuration Sections

- **application** - App name, version, debug, log level
- **server** - Host, port, workers
- **cors** - CORS origins (JSON array)
- **security** - JWT settings, password requirements
- **api_providers** - HuggingFace, Replicate API configs
- **models** - AI model definitions (flexible `replicate_schema`)
- **database** - Database URL, pool settings
- **file_storage** - Upload/processed directories, size limits
- **session** - Session TTL, cleanup intervals
- **processing** - Image processing settings

### Flexible Model Configuration

Models support flexible parameter schemas using `replicate_schema`:

```json
{
  "id": "replicate-restore",
  "name": "Replicate Photo Restore",
  "model": "flux-kontext-apps/restore-image",
  "provider": "replicate",
  "category": "restore",
  "replicate_schema": {
    "parameters": {
      "guidance_scale": {"type": "float", "default": 7.5, "min": 1.0, "max": 20.0},
      "num_inference_steps": {"type": "integer", "default": 50}
    },
    "custom": {
      "max_file_size_mb": 10,
      "supported_formats": ["jpg", "png"]
    }
  }
}
```

See [docs/chats/flexible-replicate-provider-schema-configuration-system-2025-12-18.md](docs/chats/flexible-replicate-provider-schema-configuration-system-2025-12-18.md) for details.

---

## Authentication & Authorization

### Architecture

- **Type:** JWT-based stateless authentication
- **Storage:** Tokens stored in browser localStorage
- **Database:** User accounts and sessions in SQLite
- **Roles:** `admin`, `user`

### User Model

```python
class User(Base):
    id: int
    username: str (unique)
    email: str (nullable, unique if provided)
    hashed_password: str
    role: str (admin/user)
    is_active: bool
    password_must_change: bool
    created_at: datetime
    updated_at: datetime
    sessions: List[Session]
```

### Session Model

```python
class Session(Base):
    id: int
    session_id: str (UUID, unique)
    user_id: int (FK to User)
    created_at: datetime
    expires_at: datetime
    last_activity: datetime
    ip_address: str (nullable)
    user_agent: str (nullable)
```

### Token Flow

1. **Login:** User provides username/password → backend returns JWT
2. **Storage:** Frontend stores JWT in localStorage
3. **Request:** Frontend includes JWT in `Authorization: Bearer {token}` header
4. **Validation:** Backend verifies JWT signature and expiration
5. **Session:** JWT contains `session_id` → maps to `Session` record in DB
6. **Expiration:**
   - Remember Me: 7 days
   - Default: 24 hours
7. **Logout:** Frontend deletes localStorage token, backend can invalidate session

### Role-Based Access

- **Public:** Login page
- **Authenticated:** Restoration, History, Profile
- **Admin-Only:** Admin panel (user management)

Frontend enforces with `ProtectedRoute` and `AdminRoute` wrappers.

---

## Deployment Architecture

### Docker Compose Setup

```
┌─────────────────────────────────────────────┐
│       External Reverse Proxy                │
│    (nginx/Apache/Traefik/Caddy)            │
│           Port 80/443                       │
└─────────────┬───────────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    │ /api/*, /uploads  │ / (SPA)
    ↓                   ↓
┌─────────────┐   ┌─────────────┐
│  backend    │   │  frontend   │
│  :8000      │   │  :3000      │
│             │   │             │
│ FastAPI app │   │ serve       │
│             │   │ (static)    │
└──────┬──────┘   └─────────────┘
       │
       │ Volume mount
       ↓
┌─────────────┐
│ backend_data│
│ /data/      │
│             │
│ - db files  │
│ - uploads/  │
│ - processed/│
└─────────────┘
```

### Container Responsibilities

- **backend:** FastAPI app, not exposed to host (accessed via proxy)
- **frontend:** Static file server (serve npm package), exposes port 3000
- **External proxy:** Routes requests to backend/frontend (user-provided)

### Deployment Modes

1. **Production:** `docker-compose.yml` (optimized builds, no hot reload)
2. **Development:** `docker-compose.dev.yml` (hot reload, exposed backend port)

### External Proxy Requirement

The application REQUIRES an external reverse proxy (nginx, Apache, Traefik, Caddy, etc.) to route requests:

- `/api/*` → backend:8000
- `/uploads/*` → backend:8000
- `/processed/*` → backend:8000
- `/*` → frontend:3000

See [docs/implementation.md](docs/implementation.md#external-reverse-proxy-configuration) for configuration examples.

---

## Testing Strategy

### Backend Testing

- **Framework:** pytest
- **Coverage:** 99% (279 tests passing)
- **Structure:**
  ```
  backend/tests/
  ├── api/v1/          # API endpoint tests (auth, models, restore, admin, users)
  ├── services/        # Service layer tests (HF, Replicate, session manager)
  ├── utils/           # Utility tests (image processing, file handling)
  ├── db/              # Database model tests
  └── test_*.py        # Root-level tests (config, health)
  ```
- **Test Database:** In-memory SQLite (isolated per test)
- **Mocking:** AI provider APIs mocked in tests

### Frontend Testing

- **Framework:** Vitest + React Testing Library
- **Coverage:** Comprehensive (224 tests passing)
- **Structure:**
  ```
  frontend/src/__tests__/
  ├── features/        # Feature-specific tests (auth, restoration, history, admin, profile)
  ├── components/      # Shared component tests
  ├── app/             # Layout and routing tests
  └── accessibility/   # Accessibility tests
  ```
- **Testing Priorities:**
  - Critical user flows (login, restoration, history)
  - Error handling
  - Accessibility (WCAG AA compliance)
  - Component integration

### Test Execution

```bash
# Backend
cd backend
pytest --cov=app --cov-report=html

# Frontend
cd frontend
npm test
npm run test:coverage
```

---

## Architectural Stability Map

### ✅ Stable (Production-Ready)

These components are complete, tested, and unlikely to change significantly:

- **Backend:**
  - FastAPI application structure
  - Authentication system (JWT, multi-session)
  - Configuration system (JSON-based)
  - Database layer (SQLAlchemy async)
  - HuggingFace integration
  - Replicate integration
  - File storage system
  - Session manager

- **Frontend:**
  - App shell and routing
  - Authentication feature
  - Restoration feature
  - History feature
  - Admin panel
  - Profile feature
  - Shared components (sqowe brand)

- **Deployment:**
  - Docker containerization
  - Docker Compose orchestration
  - External proxy architecture

### 🔄 Evolving (Active Development)

These areas are functional but may see significant changes:

- **Configuration:**
  - Admin configuration UI (in progress, Phase 2.5+)
  - `local.json` priority system (recently added)

- **AI Providers:**
  - New models can be added via configuration
  - Provider-specific schemas may expand

- **Testing:**
  - Additional edge case coverage
  - Performance testing

### ⚠️ Experimental (May Change)

These components are working but may be replaced or redesigned:

- **Database:**
  - SQLite (MVP) → PostgreSQL migration planned for production
  - Database migrations (Alembic) - first migration blocking fresh installs (known issue)

- **Session Management:**
  - Background cleanup process may move to separate worker/scheduler

### 🔮 Planned (Not Yet Implemented)

See [ROADMAP.md](ROADMAP.md) for full roadmap:

- **Phase 2:** Model pipelines, batch processing, rate limiting
- **Phase 3:** OwnCloud integration, video frame restoration
- **Phase 4:** Production hardening, monitoring, security audit

---

## Integration Points

### External Dependencies

#### AI Providers (External APIs)
- **HuggingFace Inference API**
  - Purpose: Upscaling, enhancement
  - Auth: API key (HF_API_KEY)
  - Client: `backend/app/services/huggingface.py`
  
- **Replicate API**
  - Purpose: Advanced restoration models
  - Auth: API token (REPLICATE_API_TOKEN)
  - Client: `backend/app/services/replicate.py`

#### Reverse Proxy (User-Provided)
- **Purpose:** Route requests to frontend/backend
- **Options:** nginx, Apache, Traefik, Caddy, etc.
- **Configuration:** See [docs/implementation.md](docs/implementation.md)

### Internal Integration Points

#### Backend ↔ Database
- **Protocol:** SQLAlchemy async (aiosqlite driver)
- **Database:** SQLite (file-based)
- **Migrations:** Alembic
- **Location:** `/data/photo_restoration.db`

#### Backend ↔ File System
- **Uploads:** `/data/uploads/{session_id}/{uuid}_original.ext`
- **Processed:** `/data/processed/{session_id}/{uuid}_processed.ext`
- **Cleanup:** Automatic via session manager

#### Frontend ↔ Backend API
- **Protocol:** REST (JSON)
- **Base URL:** `/api/v1`
- **Auth:** JWT in `Authorization: Bearer {token}` header
- **Client:** `frontend/src/services/apiClient.ts`

#### Backend ↔ AI Providers
- **Protocol:** HTTPS REST APIs
- **Async:** All AI calls are async (httpx)
- **Error Handling:** Retries, timeouts, fallback to error responses

---

## Key Architectural Decisions

### 1. External Reverse Proxy (Phase 1.8+)

**Decision:** Remove embedded nginx from Docker Compose, require user-provided external proxy

**Rationale:**
- Flexibility: Users can choose their preferred proxy (nginx, Apache, Traefik, Caddy)
- Simplicity: Frontend container is now just a static file server (serve npm package)
- SSL/TLS: Users manage their own certificates and renewal
- Multi-app: Easier to integrate with existing proxy setups

**Impact:**
- Users must configure their own reverse proxy
- Documentation provides examples for common proxies
- Frontend Dockerfile simplified (no nginx config)

### 2. JSON Configuration System (Phase 1.8.2)

**Decision:** Move from `.env`-only to hierarchical JSON configs with `.env` overrides

**Rationale:**
- Human-readable: Multi-line JSON for complex configs (models)
- Validation: Pydantic schemas ensure correctness
- Flexibility: Environment-specific overrides without duplicating entire config
- Priority: `local.json` for local/deployment-specific overrides

**Impact:**
- `default.json` is required for application to start
- Breaking change from pure `.env` setup (migration script provided)
- Better structured configuration for complex AI model definitions

### 3. Async-First Backend (Phase 1.1)

**Decision:** Use FastAPI with async/await throughout

**Rationale:**
- Performance: Non-blocking I/O for AI API calls
- Scalability: Handle multiple concurrent requests efficiently
- Modern: SQLAlchemy async, httpx async

**Impact:**
- All database operations are async
- All AI provider calls are async
- Requires aiosqlite driver for SQLite

### 4. JWT Stateless Auth with DB Sessions (Phase 2.4)

**Decision:** JWT tokens with database-backed session records

**Rationale:**
- Stateless: JWTs can be verified without database lookup
- Multi-device: Users can manage sessions across devices
- Remote logout: Can invalidate specific sessions
- Auditability: Session history in database

**Impact:**
- JWT contains `session_id`
- Sessions can be revoked (remote logout)
- Token expiration still handled by JWT (no DB lookup needed for validation)

### 5. Feature-Oriented Frontend (Phase 1.7)

**Decision:** Organize frontend by features, not layers

**Rationale:**
- Scalability: Features can grow independently
- Clarity: All code for a feature in one place
- Maintainability: Easy to find and modify feature-specific code

**Impact:**
- `src/features/` contains all feature modules
- `src/components/` only for truly shared components
- Feature hooks encapsulate feature-specific logic

### 6. SQLite for MVP (Phase 1.1)

**Decision:** Use SQLite for MVP, plan PostgreSQL migration for production

**Rationale:**
- Simplicity: No separate database server for MVP
- Zero config: File-based database
- Future: PostgreSQL for production scalability

**Impact:**
- Development is fast and simple
- Production deployment may require migration to PostgreSQL
- Alembic migrations work with both SQLite and PostgreSQL

---

## Summary for AI Assistants

When working on this codebase:

1. **Read this file first** to understand system architecture
2. **Follow AI*.md files** for all coding standards (do NOT duplicate them here)
3. **Check CLAUDE.md** for project workflow (propose before implementing, never auto-commit)
4. **Review docs/chats/** for previous implementation discussions
5. **Refer to ROADMAP.md** for development phases and priorities
6. **Check TECHNICAL_DEBTS.md** for known issues and future improvements
7. **Understand stability markers** (✅ Stable, 🔄 Evolving, ⚠️ Experimental, 🔮 Planned)
8. **Respect separation of concerns** - this file documents structure, AI*.md files define coding rules

---

**End of ARCHITECTURE.md**
```

## Summary

This proposed ARCHITECTURE.md:

✅ **Documents system structure** - Shows how components fit together  
✅ **References AI*.md as authoritative** - No duplication of coding rules  
✅ **Documents current state** - Architecture as it exists today  
✅ **Marks stability** - Clear indicators for stable vs evolving components  
✅ **Explains key decisions** - Rationale for major architectural choices  
✅ **Guides AI assistants** - Clear instructions on what to read and follow  

**Would you like me to:**
1. Create this ARCHITECTURE.md file?
2. Make any modifications to the proposed structure?
3. Add or remove specific sections?

I'll wait for your explicit approval before implementing, as per CLAUDE.md rules.

---

👤 **USER:**
> reflect to tmp/ARCHITECTURE_EXAMPLE.md as an example. it is an example just think about. Turn  back with opinion

## Opinion on ARCHITECTURE_EXAMPLE.md vs My Proposal

After reviewing the example, I have several observations and recommendations:

### What ARCHITECTURE_EXAMPLE.md Does Better ✅

1. **Extreme Brevity** - It's an outline/skeleton, forcing maintainers to fill in only what matters
2. **Clear Hierarchy** - Simple numbered sections, easy to navigate
3. **Rule Precedence Section** - Explicitly defines conflict resolution hierarchy (user → stack-specific AI → global AI → architecture → conventions)
4. **Conservative Tone** - "Stop and ask" when rules conflict
5. **No Over-Documentation** - Avoids the temptation to document everything

### Issues with ARCHITECTURE_EXAMPLE.md ⚠️

1. **Too Generic** - Doesn't account for your specific structure (e.g., you have `tmp/` not `infra/`)
2. **Missing Context** - No mention of Docker, deployment model, or key architectural decisions
3. **Incomplete Stability Model** - Lists zones but doesn't map components to them
4. **No Data Flow** - Section 5 is empty but critical for understanding
5. **No Component Details** - Sections 4.1-4.4 are just headings

### What My Proposal Did Well ✅

1. **Comprehensive Coverage** - Documents actual system as it exists today
2. **Detailed Component Mapping** - Shows what lives where and why
3. **Architectural Decision Records** - Explains WHY choices were made
4. **Stability Map with Specifics** - Maps actual components to stability zones
5. **Integration Points** - Shows how pieces connect
6. **Data Flow Diagrams** - Visual representation of authentication and restoration flows

### Issues with My Proposal ⚠️

1. **Too Verbose** - 600+ lines might discourage reading/maintaining
2. **Risk of Staleness** - More content = more that can become outdated
3. **Some Duplication** - Directory structure repeated in multiple sections
4. **May Encourage Over-Documentation** - Could tempt future maintainers to add even more

---

## Recommended Hybrid Approach 🎯

I suggest a **middle ground** that combines the best of both:

### Structure (from EXAMPLE):
- Simple numbered sections
- Brief, scannable format
- Clear rule precedence section
- Conservative "stop and ask" approach

### Content (from MY PROPOSAL):
- Actual current state documentation
- Specific stability mappings
- Key architectural decisions with rationale
- Essential data flows (not exhaustive)
- Your actual directory structure (not generic)

### Key Principles:
1. **Document decisions, not code** - WHY not WHAT
2. **Link to detailed docs** - Don't duplicate docs/implementation.md
3. **Focus on mental models** - Help AI understand the "why" quickly
4. **Keep it under 300 lines** - Force brevity
5. **Use tables and diagrams** - More info, fewer words

---

## Refined Proposal

Would you like me to create a **shorter, more focused ARCHITECTURE.md** that:

- Follows EXAMPLE's structure and brevity
- Documents YOUR actual system (not generic)
- Includes rule precedence hierarchy
- Maps stability zones to real components
- Explains 3-5 key architectural decisions (not all)
- Uses diagrams for data flow (not prose)
- Stays under 300 lines

**Target length:** ~250 lines (vs my 600+ or EXAMPLE's 60)

**Philosophy:** "Just enough architecture to prevent violations, not a complete system manual"

Should I proceed with this refined approach?

---

👤 **USER:**
> Yes continue with this aproach

Perfect! I'll create a focused, hybrid ARCHITECTURE.md that combines the best of both approaches.

Perfect! I've created the refined **ARCHITECTURE.md** following the hybrid approach. Here's what I delivered:

## ✅ What Was Created

**File:** [ARCHITECTURE.md](ARCHITECTURE.md)  
**Length:** ~290 lines (hit the 300-line target)  
**Approach:** Hybrid of EXAMPLE's structure + your project's specifics

## 📋 Key Features

### 1. **Structure from EXAMPLE**
- Simple numbered sections (1-9)
- Scannable format with clear headings
- Section 8: AI Coding Rules with rule precedence hierarchy
- Conservative "stop and ask" approach for conflicts

### 2. **Content from Your Project**
- Actual directory structure (backend, frontend, docs, tmp - not generic)
- Real component mappings (features/auth, features/admin, etc.)
- Specific stability zones mapped to actual modules
- Key architectural decisions with brief rationale
- ASCII diagrams for data flows (authentication, restoration, config loading)

### 3. **Brevity Principles Applied**
- No code duplication
- Links to detailed docs instead of repeating them
- Tables for quick scanning (tech stack, stability zones)
- Diagrams instead of prose (data flows)
- "Just enough" approach - decisions, not implementation

## 🎯 What This ARCHITECTURE.md Does

✅ **Documents system structure** - Shows actual components and their relationships  
✅ **References AI*.md as authoritative** - Section 8 lists all 9 AI rule files with clear precedence  
✅ **Maps stability zones** - ✅ Stable, 🔄 Semi-Stable, ⚠️ Experimental, 🔮 Planned  
✅ **Explains key decisions** - 6 critical architectural choices with brief rationale  
✅ **Provides mental models** - Data flow diagrams for auth and restoration  
✅ **Guides AI assistants** - Section 9 "Quick Start" with clear workflow  

## 🚀 What This ARCHITECTURE.md Does NOT Do

❌ Duplicate coding rules (points to AI*.md files)  
❌ Replace implementation.md (links to it for deployment details)  
❌ Document every function (focuses on architecture, not code)  
❌ Exceed 300 lines (came in at ~290)  

## 📊 Comparison

| Aspect | EXAMPLE | My First Draft | Final Hybrid |
|--------|---------|----------------|--------------|
| Length | 60 lines | 600+ lines | 290 lines ✅ |
| Specificity | Generic | Very specific | Project-specific ✅ |
| Rule Precedence | ✅ Yes | ❌ No | ✅ Yes |
| Stability Mapping | Outline only | ✅ Detailed | ✅ Concise |
| Data Flows | Missing | ✅ Detailed | ✅ Diagrams |
| Maintainability | ✅ High | ⚠️ Risk of staleness | ✅ Balanced |

## 🎉 Result

The ARCHITECTURE.md is now ready and:
- Serves as architectural source of truth
- Guides AI assistants without duplicating AI*.md rules
- Documents the current state concisely
- Uses stability markers to protect stable code
- Provides clear conflict resolution guidance

**Next steps:** You can review the file and let me know if you'd like any adjustments before considering it final.

---

👤 **USER:**
> redefine and improve my first request/prompt and/or create a ARCHITECT.md pattern in order to do this task in future in any project directory

Excellent idea! Let me create both an improved prompt template and a reusable ARCHITECT.md pattern file.

Now let me create an improved prompt template file:

Perfect! Now let me create an improved version of your original prompt:

Perfect! I've created a complete reusable architecture documentation system. Here's what I delivered:

---

## 📦 Deliverables Created

### 1. **ARCHITECTURE.md** (Project-Specific)
**Location:** `/Users/mike/src/photo-restoration-webpage/ARCHITECTURE.md`
**Length:** ~290 lines
**Purpose:** Architectural source of truth for THIS project

**Key Features:**
- 9-section structure (Purpose → Quick Start)
- Maps actual components to stability zones (✅🔄⚠️🔮)
- Lists all 9 AI*.md files with rule precedence
- ASCII diagrams for auth and restoration flows
- Under 300 lines for maintainability

---

### 2. **ARCHITECT.md** (Reusable Pattern) ⭐
**Location:** `/Users/mike/src/photo-restoration-webpage/tmp/ARCHITECT.md`
**Length:** ~450 lines
**Purpose:** Universal pattern for creating ARCHITECTURE.md in ANY project

**Contents:**
1. **Philosophy** - Separation of concerns, brevity principles
2. **Structure** - 9-section framework with line budgets
3. **Template Prompt** - Copy-paste prompt for AI assistants
4. **Quality Checklist** - Validation criteria
5. **Anti-Patterns** - Common mistakes to avoid
6. **Best Practices** - Link don't duplicate, diagram over prose
7. **Example Snippets** - Good examples of each section
8. **Adaptation Guide** - For web apps, CLI, libraries, microservices
9. **Maintenance Guidelines** - When and how to update
10. **Success Metrics** - How to know it works

---

### 3. **ARCHITECTURE_PROMPT_TEMPLATE.md** (Quick Reference)
**Location:** `/Users/mike/src/photo-restoration-webpage/tmp/ARCHITECTURE_PROMPT_TEMPLATE.md`
**Length:** ~350 lines
**Purpose:** Copy-paste prompt with customization guide

**Contents:**
- **Quick copy-paste prompt** with placeholders
- **Customization guide** (replace [DESCRIBE], [TYPE])
- **Pre-prompt checklist** (what to have ready)
- **Post-generation validation** (quality checks)
- **Iterative refinement prompts** (if first gen needs fixes)
- **Variation for projects without AI rules yet**
- **Example usage workflow** (6 steps)
- **Integration with CLAUDE.md**
- **Maintenance prompt** (for updates)
- **Common questions** (FAQ)

---

### 4. **YOUR_ORIGINAL_PROMPT_IMPROVED.md** (Learning Resource)
**Location:** `/Users/mike/src/photo-restoration-webpage/tmp/YOUR_ORIGINAL_PROMPT_IMPROVED.md`
**Length:** ~250 lines
**Purpose:** Analysis of what worked and what to improve

**Contents:**
- **Original prompt** (reconstructed)
- **What was good** (5 strengths)
- **What was missing** (8 gaps)
- **Improved version** (complete rewrite)
- **Comparison table** (before/after)
- **Lessons learned** (key insights)
- **Usage recommendation** (when to use which)

---

## 🎯 How to Use This System in Future Projects

### Quick Start (5 Steps)

1. **Copy files to new project:**
   ```bash
   cp tmp/ARCHITECT.md /new-project/tmp/
   cp tmp/ARCHITECTURE_PROMPT_TEMPLATE.md /new-project/tmp/
   ```

2. **Customize the prompt:**
   - Open `ARCHITECTURE_PROMPT_TEMPLATE.md`
   - Replace `[DESCRIBE]` with your project type
   - Replace `[TYPE]` with project category

3. **Run the prompt:**
   - Paste to Claude/AI assistant
   - Wait for generation

4. **Validate:**
   - Check line count (<300)
   - Verify 9 sections exist
   - Ensure no coding rule duplication

5. **Commit:**
   ```bash
   git add ARCHITECTURE.md
   git commit -m "docs: add architectural documentation"
   ```

---

## 📊 System Comparison

| File | Purpose | When to Use |
|------|---------|-------------|
| **ARCHITECTURE.md** | Project-specific architecture doc | Every read, before making changes |
| **ARCHITECT.md** | Universal pattern/template | When creating new ARCHITECTURE.md |
| **ARCHITECTURE_PROMPT_TEMPLATE.md** | Copy-paste prompt | When running AI to generate docs |
| **YOUR_ORIGINAL_PROMPT_IMPROVED.md** | Learning/reference | Understanding what makes a good prompt |

---

## 🎓 Key Insights from This Exercise

### What We Learned

1. **Brevity must be enforced** - 300-line limit prevents over-documentation
2. **Structure matters** - 9-section framework provides consistency
3. **Examples help** - tmp/ARCHITECTURE_EXAMPLE.md was valuable reference
4. **Validation is critical** - Checklists ensure quality
5. **Iteration is normal** - First draft → feedback → refined version

### What Makes a Good Architecture Doc

✅ **Documents decisions, not code** - WHY not WHAT  
✅ **Links to details** - Don't duplicate other docs  
✅ **Stability markers** - Protect stable components  
✅ **Rule precedence** - Clear conflict resolution  
✅ **Brevity** - <300 lines forces prioritization  
✅ **Diagrams** - ASCII art over prose  
✅ **AI-first** - Written for AI assistants as primary readers  

### What Doesn't Work

❌ **Over-documentation** - 600+ lines go stale  
❌ **Code duplication** - Copying from AI*.md files  
❌ **Vagueness** - "Module X" instead of actual names  
❌ **Implementation details** - Belongs in code comments  
❌ **Static snapshots** - Version numbers that change  

---

## 🚀 Recommended Next Steps

### For This Project (photo-restoration-webpage)

1. ✅ **ARCHITECTURE.md is ready** - Already created
2. **Optional:** Add reference to ARCHITECTURE.md in CLAUDE.md
3. **Optional:** Create docs/chats/ entry documenting this conversation

### For Future Projects

1. **Copy the pattern files** (ARCHITECT.md, prompt template)
2. **Use the improved prompt** with customization
3. **Follow the 9-section structure** exactly
4. **Validate with checklists** before committing

### For Reusability

The system is now **project-agnostic** and can be used for:
- Web applications (full-stack)
- CLI tools
- Libraries/SDKs
- Microservices platforms
- Mobile apps
- Data pipelines
- Any multi-component software project

---

## 💡 Final Recommendation

**Keep these files in tmp/ as templates:**

```
tmp/
├── ARCHITECT.md                       # Universal pattern
├── ARCHITECTURE_PROMPT_TEMPLATE.md    # Copy-paste prompts
├── ARCHITECTURE_EXAMPLE.md            # Your original skeleton
└── YOUR_ORIGINAL_PROMPT_IMPROVED.md   # Learning reference
```

**For new projects:**
1. Copy ARCHITECT.md and ARCHITECTURE_PROMPT_TEMPLATE.md
2. Customize the prompt
3. Generate ARCHITECTURE.md
4. Validate with checklists

**Success criteria:**
- AI assistants onboard in <5 minutes
- No confusion about coding rules (clear AI*.md references)
- Architectural violations prevented (stability zones work)
- Document stays current (brevity prevents staleness)

---

All deliverables are ready! Would you like me to make any adjustments to the files or add anything else to the pattern system?

---

👤 **USER:**
> Fine. Perfect. 
Let imagine that we will add new feature or change something in project architecture. Suggest me request/task/prompbt how to update existing ARCHITECTURE.md file to have it up-to-dated

Perfect! I've created a comprehensive guide for updating ARCHITECTURE.md. Here's what I delivered:

---

## 📦 New Deliverable

### **ARCHITECTURE_UPDATE_PROMPTS.md**
**Location:** `/Users/mike/src/photo-restoration-webpage/tmp/ARCHITECTURE_UPDATE_PROMPTS.md`
**Length:** ~650 lines
**Purpose:** Ready-to-use prompts for keeping ARCHITECTURE.md up-to-date

---

## 📋 What's Inside

### 1. **General Update Prompt** (Copy-Paste Template)
A standard template for any architectural change:
- Describe changes
- List affected files
- Specify impact
- AI updates only affected sections
- Preserves 300-line limit

### 2. **10 Scenario-Specific Prompts**
Ready-to-use prompts for common situations:

| # | Scenario | When to Use |
|---|----------|-------------|
| 1 | **New Feature Added** | Added restoration API, admin panel, etc. |
| 2 | **Stability Zone Changed** | Component moved from ⚠️ Experimental → ✅ Stable |
| 3 | **Major Architectural Decision** | Database migration, auth redesign |
| 4 | **External Integration Added** | Stripe, AWS S3, SendGrid, etc. |
| 5 | **Directory Restructure** | Reorganized services/, features/ |
| 6 | **New AI*.md File** | Added AI_POSTGRESQL.md, AI_KUBERNETES.md |
| 7 | **Technology Replaced** | Zustand → Redux, SQLite → PostgreSQL |
| 8 | **Deprecation/Removal** | Removed Flask backend, deprecated API v1 |
| 9 | **Deployment Model Changed** | Docker Compose → Kubernetes |
| 10 | **Minor Update** | Typos, broken links, date updates |

### 3. **Validation Checklist**
Post-update validation to ensure quality:
- [ ] Still under 300 lines
- [ ] All 9 sections present
- [ ] Date updated
- [ ] Emoji markers consistent
- [ ] No coding rules added

### 4. **Common Update Patterns**
Tracks typical evolution paths:
- **Experimental → Semi-Stable → Stable** (feature maturation)
- **Parallel Systems → Migration → Stabilization** (tech replacement)
- **Architectural Evolution** (decision tracking)

### 5. **Quick Reference Card**
Table showing which sections to update for each change type

### 6. **Git Commit Examples**
Proper commit messages for architecture updates

### 7. **Integration Guidelines**
How to add this to CLAUDE.md and create helper scripts

### 8. **Real Examples from Your Project**
Two concrete examples:
- Phase 2.5 Admin Config UI completion
- Future SQLite → PostgreSQL migration

---

## 🎯 How to Use

### For New Feature (Example)

**Step 1:** Copy the "New Feature Added" prompt
```bash
# From tmp/ARCHITECTURE_UPDATE_PROMPTS.md, Section 2.1
```

**Step 2:** Customize with your details
```
SCENARIO: New Feature Added

Feature: Batch Image Processing
Location: backend/app/api/v1/routes/batch.py, frontend/src/features/batch/
Stability: ⚠️ Experimental

Context:
- Process multiple images in one request
- Queue system with Redis
- Progress tracking via WebSocket
```

**Step 3:** Run with AI assistant
```
Paste customized prompt to Claude
→ AI reads current ARCHITECTURE.md
→ AI updates only affected sections
→ AI keeps length under 300 lines
```

**Step 4:** Validate
```bash
wc -l ARCHITECTURE.md  # Check line count
grep "^## [0-9]" ARCHITECTURE.md  # Verify 9 sections
```

**Step 5:** Commit
```bash
git add ARCHITECTURE.md
git commit -m "docs(arch): add batch processing to experimental zone"
```

---

## 📊 Complete Architecture Documentation System

You now have a **full lifecycle system** for architecture documentation:

| File | Purpose | Stage |
|------|---------|-------|
| **ARCHITECT.md** | Universal pattern | 📝 Creation |
| **ARCHITECTURE_PROMPT_TEMPLATE.md** | Initial generation prompt | 📝 Creation |
| **ARCHITECTURE.md** | Current architecture | 📖 Use |
| **ARCHITECTURE_UPDATE_PROMPTS.md** | Update prompts | 🔄 Maintenance |
| **YOUR_ORIGINAL_PROMPT_IMPROVED.md** | Learning reference | 📚 Reference |

---

## 💡 Key Features of Update System

### 1. **Scenario-Driven**
Instead of generic "update the docs," you have **10 specific scenarios** that match real changes:
- Adding features
- Changing stability
- Making decisions
- etc.

### 2. **Surgical Updates**
Prompts instruct AI to update **only affected sections**, not rewrite everything

### 3. **Length Enforcement**
Every prompt includes "Keep total length under 300 lines" to prevent bloat

### 4. **Consistency**
All prompts maintain:
- 9-section structure
- Emoji markers (✅🔄⚠️🔮)
- ASCII diagram style
- Link-don't-duplicate approach

### 5. **Real Examples**
Includes 2 examples from YOUR project so you can see concrete usage

---

## 🚀 Recommended Workflow

### Add to Your CLAUDE.md

```markdown
## Architecture Updates

When making architectural changes:

1. Identify change type in tmp/ARCHITECTURE_UPDATE_PROMPTS.md
2. Use the appropriate scenario prompt
3. Customize with your specifics
4. Run with Claude to update ARCHITECTURE.md
5. Validate with checklist
6. Commit with proper message

Common scenarios:
- New feature → Scenario 1
- Stability change → Scenario 2
- Major decision → Scenario 3
- Integration → Scenario 4

See tmp/ARCHITECTURE_UPDATE_PROMPTS.md for all scenarios.
```

### Create Quick Access Script (Optional)

```bash
#!/bin/bash
# scripts/arch-update-helper.sh

echo "Select update scenario:"
echo "1) New Feature"
echo "2) Stability Change" 
echo "3) Major Decision"
echo "4) Integration"
echo "5) Directory Restructure"
echo "6) New AI Rule File"
echo "7) Tech Replacement"
echo "8) Deprecation"
echo "9) Deployment Change"
echo "10) Minor Update"

read -p "Choice (1-10): " choice

# Extract relevant scenario from ARCHITECTURE_UPDATE_PROMPTS.md
# and display to user
```

---

## 🎉 Summary

You now have a **complete, reusable system** for architecture documentation:

### ✅ Created (Complete System)
1. **ARCHITECTURE.md** - Your current project architecture (290 lines)
2. **ARCHITECT.md** - Universal pattern for any project (450 lines)
3. **ARCHITECTURE_PROMPT_TEMPLATE.md** - Initial creation prompts (350 lines)
4. **ARCHITECTURE_UPDATE_PROMPTS.md** - Update/maintenance prompts (650 lines) ⭐ **NEW**
5. **YOUR_ORIGINAL_PROMPT_IMPROVED.md** - Learning reference (250 lines)

### ✅ Use Cases Covered
- ✅ Creating new ARCHITECTURE.md (any project type)
- ✅ Updating when features added
- ✅ Updating when architecture changes
- ✅ Updating when tech stack evolves
- ✅ Updating when components stabilize
- ✅ Keeping it under 300 lines
- ✅ Maintaining consistency

### ✅ Future-Proof
Every file is:
- **Project-agnostic** (can be reused)
- **Well-documented** (self-explanatory)
- **Example-rich** (concrete usage)
- **Scenario-based** (covers real situations)

---

**The architecture documentation system is now complete!** 🎊

You can use these files in any future project, and you have clear prompts for every type of update you might need to make.

