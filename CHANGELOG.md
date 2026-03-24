# Changelog

All notable changes to the Markdown Viewer & Editor project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.7.1] - 2026-03-24

### Added
- Heading anchor IDs with auto-generated slugs and duplicate deduplication
- In-preview anchor navigation: click `#heading` links to scroll within preview pane
- Per-instance Marked parser using local `marked.Marked` to avoid global state contamination
- Defensive guards for `_extractText` (array check) and parser initialization
- Tests for parser initialization failure paths (missing `marked.Marked`, undefined `marked`)
- Explicit `_anchorHandlerAttached` initialization in `MarkdownViewerApp` constructor

### Fixed
- Heading renderer now uses correct marked v11 signature `(text, level, raw)` instead of v12+ token-based API
- Removed unsafe `marked.constructor` fallback that could resolve to `Function`
- Graceful degradation when `marked.Marked` is unavailable (consistent with `marked` undefined path)

### Changed
- Version bumped to 2.7.1 across all project files
- Slug algorithm doc comment clarifies it is not fully GitHub-compatible

## [2.7.0] - 2026-03-19

### Added
- **Restore Markdown Format** — new sidebar action that uses LLM to recover Markdown formatting lost during copy/paste (headings, lists, code blocks, bold/italic, tables, etc.)
- **Undo Transformation** — sidebar header button to revert any transformation; supports multi-level undo (up to 10 snapshots) with tooltip showing which action will be reverted
- **Specific error handling** for LLM transformations — distinguishes network errors, timeouts, and rate limits from generic failures
- **Unit tests** for Restore Markdown (9 tests) and Undo Transformation (6 tests)

### Changed
- Version bumped to 2.7.0 across all project files
- README.md overhauled: removed stale v1.4.x "What's New" sections, updated features list, refreshed roadmap

## [2.6.0] - 2026-03-01

### Added
- **Electron Desktop App** — all 10 phases complete (macOS, Windows, Linux)
- **AI_ELECTRON.md** — desktop-specific coding rules derived from real implementation bugs
- **Desktop test suite** — 61 unit tests across 4 test files (flask-manager, settings-manager, protocol, menu)
- **Windows build script** — `desktop/build/build-backend.bat` for PyInstaller on Windows

### Changed
- ARCHITECTURE.md updated to v2.6.0 with desktop stability zones and AI_ELECTRON.md in rule hierarchy
- Desktop stability zone promoted from "Phase 10 testing pending" to "Semi-Stable (all phases complete)"
- Version aligned across all project files to 2.6.0

## [1.4.1] - 2025-12-25

### Changed
- **BookStack Integration Improvements**
  - Now uses BookStack's native `/api/pages/{id}/export/markdown` endpoint for optimal markdown extraction
  - Smart fallback to HTML→Markdown conversion if export endpoint unavailable (404/403)
  - Better handling of BookStack versions < v21.05 (graceful degradation)
  - Improved logging for tracking which method (export vs fallback) was used
  - Enhanced compatibility with different BookStack versions and configurations
  - Refactored to use shared `_request_raw()` helper for consistent request structure (URL building, headers, timeout, error handling)

### Added
- **Comprehensive Test Suite**
  - Added 17 unit tests for BookStack export functionality ([test_bookstack_export.py](backend/tests/unit/test_bookstack_export.py))
  - Tests cover success paths, all fallback scenarios (404, 403, timeout, empty), and edge cases
  - 99% code coverage for new export logic
  - Regression protection for future refactoring

### Documentation
- Added comprehensive [BOOKSTACK_API_INTEGRATION.md](docs/BOOKSTACK_API_INTEGRATION.md) documentation
- Updated README.md with details about native markdown export
- Updated implementation plan with dual-strategy approach
- Added [CODE_REVIEW_RESPONSE_2025-12-25.md](docs/CODE_REVIEW_RESPONSE_2025-12-25.md) documenting code review fixes

## [1.4.0] - 2025-12-20

### Added
- **BookStack Wiki Integration**
  - Full BookStack API integration for browsing and editing wiki pages
  - Hierarchical navigation: shelves → books → chapters → pages
  - Session-based authentication with Token ID and Token Secret
  - HTML to Markdown automatic conversion for existing pages
  - Create new pages directly from the editor
  - Update existing pages with conflict detection
  - Smart conflict resolution with overwrite option
  - 24-hour session expiry for security

- **Smart Save Feature**
  - Contextual save button behavior based on document source
  - Automatically saves to BookStack, GitHub, or local file
  - Visual indicator showing current document source
  - Save As option for changing save destination
  - Toast notifications for save success/failure

- **Enhanced Keyboard Shortcuts**
  - `Ctrl/Cmd + K` - Open BookStack browser dialog
  - `Ctrl/Cmd + G` - Open GitHub browser dialog
  - `Ctrl/Cmd + S` - Smart save to document source

### Changed
- Improved save workflow with source-aware behavior
- Enhanced error handling for BookStack operations
- Updated UI to show document source in toolbar

### Fixed
- BookStack page loading issue with parameter mismatch
- Save dialog CSS styling improvements
- File opening from BookStack browser

### Security
- Secure session-based credential storage for BookStack
- Backend proxy for all BookStack API calls
- No credentials exposed to frontend JavaScript
- HTTP-only session cookies
- HTTPS enforcement in production

## [1.3.0] - 2025-12-12

### Added
- Synchronized scrolling in split view mode
  - Proportional bidirectional scroll synchronization
  - Smooth scrolling behavior
  - Automatic scroll position mapping between editor and preview

### Changed
- Improved split view user experience

## [1.2.0] - 2025-11-30

### Added
- Find and Replace feature
  - Search with regex support
  - Case-sensitive/insensitive options
  - Replace single or all occurrences

## [1.1.0] - 2025-11-28

### Added
- Editable document title
  - Click to edit title inline
  - Auto-save title changes
- Token counter
  - Real-time character and word count
  - Estimated token count for LLM operations

## [1.0.0] - 2025-11-20

### Added
- Initial release
- Core markdown editor with CodeMirror 6
- GitHub Flavored Markdown preview with marked.js
- Split-pane view with live preview
- LLM transformations via OpenRouter
  - Translation to 15+ languages
  - Tone adjustment (formal/casual)
  - Summarization
  - Content expansion
  - Custom prompts
- GitHub integration
  - OAuth authentication
  - Browse repositories
  - Open/save files from GitHub
  - Commit changes
- Export functionality
  - Markdown (.md)
  - HTML (.html)
  - PDF (.pdf) with XeLaTeX for Unicode support
  - Word (.docx) with native Unicode support
- Local file operations
  - File System Access API support
  - Drag and drop
  - Auto-save to local storage
- Material Design 3 UI
  - Light/dark mode toggle
  - Responsive design
  - Accessibility features
- Smart newline removal
  - Smart mode (preserves markdown structure)
  - Paragraph-only mode
  - Aggressive mode

### Technical Features
- Docker containerization
- Reverse proxy support
- Environment-based configuration
- No build step required for frontend
- ES modules architecture

---

## Legend

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements
