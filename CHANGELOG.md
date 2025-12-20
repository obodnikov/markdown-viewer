# Changelog

All notable changes to the Markdown Viewer & Editor project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
