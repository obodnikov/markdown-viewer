# Claude Chat Export
**Generated: 2025-12-21 10:14:10**

---

👤 **USER:**
> Explore the backend structure of this markdown viewer application. I need to understand:
1. The Flask application structure (routes, services, models)
2. What backend functionality exists that needs testing
3. The main features and endpoints
4. Any existing configuration files (requirements.txt, package.json, etc.)

Focus on the app directory and backend Python files.

I'll explore the backend structure of the markdown viewer application systematically. Let me start by understanding the overall directory structure and then dive into the key backend components.

Now let me focus on the backend application files:

Let me check for requirements and other config files:

Now let me read the requirements and explore the route files and services:

Now let me check the bookstack routes and services:

Now let me check the remaining services:

Now let me check the start script to understand how the application is initialized:

Perfect! Now let me create a comprehensive summary of the backend structure. Let me check the AI.md file for coding standards as well:

Perfect! Now I have a comprehensive understanding of the backend structure. Let me create a detailed report:

## Backend Structure Analysis - Markdown Viewer Application

### 1. Flask Application Architecture

**Main Entry Point:** `/Users/mike/src/markdown-viewer/backend/app.py`

The Flask application is structured with:
- **Blueprint-based modular routing** - Four separate route modules registered
- **CORS enabled** - Configured with multiple origin support
- **Comprehensive logging** - Both console and file-based logging with configurable levels
- **Error handlers** - Standard 404 and 500 error responses in JSON format
- **Health check endpoint** - `/api/health` for monitoring

**Application Factory:** The `create_app(config_class=Config)` function:
- Initializes Flask instance
- Sets up logging system
- Registers CORS with origins from config
- Registers all four blueprints
- Returns configured app ready for use

---

### 2. Configuration System

**File:** `/Users/mike/src/markdown-viewer/backend/config.py`

The configuration manages:
- **Flask settings** - SECRET_KEY, DEBUG, HOST (0.0.0.0), PORT (5000)
- **OpenRouter API** - API key, default model, max tokens, available models list
- **Translation languages** - 15 configurable languages (Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi, Dutch, Swedish, Turkish, Polish)
- **GitHub OAuth** - Client ID, secret, redirect URI
- **BookStack integration** - URL, API timeout configuration
- **CORS configuration** - Allowed origins (default: http://localhost:8000, http://127.0.0.1:8000)
- **File uploads** - Max content length (16MB)
- **Pandoc** - Path configuration for export functionality
- **Logging** - Level (DEBUG, INFO, WARNING, ERROR, CRITICAL) and format (simple or detailed)

**Validation:** `Config.validate()` ensures OPENROUTER_API_KEY is set before app starts

---

### 3. Routes & Endpoints

#### **LLM Routes** (`/api/llm/`) - `/Users/mike/src/markdown-viewer/backend/routes/llm.py`

| Endpoint | Method | Purpose | Key Parameters |
|----------|--------|---------|-----------------|
| `/transform` | POST | Transform markdown with operations | operation, content, params, model |
| `/custom-prompt` | POST | Apply custom user prompts | prompt, content, preserve_markdown |
| `/models` | GET | List available LLM models | None |
| `/languages` | GET | List translation languages | None |
| `/generate-regex` | POST | Generate regex from descriptions | description, mode |

**Supported Operations:** translate, remove_newlines, change_tone, summarize, expand

#### **GitHub Routes** (`/api/github/`) - `/Users/mike/src/markdown-viewer/backend/routes/github.py`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth` | GET | Initiate OAuth flow |
| `/callback` | GET | Handle OAuth callback |
| `/user` | GET | Get authenticated user info |
| `/repos` | GET | List user repositories |
| `/files` | GET | List markdown files in repo |
| `/file` | GET | Get file content |
| `/file` | POST | Save/update file |
| `/logout` | POST | Clear GitHub session |

**Authentication:** Session-based using GitHub OAuth tokens

#### **Export Routes** (`/api/export/`) - `/Users/mike/src/markdown-viewer/backend/routes/export.py`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/html` | POST | Export markdown to HTML |
| `/pdf` | POST | Export markdown to PDF |
| `/docx` | POST | Export markdown to DOCX |

**Technologies:** Uses Pandoc for format conversion with Unicode support

#### **BookStack Routes** (`/api/bookstack/`) - `/Users/mike/src/markdown-viewer/backend/routes/bookstack.py`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/authenticate` | POST | Authenticate with API tokens |
| `/status` | GET | Check authentication status |
| `/logout` | POST | Clear BookStack session |
| `/shelves` | GET | List all shelves |
| `/shelves/<id>` | GET | Get shelf with books |
| `/books` | GET | List all books |
| `/books/<id>` | GET | Get book with chapters/pages |
| `/pages/<id>` | GET | Get page content (with HTML-to-Markdown) |
| `/pages` | POST | Create new page |
| `/pages/<id>` | PUT | Update existing page (with conflict detection) |
| `/pages/<id>` | DELETE | Delete page |
| `/search` | GET | Search pages |

**Features:** Conflict detection, HTML-to-Markdown conversion, pagination, sorting

---

### 4. Services Layer

#### **OpenRouter Service** (`/Users/mike/src/markdown-viewer/backend/services/openrouter.py`)

**Class:** `OpenRouterService`

**Methods:**
- `transform_text()` - Apply predefined transformations
- `custom_prompt()` - Apply custom user prompts with optional Markdown preservation
- `_build_prompt()` - Build operation-specific prompts
- `list_available_models()` - Get configured models
- `generate_regex_pattern()` - Generate regex from natural language

**Features:**
- Temperature control (0.3 for focused output)
- Token limit enforcement
- Markdown structure preservation
- JSON response parsing for regex generation

#### **GitHub Service** (`/Users/mike/src/markdown-viewer/backend/services/github_service.py`)

**Class:** `GitHubService`

**Methods:**
- `get_user_info()` - Fetch authenticated user details
- `list_repositories()` - Get user repos with sorting
- `list_markdown_files()` - Browse repo files (supports .md, .markdown, .txt)
- `get_file_content()` - Decode and return file content
- `save_file()` - Create or update files with commits

**Dependencies:** PyGithub library

#### **BookStack Service** (`/Users/mike/src/markdown-viewer/backend/services/bookstack_service.py`)

**Class:** `BookStackService`

**Methods:**
- `authenticate()` - Validate API credentials
- `list_shelves()` - Pagination and sorting support
- `get_shelf()` - Shelf details with books
- `list_books()` - Optional shelf filtering
- `get_book()` - Book with chapters/pages
- `get_page()` - Page content with HTML-to-Markdown conversion
- `create_page()` - Create with optional chapters and tags
- `update_page()` - Update with conflict detection
- `delete_page()` - Remove page
- `html_to_markdown()` - Convert HTML content using html2text
- `search_pages()` - Full-text search

**Features:**
- Token authentication (token_id:token_secret)
- Timeout handling with detailed logging
- HTML-to-Markdown conversion with fallback
- Comprehensive error handling

#### **Export Service** (`/Users/mike/src/markdown-viewer/backend/services/export_service.py`)

**Class:** `ExportService`

**Methods:**
- `to_html()` - HTML export with options (standalone, CSS, TOC)
- `to_pdf()` - PDF with XeLaTeX engine for Unicode, paper size, margins
- `to_docx()` - DOCX with native Unicode support
- `markdown_to_markdown()` - Markdown normalization

**Pandoc Integration:**
- GitHub Flavored Markdown (GFM) input
- XeLaTeX PDF engine for Unicode support
- Configurable options per format

---

### 5. Dependencies

**File:** `/Users/mike/src/markdown-viewer/backend/requirements.txt`

```
Flask==3.0.0
flask-cors==4.0.0
openrouter>=0.0.19
PyGithub==2.1.1
python-dotenv==1.0.0
pypandoc==1.12
requests==2.31.0
html2text==2024.2.26
gunicorn==21.2.0
```

---

### 6. Configuration Files

**Environment Configuration:** `.env.example`
- Flask settings
- OpenRouter API configuration
- GitHub OAuth setup (optional)
- BookStack integration (optional)
- CORS and Pandoc settings
- Logging levels

---

### 7. Key Backend Features Summary

| Feature | Technology | Status |
|---------|-----------|--------|
| **LLM Integration** | OpenRouter API | Full |
| **Text Transformation** | LLM prompts + OpenRouter | Full (translate, tone, summarize, expand) |
| **Regex Generation** | LLM + JSON parsing | Full |
| **GitHub Integration** | PyGithub + OAuth | Full |
| **BookStack Integration** | Direct API | Full (CRUD + search) |
| **Document Export** | Pandoc | Full (HTML, PDF, DOCX) |
| **HTML-to-Markdown** | html2text library | Full |
| **Authentication** | Session-based | Session cookies |
| **Conflict Detection** | Timestamp comparison | BookStack pages |
| **Logging** | Standard library | Rotating file + console |
| **Error Handling** | Blueprint error handlers | Basic JSON responses |

---

### 8. What Needs Testing

**Critical Testing Areas:**

1. **LLM Routes:**
   - Text transformation accuracy
   - Model switching
   - Token limit handling
   - Error handling for API failures

2. **GitHub Routes:**
   - OAuth flow and session management
   - File listing and retrieval
   - File save/update operations
   - Large file handling
   - Repository permissions

3. **BookStack Routes:**
   - Authentication with invalid credentials
   - Conflict detection and resolution
   - HTML-to-Markdown conversion
   - Large document handling
   - Search functionality
   - Pagination

4. **Export Routes:**
   - PDF generation with Unicode characters
   - DOCX export
   - HTML export with options
   - Missing pandoc handling

5. **Configuration:**
   - Environment variable loading
   - CORS origin validation
   - Missing required API keys
   - Port/host binding

6. **Error Handling:**
   - API timeouts
   - Invalid JSON payloads
   - Missing required fields
   - External service failures

---

### Architecture Summary

The backend follows a clean **service-oriented architecture** with:
- Separation of concerns (routes → services)
- Modular blueprint-based routing
- Centralized configuration management
- Comprehensive logging
- Session-based authentication
- Third-party API integration abstraction

All external API interactions are wrapped in service classes, making them testable and maintainable.

