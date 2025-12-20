# BookStack Integration - Implementation Plan

**Date:** 2025-12-20
**Status:** Ready for Implementation

---

## Overview

Add BookStack integration to the Markdown Viewer application, mirroring the existing GitHub integration pattern. Users will be able to load pages from BookStack, edit them, and save changes back (both create new and update existing pages).

---

## Requirements Summary

### Confirmed Specifications

1. ✅ **Backend Proxy Architecture** - All BookStack API calls go through Flask backend
2. ✅ **Hybrid Security Model** - Shared BookStack URL (.env) + Per-user tokens (session)
3. ✅ **Markdown Support** - BookStack has markdown editor enabled
4. ✅ **HTML→Markdown Conversion** - For pages stored as HTML
5. ✅ **Smart Save Button** - Contextual save behavior based on document source
6. ✅ **Conflict Handling** - Warn user, offer merge/overwrite/cancel
7. ✅ **Shelves Support** - Include shelves in navigation hierarchy

### User Experience Flow - Loading from BookStack

```
User clicks "BookStack" button
    ↓
Check authentication status
    ↓
If not authenticated:
    → Show credential form (Token ID + Token Secret)
    → Validate credentials
    → Store in session
    ↓
If authenticated:
    → Show hierarchical browser:
       - Shelves (top level)
         └── Books
             └── Chapters
                 └── Pages
    ↓
User clicks page:
    → Load content (convert HTML→Markdown if needed)
    → Display in editor
    → Set document source = 'bookstack'
    → Set sourceInfo = {pageId: 123, bookId: 45, etc.}
    → Update source indicator: "📚 BookStack > Book > Chapter > Page"
    ↓
User edits and saves (Ctrl+S):
    → Detects source = 'bookstack'
    → Automatically updates same BookStack page
    → Check for conflicts (updated_at comparison)
    → If conflict: Show warning → User chooses overwrite/cancel
    → Save to BookStack
    → Toast: "✅ Saved to BookStack"
```

### User Experience Flow - Creating New Page

```
User creates new document:
    → Clicks "New" button OR starts typing in empty editor
    → Document source = null (new document)
    ↓
User writes content:
    "# Installation Guide
     Follow these steps..."
    ↓
User clicks Save (Ctrl+S) - FIRST TIME:
    → System detects: No source (new document)
    → Shows "Where to save?" dialog:

    ┌──────────────────────────────────┐
    │ Where do you want to save?       │
    ├──────────────────────────────────┤
    │                                  │
    │  [💻 Local File]                 │
    │   Save to your computer          │
    │                                  │
    │  [📚 BookStack]                  │
    │   Save as BookStack page         │
    │                                  │
    │  [🐙 GitHub]                     │
    │   Commit to repository           │
    │                                  │
    │  ☑ Don't ask again (use Local)   │
    │                                  │
    │                       [Cancel]   │
    └──────────────────────────────────┘
    ↓
If user chooses "BookStack":
    → Shows BookStack save dialog:

    ┌──────────────────────────────────┐
    │ Save to BookStack                │
    ├──────────────────────────────────┤
    │ Shelf (Optional):                │
    │ [Documentation ▼]                │
    │                                  │
    │ Book (Required):                 │
    │ [User Guide ▼]                   │
    │                                  │
    │ Chapter (Optional):              │
    │ [Setup ▼]                        │
    │                                  │
    │ Page Name:                       │
    │ [Installation Guide        ]     │
    │                                  │
    │              [Cancel] [Save]     │
    └──────────────────────────────────┘
    ↓
    → Creates new page in BookStack
    → Set document source = 'bookstack'
    → Set sourceInfo = {pageId: 456}
    → Update indicator: "📚 BookStack > User Guide > Setup"
    → Toast: "✅ Page created in BookStack"
    ↓
Next saves (Ctrl+S):
    → Automatically updates same BookStack page
    → No dialog needed (unless conflict)
```

### User Experience Flow - Changing Save Destination

```
User has document open (from any source)
    ↓
User wants to save to DIFFERENT location:
    → Clicks "More" menu → "Save As..."
    → Shows same "Where to save?" dialog
    → User chooses new destination
    → Document source updated to new location
    ↓
Example: Local file → Save as BookStack page:
    → Open local file "notes.md"
    → Edit content
    → Click "Save As..." → Choose "BookStack"
    → Fill in book/chapter/name
    → Creates NEW page in BookStack
    → Future saves update BookStack (not local file)
```

---

## Architecture

### System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ Frontend (Browser)                                             │
│                                                                │
│ ┌──────────────────┐         ┌─────────────────┐             │
│ │ BookStack UI     │────────▶│ API Client      │             │
│ │                  │         │ (utils/api.js)  │             │
│ │ - Auth Form      │         └─────────────────┘             │
│ │ - File Browser   │                 │                        │
│ │ - Save Dialog    │                 │ Session Cookie         │
│ │ - Conflict UI    │                 ▼                        │
│ └──────────────────┘      POST /api/bookstack/*               │
└────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
┌────────────────────────────────────────────────────────────────┐
│ Backend (Flask)                                                │
│                                                                │
│ ┌──────────────────────┐    ┌──────────────────────┐         │
│ │ BookStack Routes     │───▶│ BookStack Service    │         │
│ │                      │    │                      │         │
│ │ /api/bookstack/      │    │ - authenticate()     │         │
│ │ ├─ authenticate      │    │ - list_shelves()     │         │
│ │ ├─ status            │    │ - list_books()       │         │
│ │ ├─ shelves           │    │ - get_book()         │         │
│ │ ├─ books             │    │ - get_page()         │         │
│ │ ├─ page              │    │ - create_page()      │         │
│ │ ├─ create-page       │    │ - update_page()      │         │
│ │ ├─ update-page       │    │ - html_to_markdown() │         │
│ │ └─ logout            │    │ - markdown_to_html() │         │
│ └──────────────────────┘    └──────────────────────┘         │
│          │                           │                         │
│    Flask Session              BOOKSTACK_URL                    │
│    - token_id                 (from .env)                      │
│    - token_secret                                              │
└────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
                        ┌──────────────────────────┐
                        │ BookStack Instance       │
                        │                          │
                        │ API Endpoints:           │
                        │ - GET  /api/shelves      │
                        │ - GET  /api/books        │
                        │ - GET  /api/pages/{id}   │
                        │ - POST /api/pages        │
                        │ - PUT  /api/pages/{id}   │
                        └──────────────────────────┘
```

---

## Smart Save Button Design

### Concept

The application uses a **single Save button (Ctrl+S)** with contextual behavior based on the document's source:

- **Loaded from BookStack** → Save back to BookStack page
- **Loaded from GitHub** → Commit back to GitHub
- **Loaded from local file** → Overwrite local file
- **New document** → Show "Where to save?" dialog

### Benefits

✅ **Fast workflow**: One button, one keystroke (Ctrl+S)
✅ **Intuitive**: Save goes back to where it came from
✅ **Follows conventions**: Like VS Code, Word, Google Docs
✅ **Clean UI**: No toolbar clutter
✅ **Keyboard friendly**: Ctrl+S works everywhere

### Source Detection Logic

```javascript
// Document state tracks the source
currentDocument = {
    title: 'Page Name',
    content: '# Content...',
    source: 'bookstack',  // null | 'local' | 'bookstack' | 'github'
    sourceInfo: {
        pageId: 123,
        bookId: 45,
        chapterId: 10,
        shelfId: 5,
        updatedAt: '2025-12-20T10:30:00Z'  // For conflict detection
    },
    modified: false
}

// Save button logic
function saveFile() {
    if (!currentDocument.source) {
        // New document - show destination dialog
        showSaveDestinationDialog();
    } else {
        // Save back to original source
        switch(currentDocument.source) {
            case 'bookstack': saveToBookStack(); break;
            case 'github': saveToGitHub(); break;
            case 'local': saveToLocal(); break;
        }
    }
}
```

### New Document Flow

When user saves a new document for the first time:

```javascript
// Show dialog with 3 options
┌────────────────────────────────┐
│ Where do you want to save?     │
├────────────────────────────────┤
│                                │
│  [💻 Local File]               │
│   Save to your computer        │
│                                │
│  [📚 BookStack]                │
│   Save as BookStack page       │
│                                │
│  [🐙 GitHub]                   │
│   Commit to repository         │
│                                │
│  ☑ Don't ask again (use Local) │
│                                │
│                     [Cancel]   │
└────────────────────────────────┘

User preferences:
{
    skipSaveDialog: false,     // "Don't ask again" checkbox
    defaultSaveMode: 'local'   // Default if skipping dialog
}
```

### Source Indicator

Visual indicator in toolbar showing current document source:

```html
<!-- For BookStack pages -->
<div class="document-source">
    <span class="material-icons">auto_stories</span>
    <span>BookStack > User Guide > Getting Started</span>
</div>

<!-- For GitHub files -->
<div class="document-source">
    <span class="material-icons">code</span>
    <span>GitHub > username/repo/file.md</span>
</div>

<!-- For local files -->
<div class="document-source">
    <span class="material-icons">description</span>
    <span>Local > document.md</span>
</div>
```

### Save As... Feature

Additional "Save As..." option in toolbar menu for saving to a different location:

```javascript
// Toolbar menu
[File ▼]
├─ New Document
├─ Open File...
├─ Save (Ctrl+S)
├─ Save As...          ← Opens destination dialog
├─ Export...
└─ Close

// When user clicks "Save As..."
function saveAs() {
    // Always show destination dialog
    // Even if document has existing source
    showSaveDestinationDialog();
}

// Example: Convert local file to BookStack page
// 1. Open local file → source = 'local'
// 2. Click "Save As..." → Choose "BookStack"
// 3. Fill in book/chapter/name
// 4. Creates new page → source = 'bookstack'
// 5. Future Ctrl+S saves to BookStack (not local file)
```

### Toast Notifications

Clear feedback after each save operation:

```javascript
// Success toasts
"✅ Saved to BookStack"
"✅ Saved to Local File"
"✅ Committed to GitHub"
"✅ Page created in BookStack"
"✅ Page updated in BookStack"

// Error toasts
"❌ Save failed: Authentication required"
"❌ Save failed: Permission denied"
"⚠️ Conflict detected - page was modified remotely"
```

### Implementation in main.js

```javascript
class MarkdownViewerApp {
    constructor() {
        this.currentDocument = {
            title: 'Untitled Document',
            content: '',
            source: null,        // Document source type
            sourceInfo: null,    // Source-specific metadata
            modified: false
        };

        this.preferences = {
            skipSaveDialog: false,
            defaultSaveMode: 'local'
        };
    }

    async saveFile() {
        const content = this.getCurrentContent();

        // New document - ask where to save
        if (!this.currentDocument.source) {
            return this.saveNewDocument(content);
        }

        // Save to existing source
        switch(this.currentDocument.source) {
            case 'local':
                return this.saveToLocal(content);

            case 'bookstack':
                return this.saveToBookStack(content);

            case 'github':
                return this.saveToGitHub(content);
        }
    }

    async saveNewDocument(content) {
        // Check user preference
        if (this.preferences.skipSaveDialog) {
            return this.saveWithMode(this.preferences.defaultSaveMode, content);
        }

        // Show destination dialog
        const mode = await this.showSaveDestinationDialog();
        if (!mode) return; // User cancelled

        return this.saveWithMode(mode, content);
    }

    async saveWithMode(mode, content) {
        switch(mode) {
            case 'local':
                const result = await this.fileManager.saveFile(content, this.currentDocument.title);
                if (result) {
                    this.currentDocument.source = 'local';
                    this.currentDocument.sourceInfo = { fileHandle: this.fileManager.fileHandle };
                    this.updateSourceIndicator('Local', 'description', this.currentDocument.title);
                    this.showToast('✅ Saved to Local File', 'success');
                }
                break;

            case 'bookstack':
                const page = await this.bookstackUI.showSaveDialog(content, this.currentDocument.title);
                if (page) {
                    this.currentDocument.source = 'bookstack';
                    this.currentDocument.sourceInfo = {
                        pageId: page.id,
                        bookId: page.book_id,
                        chapterId: page.chapter_id,
                        shelfId: page.shelf_id,
                        updatedAt: page.updated_at
                    };
                    this.updateSourceIndicator('BookStack', 'auto_stories', page.name);
                    this.showToast('✅ Page created in BookStack', 'success');
                }
                break;

            case 'github':
                const commit = await this.githubUI.showSaveDialog(content, this.currentDocument.title);
                if (commit) {
                    this.currentDocument.source = 'github';
                    this.currentDocument.sourceInfo = {
                        repo: commit.repo,
                        path: commit.path,
                        sha: commit.sha
                    };
                    this.updateSourceIndicator('GitHub', 'code', `${commit.repo}/${commit.path}`);
                    this.showToast('✅ Committed to GitHub', 'success');
                }
                break;
        }
    }

    async saveToBookStack(content) {
        const pageId = this.currentDocument.sourceInfo.pageId;
        const updatedAt = this.currentDocument.sourceInfo.updatedAt;

        try {
            const result = await this.bookstackUI.updatePage(pageId, content, updatedAt);

            if (result.conflict) {
                // Show conflict dialog
                const resolution = await this.showConflictDialog(result.remotePage);

                if (resolution === 'overwrite') {
                    // Force update
                    const updated = await this.bookstackUI.updatePage(pageId, content, null, true);
                    this.currentDocument.sourceInfo.updatedAt = updated.updated_at;
                    this.showToast('✅ Page updated in BookStack (overwritten)', 'success');
                } else {
                    this.showToast('❌ Save cancelled', 'error');
                }
            } else {
                // Success
                this.currentDocument.sourceInfo.updatedAt = result.page.updated_at;
                this.showToast('✅ Saved to BookStack', 'success');
                this.currentDocument.modified = false;
            }
        } catch (error) {
            this.showToast(`❌ Save failed: ${error.message}`, 'error');
        }
    }

    async showSaveDestinationDialog() {
        return new Promise((resolve) => {
            // Show modal with big buttons for Local/BookStack/GitHub
            // Return selected mode or null if cancelled
        });
    }

    updateSourceIndicator(sourceName, icon, path) {
        const indicator = document.getElementById('document-source');
        indicator.innerHTML = `
            <span class="material-icons">${icon}</span>
            <span>${sourceName} > ${path}</span>
        `;
    }

    loadFromBookStack(pageData) {
        // Called when user loads page from BookStack browser
        this.currentDocument.title = pageData.name;
        this.currentDocument.content = pageData.markdown;
        this.currentDocument.source = 'bookstack';
        this.currentDocument.sourceInfo = {
            pageId: pageData.id,
            bookId: pageData.book_id,
            chapterId: pageData.chapter_id,
            shelfId: pageData.shelf_id,
            updatedAt: pageData.updated_at
        };

        this.editor.setValue(pageData.markdown);
        this.updateSourceIndicator('BookStack', 'auto_stories', pageData.name);
    }
}
```

---

## Implementation Details

### 1. Backend Implementation

#### File: `/backend/config.py` (MODIFY)

Add BookStack configuration:

```python
# BookStack Integration
BOOKSTACK_URL = os.environ.get('BOOKSTACK_URL', '')
BOOKSTACK_API_TIMEOUT = int(os.environ.get('BOOKSTACK_API_TIMEOUT', '30'))
```

#### File: `/backend/services/bookstack_service.py` (NEW)

**Purpose:** Wrapper for BookStack API calls

**Key Methods:**

```python
class BookStackService:
    def __init__(self, base_url, token_id, token_secret):
        """Initialize with BookStack URL and user credentials"""

    def _get_headers(self):
        """Return Authorization header"""
        # Format: Token <token_id>:<token_secret>

    def authenticate(self):
        """Validate credentials by calling /api/users/me"""
        # Returns: user info or raises exception

    def list_shelves(self, count=100, offset=0, sort='+name'):
        """Get list of shelves"""
        # GET /api/shelves
        # Returns: [{"id": 1, "name": "...", "books": [...]}]

    def list_books(self, count=100, offset=0, sort='+name'):
        """Get list of all books"""
        # GET /api/books
        # Returns: [{"id": 1, "name": "...", "slug": "..."}]

    def get_book(self, book_id):
        """Get book with chapters and pages"""
        # GET /api/books/{id}
        # Returns: {"id": 1, "name": "...", "chapters": [...], "pages": [...]}

    def get_page(self, page_id):
        """Get page content with metadata"""
        # GET /api/pages/{id}
        # Returns: {"id": 1, "name": "...", "markdown": "...", "html": "...", "updated_at": "..."}

    def create_page(self, book_id, name, markdown, chapter_id=None, tags=[]):
        """Create new page"""
        # POST /api/pages
        # Body: {"book_id": 1, "chapter_id": 2, "name": "...", "markdown": "..."}
        # Returns: created page object

    def update_page(self, page_id, markdown, name=None, updated_at=None):
        """Update existing page"""
        # PUT /api/pages/{id}
        # Check updated_at for conflicts
        # Returns: updated page object

    def html_to_markdown(self, html):
        """Convert HTML to markdown using html2text"""
        # Preserve structure, handle BookStack-specific elements

    def markdown_to_html(self, markdown):
        """Convert markdown to HTML using markdown library"""
        # For BookStack instances without markdown support
```

**Dependencies:**
- `requests` - HTTP client (already in requirements.txt)
- `html2text` - HTML to Markdown conversion (NEW)
- `markdown` - Markdown to HTML conversion (NEW, fallback only)

#### File: `/backend/routes/bookstack.py` (NEW)

**Purpose:** Flask routes for BookStack integration

**Endpoints:**

```python
# Authentication
POST /api/bookstack/authenticate
    Body: {"token_id": "...", "token_secret": "..."}
    Action: Validate credentials, store in session
    Returns: {"success": true, "user": {...}}

GET /api/bookstack/status
    Action: Check if user is authenticated
    Returns: {"authenticated": true/false, "user": {...}}

POST /api/bookstack/logout
    Action: Clear session
    Returns: {"success": true}

# Content Browsing
GET /api/bookstack/shelves
    Query: ?count=100&offset=0&sort=+name
    Action: List all shelves with books
    Returns: {"data": [...], "total": 10}

GET /api/bookstack/books
    Query: ?count=100&offset=0&sort=+name&shelf_id=1
    Action: List books (optionally filtered by shelf)
    Returns: {"data": [...], "total": 25}

GET /api/bookstack/book/<int:book_id>
    Action: Get book with chapters and pages
    Returns: {"id": 1, "name": "...", "chapters": [...], "pages": [...]}

GET /api/bookstack/page/<int:page_id>
    Action: Get page content (with HTML→Markdown conversion if needed)
    Returns: {
        "id": 1,
        "book_id": 5,
        "chapter_id": 10,
        "name": "Page Title",
        "markdown": "# Content...",
        "updated_at": "2025-12-20T10:30:00Z",
        "tags": [...]
    }

# Content Modification
POST /api/bookstack/page
    Body: {
        "book_id": 5,
        "chapter_id": 10,  // optional
        "name": "New Page",
        "markdown": "# Content...",
        "tags": ["tag1", "tag2"]  // optional
    }
    Action: Create new page
    Returns: {"success": true, "page": {...}}

PUT /api/bookstack/page/<int:page_id>
    Body: {
        "markdown": "# Updated content...",
        "name": "Updated Title",  // optional
        "updated_at": "2025-12-20T10:30:00Z",  // for conflict detection
        "conflict_resolution": "overwrite"  // or "cancel"
    }
    Action: Update existing page
    Returns: {
        "success": true,
        "page": {...},
        "conflict": false  // or true if conflict detected
    }
```

**Session Management:**

```python
# Store in session after authentication
session['bookstack_token_id'] = token_id
session['bookstack_token_secret'] = token_secret
session['bookstack_authenticated'] = True
session['bookstack_user'] = user_info

# Retrieve for each request
@login_required
def protected_route():
    token_id = session.get('bookstack_token_id')
    token_secret = session.get('bookstack_token_secret')
    service = BookStackService(BOOKSTACK_URL, token_id, token_secret)
    # ... make API calls
```

#### File: `/backend/app.py` (MODIFY)

Register BookStack routes:

```python
from routes.bookstack import bookstack_bp

# Register blueprints
app.register_blueprint(bookstack_bp)
```

#### File: `/backend/requirements.txt` (MODIFY)

Add new dependencies:

```txt
html2text==2024.2.26
markdown==3.5.1
```

---

### 2. Frontend Implementation

#### File: `/scripts/file/bookstack.js` (NEW)

**Purpose:** BookStack UI dialog and file browser

**Structure:**

```javascript
class BookStackUI {
    constructor() {
        this.dialog = null;
        this.currentView = 'auth'; // auth, shelves, books, chapters
        this.selectedShelf = null;
        this.selectedBook = null;
        this.selectedChapter = null;
        this.currentPage = null;  // For conflict detection
    }

    // === Authentication ===

    async show() {
        // Check authentication status
        // Show auth form or file browser
    }

    renderAuthForm() {
        // Two input fields:
        // - Token ID (text)
        // - Token Secret (password)
        // - Connect button
    }

    async authenticate(tokenId, tokenSecret) {
        // POST /api/bookstack/authenticate
        // On success: show file browser
    }

    async checkStatus() {
        // GET /api/bookstack/status
        // Returns: {authenticated: bool, user: {...}}
    }

    async disconnect() {
        // POST /api/bookstack/logout
        // Show auth form
    }

    // === File Browser ===

    async renderShelvesList() {
        // GET /api/bookstack/shelves
        // Display: [Shelf Icon] Shelf Name (X books)
        // Click: load shelf's books
    }

    async renderBooksList(shelfId = null) {
        // GET /api/bookstack/books?shelf_id=X
        // Display: [Book Icon] Book Name
        // Click: load book's chapters/pages
    }

    async renderBookContents(bookId) {
        // GET /api/bookstack/book/{id}
        // Display tree:
        // - Direct pages (no chapter)
        // - Chapters
        //   - Pages in chapter
        // Click page: load into editor
    }

    async loadPage(pageId) {
        // GET /api/bookstack/page/{id}
        // Store metadata for conflict detection
        // Load markdown into editor
        // Close dialog
        // Update app state
    }

    // === Save Operations ===

    async showSaveDialog(markdown) {
        // Modal dialog with:
        // - Shelf dropdown (optional, shows books when selected)
        // - Book dropdown (required)
        // - Chapter dropdown (optional, "No chapter" option)
        // - Page name input (for new pages)
        // - "Create New" vs "Update Existing" radio
        // - If updating: Page dropdown from selected book/chapter
        // - Save button
    }

    async saveNewPage(bookId, chapterId, name, markdown) {
        // POST /api/bookstack/page
        // Show success toast
    }

    async updatePage(pageId, markdown, name) {
        // PUT /api/bookstack/page/{id}
        // Include original updated_at timestamp
        // Handle conflict response
    }

    // === Conflict Resolution ===

    showConflictDialog(localContent, remoteContent, pageInfo) {
        // Show modal with:
        // - Warning message
        // - Side-by-side diff (optional, or just text comparison)
        // - Three buttons:
        //   - "Overwrite" (use my changes)
        //   - "Merge" (open merge editor - future feature)
        //   - "Cancel" (don't save)
    }

    // === Navigation ===

    renderBreadcrumbs() {
        // Show: Shelves > Shelf Name > Book Name > Chapter Name
        // Click: navigate to that level
    }

    goBack() {
        // Navigate up one level in hierarchy
    }
}

// Export singleton instance
export const BookStackUI = new BookStackUI();
```

**Key Features:**
- Hierarchical navigation (Shelves → Books → Chapters → Pages)
- Breadcrumb navigation for easy back-tracking
- Loading states and error handling
- Toast notifications for success/error
- Modal dialogs for save and conflict resolution

#### File: `/public/index.html` (MODIFY)

Add BookStack dialog HTML:

```html
<!-- BookStack Dialog -->
<div id="bookstack-dialog" class="dialog" style="display: none;">
    <div class="dialog__overlay"></div>
    <div class="dialog__content dialog__content--large">
        <div class="dialog__header">
            <h2 id="bookstack-dialog-title">BookStack</h2>
            <button class="dialog__close" aria-label="Close">&times;</button>
        </div>
        <div class="dialog__body" id="bookstack-dialog-body">
            <!-- Dynamic content rendered by bookstack.js -->
        </div>
        <div class="dialog__footer" id="bookstack-dialog-footer">
            <!-- Action buttons rendered by bookstack.js -->
        </div>
    </div>
</div>

<!-- BookStack Save Dialog -->
<div id="bookstack-save-dialog" class="dialog" style="display: none;">
    <div class="dialog__overlay"></div>
    <div class="dialog__content">
        <div class="dialog__header">
            <h2>Save to BookStack</h2>
            <button class="dialog__close" aria-label="Close">&times;</button>
        </div>
        <div class="dialog__body">
            <form id="bookstack-save-form">
                <div class="form-group">
                    <label>
                        <input type="radio" name="save-mode" value="create" checked>
                        Create New Page
                    </label>
                    <label>
                        <input type="radio" name="save-mode" value="update">
                        Update Existing Page
                    </label>
                </div>

                <div class="form-group">
                    <label for="bookstack-shelf">Shelf (Optional)</label>
                    <select id="bookstack-shelf">
                        <option value="">No Shelf</option>
                        <!-- Populated dynamically -->
                    </select>
                </div>

                <div class="form-group">
                    <label for="bookstack-book">Book *</label>
                    <select id="bookstack-book" required>
                        <option value="">Select a book...</option>
                        <!-- Populated dynamically -->
                    </select>
                </div>

                <div class="form-group">
                    <label for="bookstack-chapter">Chapter (Optional)</label>
                    <select id="bookstack-chapter">
                        <option value="">No Chapter</option>
                        <!-- Populated dynamically -->
                    </select>
                </div>

                <div class="form-group" id="page-name-group">
                    <label for="bookstack-page-name">Page Name *</label>
                    <input type="text" id="bookstack-page-name" required>
                </div>

                <div class="form-group" id="page-select-group" style="display: none;">
                    <label for="bookstack-page">Page *</label>
                    <select id="bookstack-page" required>
                        <option value="">Select a page...</option>
                        <!-- Populated dynamically -->
                    </select>
                </div>
            </form>
        </div>
        <div class="dialog__footer">
            <button class="button" id="bookstack-save-cancel">Cancel</button>
            <button class="button button--primary" id="bookstack-save-submit">Save</button>
        </div>
    </div>
</div>

<!-- BookStack Conflict Dialog -->
<div id="bookstack-conflict-dialog" class="dialog" style="display: none;">
    <div class="dialog__overlay"></div>
    <div class="dialog__content">
        <div class="dialog__header">
            <h2>⚠️ Page Modified</h2>
        </div>
        <div class="dialog__body">
            <p>This page has been modified in BookStack since you loaded it.</p>
            <p><strong>What would you like to do?</strong></p>
            <div id="bookstack-conflict-info">
                <!-- Show last modified time, user, etc. -->
            </div>
        </div>
        <div class="dialog__footer">
            <button class="button" id="bookstack-conflict-cancel">Cancel</button>
            <button class="button button--secondary" id="bookstack-conflict-merge" disabled>
                Merge (Coming Soon)
            </button>
            <button class="button button--primary" id="bookstack-conflict-overwrite">
                Overwrite
            </button>
        </div>
    </div>
</div>

<!-- Save Destination Dialog (for new documents) -->
<div id="save-destination-dialog" class="dialog" style="display: none;">
    <div class="dialog__overlay"></div>
    <div class="dialog__content">
        <div class="dialog__header">
            <h2>Where do you want to save?</h2>
        </div>
        <div class="dialog__body">
            <div class="save-destination-options">
                <!-- Big button options -->
                <button class="save-destination-btn" data-mode="local">
                    <span class="material-icons">description</span>
                    <div class="save-destination-btn__content">
                        <h3>Local File</h3>
                        <p>Save to your computer</p>
                    </div>
                </button>

                <button class="save-destination-btn" data-mode="bookstack" id="save-dest-bookstack">
                    <span class="material-icons">auto_stories</span>
                    <div class="save-destination-btn__content">
                        <h3>BookStack</h3>
                        <p>Save as BookStack page</p>
                    </div>
                </button>

                <button class="save-destination-btn" data-mode="github" id="save-dest-github">
                    <span class="material-icons">code</span>
                    <div class="save-destination-btn__content">
                        <h3>GitHub</h3>
                        <p>Commit to repository</p>
                    </div>
                </button>
            </div>

            <div class="save-destination-preferences">
                <label>
                    <input type="checkbox" id="skip-save-dialog">
                    Don't ask again (always use Local File)
                </label>
            </div>
        </div>
        <div class="dialog__footer">
            <button class="button" id="save-destination-cancel">Cancel</button>
        </div>
    </div>
</div>
```

Add document source indicator and BookStack button to toolbar:

```html
<!-- Toolbar with source indicator -->
<div class="toolbar">
    <div class="toolbar__left">
        <button id="btn-new">New</button>
        <button id="btn-open">Open</button>
        <button id="btn-save">Save</button>

        <!-- Document source indicator -->
        <div id="document-source" class="document-source" style="display: none;">
            <span class="material-icons"></span>
            <span class="document-source__path"></span>
        </div>
    </div>

    <div class="toolbar__right">
        <button id="btn-github">GitHub</button>

        <!-- Add BookStack button -->
        <button id="btn-bookstack" title="BookStack (Ctrl/Cmd+K)">
            <span class="material-icons">auto_stories</span>
            <span>BookStack</span>
        </button>

        <button id="btn-export">Export</button>
        <button id="btn-theme">Theme</button>
    </div>
</div>
```

#### File: `/scripts/main.js` (MODIFY)

Update to include BookStack integration and smart save logic:

```javascript
import { BookStackUI } from './file/bookstack.js';

class MarkdownViewerApp {
    constructor() {
        this.currentDocument = {
            title: 'Untitled Document',
            content: '',
            source: null,        // null | 'local' | 'bookstack' | 'github'
            sourceInfo: null,    // Source-specific metadata
            modified: false
        };

        this.preferences = {
            skipSaveDialog: localStorage.getItem('skipSaveDialog') === 'true',
            defaultSaveMode: localStorage.getItem('defaultSaveMode') || 'local'
        };
    }

    // Initialize BookStack UI
    this.bookstackUI = new BookStackUI(this.loadFromBookStack.bind(this));

    setupEventListeners() {
        // Existing listeners...
        document.getElementById('btn-save')?.addEventListener('click', () => this.saveFile());
        document.getElementById('btn-bookstack')?.addEventListener('click', () => {
            this.bookstackUI.show();
        });
        document.getElementById('btn-save-as')?.addEventListener('click', () => {
            this.saveAs();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveFile();
            }
            // Ctrl/Cmd + K: BookStack
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.bookstackUI.show();
            }
        });

        // Save destination dialog handlers
        document.querySelectorAll('.save-destination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.handleSaveDestinationChoice(mode);
            });
        });
    }

    // === Smart Save Logic ===

    async saveFile() {
        const content = this.getCurrentContent();

        // New document - ask where to save
        if (!this.currentDocument.source) {
            return this.saveNewDocument(content);
        }

        // Save to existing source
        switch(this.currentDocument.source) {
            case 'local':
                return this.saveToLocal(content);
            case 'bookstack':
                return this.saveToBookStack(content);
            case 'github':
                return this.saveToGitHub(content);
        }
    }

    async saveNewDocument(content) {
        // Check user preference
        if (this.preferences.skipSaveDialog) {
            return this.saveWithMode(this.preferences.defaultSaveMode, content);
        }

        // Show destination dialog
        const dialog = document.getElementById('save-destination-dialog');
        dialog.showModal();

        // Wait for user choice (handled by handleSaveDestinationChoice)
    }

    async handleSaveDestinationChoice(mode) {
        const dialog = document.getElementById('save-destination-dialog');
        const skipDialog = document.getElementById('skip-save-dialog').checked;

        // Save preference if checkbox is checked
        if (skipDialog) {
            this.preferences.skipSaveDialog = true;
            this.preferences.defaultSaveMode = 'local'; // Always local when skipping
            localStorage.setItem('skipSaveDialog', 'true');
        }

        dialog.close();

        const content = this.getCurrentContent();
        await this.saveWithMode(mode, content);
    }

    async saveAs() {
        // Always show destination dialog, even for existing documents
        const dialog = document.getElementById('save-destination-dialog');
        dialog.showModal();
    }

    async saveWithMode(mode, content) {
        switch(mode) {
            case 'local':
                const result = await this.fileManager.saveFile(content, this.currentDocument.title);
                if (result) {
                    this.currentDocument.source = 'local';
                    this.currentDocument.sourceInfo = {
                        fileHandle: this.fileManager.fileHandle
                    };
                    this.updateSourceIndicator('Local', 'description', this.currentDocument.title);
                    this.showToast('✅ Saved to Local File', 'success');
                    this.currentDocument.modified = false;
                }
                break;

            case 'bookstack':
                const page = await this.bookstackUI.showCreateDialog(content, this.currentDocument.title);
                if (page) {
                    this.currentDocument.source = 'bookstack';
                    this.currentDocument.sourceInfo = {
                        pageId: page.id,
                        bookId: page.book_id,
                        chapterId: page.chapter_id,
                        updatedAt: page.updated_at
                    };
                    this.updateSourceIndicator('BookStack', 'auto_stories', page.name);
                    this.showToast('✅ Page created in BookStack', 'success');
                    this.currentDocument.modified = false;
                }
                break;

            case 'github':
                // Similar to BookStack...
                break;
        }
    }

    async saveToBookStack(content) {
        const pageId = this.currentDocument.sourceInfo.pageId;
        const updatedAt = this.currentDocument.sourceInfo.updatedAt;

        try {
            const result = await APIClient.put(`/bookstack/page/${pageId}`, {
                markdown: content,
                updated_at: updatedAt
            });

            if (result.conflict) {
                // Show conflict dialog
                const resolution = await this.showConflictDialog(result.remote_page);

                if (resolution === 'overwrite') {
                    // Force update
                    const updated = await APIClient.put(`/bookstack/page/${pageId}`, {
                        markdown: content,
                        conflict_resolution: 'overwrite'
                    });
                    this.currentDocument.sourceInfo.updatedAt = updated.page.updated_at;
                    this.showToast('✅ Page updated in BookStack (overwritten)', 'success');
                    this.currentDocument.modified = false;
                } else {
                    this.showToast('❌ Save cancelled', 'info');
                }
            } else {
                // Success
                this.currentDocument.sourceInfo.updatedAt = result.page.updated_at;
                this.showToast('✅ Saved to BookStack', 'success');
                this.currentDocument.modified = false;
            }
        } catch (error) {
            this.showToast(`❌ Save failed: ${error.message}`, 'error');
        }
    }

    updateSourceIndicator(sourceName, icon, path) {
        const indicator = document.getElementById('document-source');
        const iconEl = indicator.querySelector('.material-icons');
        const pathEl = indicator.querySelector('.document-source__path');

        iconEl.textContent = icon;
        pathEl.textContent = `${sourceName} > ${path}`;
        indicator.style.display = 'flex';
    }

    hideSourceIndicator() {
        const indicator = document.getElementById('document-source');
        indicator.style.display = 'none';
    }

    loadFromBookStack(pageData) {
        // Called when user loads page from BookStack browser
        this.currentDocument.title = pageData.name;
        this.currentDocument.content = pageData.markdown;
        this.currentDocument.source = 'bookstack';
        this.currentDocument.sourceInfo = {
            pageId: pageData.id,
            bookId: pageData.book_id,
            chapterId: pageData.chapter_id,
            updatedAt: pageData.updated_at
        };

        this.editor.setValue(pageData.markdown);
        this.editableTitle.setValue(pageData.name);
        this.updateSourceIndicator('BookStack', 'auto_stories', pageData.name);
        this.updatePreview();
    }

    newDocument() {
        // Reset document state
        this.currentDocument = {
            title: 'Untitled Document',
            content: '',
            source: null,
            sourceInfo: null,
            modified: false
        };

        this.editor.setValue('');
        this.editableTitle.setValue('Untitled Document');
        this.hideSourceIndicator();
        this.updatePreview();
    }

    async showConflictDialog(remotePage) {
        return new Promise((resolve) => {
            const dialog = document.getElementById('bookstack-conflict-dialog');
            const info = document.getElementById('bookstack-conflict-info');

            info.innerHTML = `
                <p><strong>Last modified:</strong> ${new Date(remotePage.updated_at).toLocaleString()}</p>
                <p><strong>By:</strong> ${remotePage.updated_by?.name || 'Unknown'}</p>
            `;

            dialog.showModal();

            document.getElementById('bookstack-conflict-overwrite').onclick = () => {
                dialog.close();
                resolve('overwrite');
            };

            document.getElementById('bookstack-conflict-cancel').onclick = () => {
                dialog.close();
                resolve('cancel');
            };
        });
    }
}

// Initialize app
const app = new MarkdownViewerApp();
app.init();

// Keyboard shortcut (Ctrl/Cmd + K)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        BookStackUI.show();
    }
});

// Handle OAuth callback or success URL parameter
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('bookstack_auth') === 'success') {
    showToast('Connected to BookStack successfully!', 'success');
    window.history.replaceState({}, '', window.location.pathname);
}
```

#### File: `/scripts/utils/api.js` (VERIFY)

Ensure APIClient supports session cookies (should already be configured):

```javascript
class APIClient {
    async request(endpoint, options = {}) {
        const response = await fetch(this.baseUrl + endpoint, {
            ...options,
            credentials: 'include',  // IMPORTANT: Send cookies
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        // ... error handling
    }
}
```

---

### 3. Configuration

#### File: `.env.example` (MODIFY)

Add BookStack configuration:

```bash
# BookStack Integration (Optional)
# Get API tokens from: https://your-bookstack.com/settings/users
BOOKSTACK_URL=https://bookstack.example.com
BOOKSTACK_API_TIMEOUT=30
```

#### File: `.env` (User creates)

User adds their BookStack URL:

```bash
BOOKSTACK_URL=https://bookstack.example.com
```

---

### 4. Documentation

#### File: `README.md` (MODIFY)

Add BookStack section:

```markdown
### BookStack Integration (Optional)

1. Configure BookStack URL in `.env`:
   ```
   BOOKSTACK_URL=https://bookstack.example.com
   ```

2. Create API tokens for each user:
   - Go to BookStack → Settings → Users → Select User
   - Navigate to "API Tokens" section
   - Create new token with appropriate permissions
   - Give Token ID and Token Secret to user

3. Users authenticate in the app:
   - Click "BookStack" button
   - Enter Token ID and Token Secret
   - Browse shelves, books, chapters, and pages
   - Load pages into editor
   - Save changes back to BookStack

**Features:**
- Hierarchical navigation (Shelves → Books → Chapters → Pages)
- Create new pages or update existing ones
- Conflict detection and resolution
- Session-based authentication (logout clears credentials)
```

#### File: `docs/chats/bookstack-integration-implementation-plan-2025-12-20.md` (THIS FILE)

Complete implementation plan for future reference.

---

## API Reference

### BookStack API Endpoints Used

```
Authentication:
GET /api/users/me
    Headers: Authorization: Token <token_id>:<token_secret>
    Returns: Current user info

Shelves:
GET /api/shelves
    Query: count, offset, sort
    Returns: {"data": [...], "total": 10}

Books:
GET /api/books
    Query: count, offset, sort, filter[shelf_id]
    Returns: {"data": [...], "total": 25}

GET /api/books/{id}
    Returns: Book with chapters and pages array

Pages:
GET /api/pages/{id}
    Returns: Page with content (markdown and/or html)

POST /api/pages
    Body: {
        "book_id": 1,
        "chapter_id": 2,  // optional
        "name": "Page Title",
        "markdown": "# Content",
        "tags": [{"name": "tag1"}]  // optional
    }
    Returns: Created page object

PUT /api/pages/{id}
    Body: {
        "name": "Updated Title",
        "markdown": "# Updated content",
        "tags": [{"name": "tag1"}]
    }
    Returns: Updated page object
```

### Internal API Endpoints (Frontend → Backend)

```
POST /api/bookstack/authenticate
    Body: {"token_id": "...", "token_secret": "..."}
    Returns: {"success": true, "user": {...}}

GET /api/bookstack/status
    Returns: {"authenticated": true, "user": {...}}

POST /api/bookstack/logout
    Returns: {"success": true}

GET /api/bookstack/shelves
    Returns: {"data": [...], "total": 10}

GET /api/bookstack/books?shelf_id=1
    Returns: {"data": [...], "total": 25}

GET /api/bookstack/book/<id>
    Returns: {"id": 1, "name": "...", "chapters": [...], "pages": [...]}

GET /api/bookstack/page/<id>
    Returns: {
        "id": 1,
        "book_id": 5,
        "chapter_id": 10,
        "name": "...",
        "markdown": "...",
        "updated_at": "...",
        "tags": [...]
    }

POST /api/bookstack/page
    Body: {"book_id": 5, "chapter_id": 10, "name": "...", "markdown": "..."}
    Returns: {"success": true, "page": {...}}

PUT /api/bookstack/page/<id>
    Body: {"markdown": "...", "updated_at": "...", "conflict_resolution": "overwrite"}
    Returns: {"success": true, "page": {...}, "conflict": false}
```

---

## Implementation Checklist

### Backend

- [ ] Update `backend/config.py` - Add BOOKSTACK_URL, BOOKSTACK_API_TIMEOUT
- [ ] Create `backend/services/bookstack_service.py`
  - [ ] BookStackService class
  - [ ] authenticate() method
  - [ ] list_shelves() method
  - [ ] list_books() method
  - [ ] get_book() method
  - [ ] get_page() method with HTML→Markdown conversion
  - [ ] create_page() method
  - [ ] update_page() method with conflict detection
  - [ ] html_to_markdown() helper
  - [ ] markdown_to_html() helper (fallback)
- [ ] Create `backend/routes/bookstack.py`
  - [ ] POST /authenticate endpoint
  - [ ] GET /status endpoint
  - [ ] POST /logout endpoint
  - [ ] GET /shelves endpoint
  - [ ] GET /books endpoint
  - [ ] GET /book/<id> endpoint
  - [ ] GET /page/<id> endpoint
  - [ ] POST /page endpoint
  - [ ] PUT /page/<id> endpoint
  - [ ] Session management helpers
- [ ] Update `backend/app.py` - Register bookstack blueprint
- [ ] Update `backend/requirements.txt` - Add html2text, markdown

### Frontend

- [ ] Create `scripts/file/bookstack.js`
  - [ ] BookStackUI class
  - [ ] Authentication UI (renderAuthForm, authenticate)
  - [ ] Status checking (checkStatus)
  - [ ] File browser (renderShelvesList, renderBooksList, renderBookContents)
  - [ ] Page loading (loadPage)
  - [ ] Save dialog (showSaveDialog, saveNewPage, updatePage)
  - [ ] Conflict resolution UI (showConflictDialog)
  - [ ] Navigation helpers (breadcrumbs, goBack)
  - [ ] Error handling and loading states
- [ ] Update `public/index.html`
  - [ ] Add BookStack button to toolbar
  - [ ] Add bookstack-dialog HTML structure
  - [ ] Add bookstack-save-dialog HTML structure
  - [ ] Add bookstack-conflict-dialog HTML structure
- [ ] Update `scripts/main.js`
  - [ ] Import BookStackUI
  - [ ] Add button click handler
  - [ ] Add keyboard shortcut (Ctrl/Cmd+K)
  - [ ] Handle authentication success callback
- [ ] Verify `scripts/utils/api.js` - Ensure credentials: 'include'

### Configuration & Documentation

- [ ] Update `.env.example` - Add BOOKSTACK_URL template
- [ ] Update `README.md` - Add BookStack integration section
- [ ] Create this document: `docs/chats/bookstack-integration-implementation-plan-2025-12-20.md`

### Styling (Optional)

- [ ] Add BookStack-specific styles if needed
  - [ ] Shelf/Book/Chapter/Page icons
  - [ ] File browser tree styles
  - [ ] Conflict dialog styles
  - [ ] Save dialog styles

### Testing

- [ ] Test authentication flow
  - [ ] Valid credentials → Success
  - [ ] Invalid credentials → Error
  - [ ] Session persistence
  - [ ] Logout clears session
- [ ] Test file browser
  - [ ] List shelves
  - [ ] Navigate to books
  - [ ] Navigate to chapters
  - [ ] Navigate to pages
  - [ ] Load page content
- [ ] Test save operations
  - [ ] Create new page (with/without chapter)
  - [ ] Update existing page
  - [ ] Conflict detection
  - [ ] Conflict resolution (overwrite)
- [ ] Test HTML→Markdown conversion
  - [ ] Load HTML page → Converts to Markdown
  - [ ] Load Markdown page → Uses directly
- [ ] Test error handling
  - [ ] Network errors
  - [ ] Invalid BookStack URL
  - [ ] Permission errors
  - [ ] Missing pages/books

---

## Security Considerations

### Session Security

```python
# Flask session configuration (already in app.py, verify settings)
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY'),
    SESSION_COOKIE_HTTPONLY=True,   # Prevent XSS
    SESSION_COOKIE_SECURE=True,      # HTTPS only (production)
    SESSION_COOKIE_SAMESITE='Lax',   # CSRF protection
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24)  # Auto logout
)
```

### Token Management

1. **User Responsibility:**
   - Users generate their own API tokens in BookStack
   - Tokens stored only in session (not database)
   - Sessions expire after 24 hours
   - Users can logout to clear immediately

2. **Admin Responsibility:**
   - Create BookStack role with minimal permissions
   - Set token expiry (recommend 6-12 months)
   - Revoke tokens when users leave team
   - Monitor BookStack audit log

3. **Backend Security:**
   - Credentials never exposed to frontend
   - All API calls go through backend proxy
   - Session cookies are httpOnly (JavaScript can't read)
   - HTTPS required in production

### Network Security

1. **BookStack URL:**
   - Configured in `.env` (server-side only)
   - Validated on backend startup
   - Supports internal network URLs
   - HTTPS strongly recommended

2. **API Communication:**
   - Frontend → Backend: HTTPS + session cookies
   - Backend → BookStack: HTTPS + token auth
   - No credentials in URL parameters
   - No credentials in localStorage

---

## Conflict Detection Algorithm

### How It Works

1. **On Load:**
   ```javascript
   // Store original metadata
   this.currentPage = {
       id: 123,
       updated_at: "2025-12-20T10:30:00Z",
       name: "Original Title",
       markdown: "# Original content..."
   };
   ```

2. **On Save (Update):**
   ```javascript
   // Send original timestamp
   PUT /api/bookstack/page/123
   Body: {
       markdown: "# New content...",
       updated_at: "2025-12-20T10:30:00Z"  // Original timestamp
   }
   ```

3. **Backend Checks:**
   ```python
   # Get current page from BookStack
   current_page = service.get_page(page_id)

   # Compare timestamps
   if current_page['updated_at'] != request_updated_at:
       # Conflict detected!
       return {
           "success": false,
           "conflict": true,
           "remote_page": current_page
       }

   # No conflict, proceed with update
   updated_page = service.update_page(page_id, markdown)
   return {"success": true, "page": updated_page}
   ```

4. **Frontend Handles Conflict:**
   ```javascript
   if (response.conflict) {
       // Show conflict dialog
       this.showConflictDialog(
           myContent,
           response.remote_page.markdown,
           response.remote_page
       );
   }
   ```

5. **User Chooses Resolution:**
   - **Cancel**: Don't save, keep editing
   - **Overwrite**: Force save my changes (ignore remote)
   - **Merge**: (Future) Open merge editor

6. **If Overwrite:**
   ```javascript
   PUT /api/bookstack/page/123
   Body: {
       markdown: "# My content...",
       conflict_resolution: "overwrite"  // Skip conflict check
   }
   ```

---

## HTML to Markdown Conversion

### Using html2text Library

```python
import html2text

def html_to_markdown(html_content):
    """Convert BookStack HTML to Markdown"""

    # Configure html2text
    h = html2text.HTML2Text()
    h.body_width = 0  # Don't wrap lines
    h.ignore_links = False
    h.ignore_images = False
    h.ignore_emphasis = False
    h.skip_internal_links = False
    h.inline_links = True  # Use inline link style
    h.protect_links = True
    h.unicode_snob = True  # Use unicode instead of ASCII

    # Convert
    markdown = h.handle(html_content)

    # Post-processing for BookStack-specific elements
    markdown = clean_bookstack_markdown(markdown)

    return markdown

def clean_bookstack_markdown(markdown):
    """Clean up BookStack-specific HTML artifacts"""

    # Remove BookStack-specific classes
    # Handle callouts/alerts
    # Handle code blocks
    # Handle tables
    # etc.

    return markdown
```

### Handling Special Elements

1. **Code Blocks:** Preserve syntax highlighting hints
2. **Tables:** Convert to Markdown tables
3. **Callouts/Alerts:** Convert to blockquotes or keep as HTML
4. **Images:** Convert to Markdown image syntax
5. **Links:** Use inline link syntax
6. **Headings:** Preserve heading levels

---

## Future Enhancements

### Phase 1 (Current Implementation)
- ✅ Authentication with Token ID/Secret
- ✅ Hierarchical browser (Shelves → Books → Chapters → Pages)
- ✅ Load pages (HTML→Markdown conversion)
- ✅ Create new pages
- ✅ Update existing pages
- ✅ Conflict detection and overwrite

### Phase 2 (Future)
- [ ] **Merge Editor:** Visual diff and merge for conflicts
- [ ] **Search:** Full-text search across BookStack
- [ ] **Tags:** View and edit page tags
- [ ] **Attachments:** Upload/download attachments
- [ ] **Page History:** View revision history
- [ ] **Templates:** Create pages from templates
- [ ] **Batch Operations:** Move/copy multiple pages
- [ ] **Permissions:** Show user's permissions per book
- [ ] **Offline Mode:** Cache pages for offline editing

### Phase 3 (Advanced)
- [ ] **Real-time Collaboration:** See other users' edits
- [ ] **Auto-save to BookStack:** Save every X seconds
- [ ] **Bi-directional Sync:** Keep local and BookStack in sync
- [ ] **Change Notifications:** Alert when pages are modified
- [ ] **Advanced Merge:** Three-way merge with common ancestor
- [ ] **Export from BookStack:** Export books/chapters as Markdown
- [ ] **Import to BookStack:** Bulk import Markdown files

---

## Comparison: GitHub vs BookStack Integration

| Feature | GitHub | BookStack |
|---------|--------|-----------|
| **Authentication** | OAuth 2.0 | Token-based (ID + Secret) |
| **Credential Storage** | Session (from OAuth) | Session (user-entered) |
| **Hierarchy** | Repos → Directories → Files | Shelves → Books → Chapters → Pages |
| **Content Format** | Markdown | Markdown or HTML (converted) |
| **Create New** | Yes (create file) | Yes (create page) |
| **Update Existing** | Yes (commit with SHA) | Yes (update by ID) |
| **Conflict Detection** | SHA-based | Timestamp-based |
| **Versioning** | Git commits | BookStack revisions |
| **Permissions** | GitHub roles | BookStack roles |

---

## User Setup Instructions

### For Administrators

1. **Configure BookStack URL:**
   ```bash
   # In .env
   BOOKSTACK_URL=https://bookstack.example.com
   ```

2. **Create API Tokens for Users:**
   - Go to BookStack admin panel
   - Navigate to Users
   - For each user:
     - Click "Edit"
     - Go to "API Tokens" tab
     - Click "Create Token"
     - Name: "Markdown Editor"
     - Expires: 365 days (optional)
     - Copy Token ID and Token Secret
     - Send to user securely (password manager, encrypted email, etc.)

3. **Set Permissions:**
   - Create role with appropriate permissions
   - Assign to users
   - Recommended permissions:
     - View books/chapters/pages
     - Create pages
     - Update own pages
     - (Optional) Update all pages

### For End Users

1. **Get Your API Token:**
   - Ask admin for Token ID and Token Secret
   - Or generate yourself:
     - Go to BookStack → Settings → Users → Your Profile
     - Navigate to "API Tokens"
     - Create new token

2. **Connect to BookStack:**
   - Open Markdown Editor
   - Click "BookStack" button (or Ctrl/Cmd+K)
   - Enter Token ID and Token Secret
   - Click "Connect"

3. **Browse and Load Pages:**
   - Navigate: Shelves → Books → Chapters → Pages
   - Click page to load into editor
   - Edit as needed

4. **Save Changes:**
   - Click Save button or Ctrl/Cmd+S
   - Choose "Save to BookStack"
   - Select book/chapter
   - Click "Save"

5. **Create New Pages:**
   - Write content in editor
   - Click Save → BookStack
   - Choose "Create New Page"
   - Select book/chapter
   - Enter page name
   - Click "Save"

6. **Disconnect:**
   - Click BookStack button
   - Click "Disconnect"
   - Credentials cleared from session

---

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| **Authentication Failed** | Invalid token | Check Token ID and Secret, regenerate if needed |
| **Connection Refused** | Wrong BookStack URL | Check BOOKSTACK_URL in .env |
| **Forbidden (403)** | Insufficient permissions | Check user role/permissions in BookStack |
| **Not Found (404)** | Page/book deleted | Refresh browser, page no longer exists |
| **Conflict Detected** | Page modified remotely | Choose overwrite or cancel |
| **Timeout** | Slow network/large page | Increase BOOKSTACK_API_TIMEOUT |
| **Session Expired** | 24 hour timeout | Re-authenticate with credentials |

### Frontend Error Display

```javascript
// Toast notifications for errors
try {
    const result = await APIClient.post('/api/bookstack/page', data);
    showToast('Page saved successfully!', 'success');
} catch (error) {
    if (error.status === 401) {
        showToast('Session expired. Please authenticate again.', 'error');
        BookStackUI.renderAuthForm();
    } else if (error.status === 403) {
        showToast('Permission denied. Check your BookStack permissions.', 'error');
    } else if (error.status === 409) {
        // Conflict - handled by conflict dialog
        BookStackUI.showConflictDialog(error.data);
    } else {
        showToast(`Error: ${error.message}`, 'error');
    }
}
```

---

## Testing Plan

### Manual Testing Checklist

**Authentication:**
- [ ] Enter valid credentials → Success
- [ ] Enter invalid credentials → Error message
- [ ] Session persists across page refresh
- [ ] Logout clears session
- [ ] Session expires after 24 hours

**Navigation:**
- [ ] List shelves shows all shelves
- [ ] Click shelf → Shows books in shelf
- [ ] List books shows all books
- [ ] Click book → Shows chapters and pages
- [ ] Breadcrumbs show current location
- [ ] Back button navigates up one level

**Load Page:**
- [ ] Click page → Loads into editor
- [ ] HTML page converts to Markdown
- [ ] Markdown page loads directly
- [ ] Page metadata stored for conflict detection
- [ ] Dialog closes after load

**Create Page:**
- [ ] Click Save → Show save dialog
- [ ] Select "Create New"
- [ ] Select book/chapter
- [ ] Enter page name
- [ ] Save → Page created in BookStack
- [ ] Success toast displayed

**Update Page:**
- [ ] Load existing page
- [ ] Edit content
- [ ] Save → Updates in BookStack
- [ ] No conflict → Success
- [ ] Success toast displayed

**Conflict Detection:**
- [ ] Load page in two browsers
- [ ] Edit and save in browser A
- [ ] Edit and save in browser B → Conflict detected
- [ ] Conflict dialog shows
- [ ] Choose "Overwrite" → Saves successfully
- [ ] Choose "Cancel" → Doesn't save

**Error Handling:**
- [ ] Invalid BookStack URL → Error message
- [ ] Network timeout → Error message
- [ ] Permission denied → Error message
- [ ] Page not found → Error message

### Automated Testing (Future)

```python
# Backend unit tests
def test_authenticate_valid_credentials():
    # Test successful authentication
    pass

def test_authenticate_invalid_credentials():
    # Test authentication failure
    pass

def test_list_shelves():
    # Test shelf listing
    pass

def test_create_page():
    # Test page creation
    pass

def test_update_page_no_conflict():
    # Test successful update
    pass

def test_update_page_with_conflict():
    # Test conflict detection
    pass

def test_html_to_markdown_conversion():
    # Test HTML conversion
    pass
```

---

## Deployment Checklist

### Pre-deployment

- [ ] Set `BOOKSTACK_URL` in production `.env`
- [ ] Generate strong `SECRET_KEY` for Flask sessions
- [ ] Set `SESSION_COOKIE_SECURE=True` (HTTPS only)
- [ ] Test BookStack URL is accessible from backend server
- [ ] Verify CORS settings if needed
- [ ] Create API tokens for all users
- [ ] Document user setup process

### Post-deployment

- [ ] Test authentication flow in production
- [ ] Test file browser navigation
- [ ] Test create/update operations
- [ ] Monitor backend logs for errors
- [ ] Check BookStack audit log for API calls
- [ ] Verify session expiry works correctly
- [ ] Test logout clears session

### Monitoring

- [ ] Monitor API response times
- [ ] Track authentication failures
- [ ] Monitor conflict resolution rate
- [ ] Check for timeout errors
- [ ] Review BookStack API usage

---

## Success Criteria

✅ **Functionality:**
- [ ] Users can authenticate with Token ID + Secret
- [ ] Users can browse Shelves → Books → Chapters → Pages
- [ ] Users can load pages into editor
- [ ] HTML pages convert to Markdown automatically
- [ ] Users can create new pages
- [ ] Users can update existing pages
- [ ] Conflict detection works correctly
- [ ] Users can disconnect/logout

✅ **Security:**
- [ ] Credentials stored in session only
- [ ] Session cookies are httpOnly and secure
- [ ] No credentials in frontend code
- [ ] Sessions expire after 24 hours
- [ ] Backend proxy prevents credential exposure

✅ **User Experience:**
- [ ] UI matches GitHub integration pattern
- [ ] Loading states show for async operations
- [ ] Error messages are clear and helpful
- [ ] Success feedback via toast notifications
- [ ] Save dialog is intuitive
- [ ] Conflict dialog is understandable

✅ **Code Quality:**
- [ ] Follows AI.md guidelines
- [ ] JavaScript files under 800 lines
- [ ] No inline CSS/JS
- [ ] Proper error handling
- [ ] Code comments where needed
- [ ] Consistent with existing codebase

---

## Conclusion

This implementation plan provides a complete blueprint for adding BookStack integration to the Markdown Viewer application. The design mirrors the existing GitHub integration while adapting to BookStack's API and authentication model.

**Key Features:**
- Backend proxy architecture for security
- Session-based credential storage
- Hierarchical navigation (Shelves → Books → Chapters → Pages)
- HTML→Markdown conversion
- Create and update operations
- Conflict detection with overwrite option
- Material Design 3 UI consistency

**Next Steps:**
1. Review this plan for approval
2. Begin implementation following the checklist
3. Test thoroughly before deployment
4. Document user setup process
5. Deploy to production

**Estimated Implementation Time:**
- Backend: 4-6 hours
- Frontend: 6-8 hours
- Testing: 2-3 hours
- Documentation: 1-2 hours
- **Total: 13-19 hours**

---

**Ready to implement!** Please review and approve this plan before proceeding with code implementation.
