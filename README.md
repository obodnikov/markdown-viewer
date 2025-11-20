# Markdown Viewer & Editor

A modern, feature-rich markdown editor with GitHub Flavored Markdown support, LLM-powered transformations, and GitHub integration.

## Features

### Core Functionality
- **GitHub Flavored Markdown** - Full GFM support with live preview
- **Split-pane Editor** - CodeMirror 6 with syntax highlighting
- **Multiple View Modes** - Split, edit-only, or preview-only
- **Auto-save** - Automatic local storage backup every 30 seconds

### LLM Transformations (via OpenRouter)
- **Translation** - Translate to 9+ languages while preserving markdown structure
- **Tone Adjustment** - Convert between formal and casual tones
- **Summarization** - Create concise summaries
- **Content Expansion** - Elaborate on existing content
- **Custom Prompts** - Apply any LLM transformation with custom instructions
- **Model Selection** - Choose from Claude, GPT-4, and other models

### Text Operations
- **Smart Newline Removal** - Three modes:
  - Smart: Preserves markdown structure
  - Paragraph-only: Joins only paragraph text
  - Aggressive: Removes all unnecessary newlines

### File Management
- **Local Files** - Open/save using modern File System Access API
- **GitHub Integration** - OAuth authentication to open/save files from repositories
- **Drag & Drop** - Drop markdown files to open
- **Multiple Export Formats**:
  - Markdown (.md)
  - HTML (.html)
  - PDF (.pdf)
  - Word (.docx)

### UI/UX
- **Material Design 3** - Modern, accessible interface
- **Dark Mode** - Toggle between light and dark themes
- **Responsive** - Works on desktop and mobile
- **Keyboard Shortcuts** - Ctrl/Cmd+S (save), Ctrl/Cmd+O (open), etc.

## Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd markdown-viewer
   ```

2. **Copy environment template**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` and add your API keys**
   ```bash
   # Required: OpenRouter API key
   OPENROUTER_API_KEY=sk-or-v1-your-key-here

   # Optional: GitHub OAuth (for GitHub integration)
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```

4. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Access the application**
   - Frontend: http://localhost:8000
   - Backend API: http://localhost:5000

### Manual Setup

#### Prerequisites
- Python 3.11+
- Node.js (optional, for development)
- pandoc (for PDF/DOCX export)

#### Backend Setup

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Verify installation (optional)**
   ```bash
   ./verify-install.sh
   ```

3. **Install dependencies**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Install pandoc**
   ```bash
   # macOS
   brew install pandoc

   # Ubuntu/Debian
   sudo apt-get install pandoc texlive-xetex

   # Windows
   # Download from: https://pandoc.org/installing.html
   ```

5. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

6. **Run backend**
   ```bash
   python backend/app.py
   ```

#### Frontend Setup

1. **Serve frontend files**
   ```bash
   # Using Python's built-in server
   cd public
   python -m http.server 8000
   ```

2. **Access the application**
   - Frontend: http://localhost:8000
   - Backend: http://localhost:5000

## Configuration

### OpenRouter API

1. Get your API key from [OpenRouter](https://openrouter.ai/settings/keys)
2. Add to `.env`:
   ```
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
   ```

### GitHub OAuth (Optional)

1. Register a new OAuth app at [GitHub Developer Settings](https://github.com/settings/developers)
   - Homepage URL: `http://localhost:8000`
   - Callback URL: `http://localhost:5000/api/github/callback`

2. Add credentials to `.env`:
   ```
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```

## API Endpoints

### LLM Transformations
- `POST /api/llm/transform` - Transform text (translate, tone change, etc.)
- `POST /api/llm/custom-prompt` - Apply custom LLM prompt
- `GET /api/llm/models` - List available models

### Export
- `POST /api/export/html` - Export to HTML
- `POST /api/export/pdf` - Export to PDF
- `POST /api/export/docx` - Export to Word

### GitHub
- `GET /api/github/auth` - Initiate OAuth flow
- `GET /api/github/user` - Get authenticated user
- `GET /api/github/repos` - List repositories
- `GET /api/github/files` - List files in repo
- `GET /api/github/file` - Get file content
- `POST /api/github/file` - Save file to repo

## Architecture

```
markdown-viewer/
├── backend/              # Flask API
│   ├── app.py           # Application entry point
│   ├── config.py        # Configuration
│   ├── routes/          # API endpoints
│   │   ├── llm.py      # LLM transformations
│   │   ├── github.py   # GitHub integration
│   │   └── export.py   # Export functionality
│   └── services/        # Business logic
│       ├── openrouter.py    # OpenRouter client
│       ├── github_service.py # GitHub API wrapper
│       └── export_service.py # Pandoc wrapper
├── public/              # Frontend HTML
├── styles/              # CSS (Material Design)
│   ├── base.css        # Design tokens
│   ├── layout.css      # Layout system
│   └── components/     # Component styles
├── scripts/             # JavaScript (ES modules)
│   ├── main.js         # Application bootstrap
│   ├── editor/         # CodeMirror integration
│   ├── markdown/       # Markdown parsing
│   ├── transforms/     # LLM transformations
│   ├── file/           # File operations
│   └── utils/          # Utilities
└── docker-compose.yml   # Docker configuration
```

## Technology Stack

### Frontend
- **HTML5/CSS3/JavaScript** - No build step required
- **marked.js** - GitHub Flavored Markdown parser
- **CodeMirror 6** - Modern code editor
- **Material Design 3** - Design system

### Backend
- **Flask** - Python web framework
- **OpenRouter** - LLM API gateway
- **PyGithub** - GitHub API client
- **pandoc** - Document conversion

## Development

### Running in Development Mode

1. **Backend with auto-reload**
   ```bash
   export FLASK_ENV=development
   export DEBUG=true
   python backend/app.py
   ```

2. **Frontend with live server**
   ```bash
   cd public
   python -m http.server 8000
   ```

### Code Guidelines

- Follow [AI.md](AI.md) for frontend coding standards
- Material Design 3 principles
- No inline CSS/JS
- ES modules for JavaScript
- Maximum 800 lines per JS file
- Semantic HTML5
- Accessibility first

## Keyboard Shortcuts

- `Ctrl/Cmd + S` - Save document
- `Ctrl/Cmd + O` - Open file
- `Ctrl/Cmd + N` - New document
- `Ctrl/Cmd + E` - Export dialog

## Troubleshooting

### "pandoc not found" error
Install pandoc: https://pandoc.org/installing.html

### GitHub OAuth not working
1. Check callback URL matches in GitHub app settings
2. Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`
3. Ensure backend is running on port 5000

### LLM transformations failing
1. Verify `OPENROUTER_API_KEY` is set correctly
2. Check OpenRouter account has credits
3. Check backend logs for detailed errors

### CORS errors
1. Ensure frontend is served from `localhost:8000`
2. Check `CORS_ORIGINS` in `.env` includes your frontend URL

## License

MIT License - see LICENSE file for details

## Contributing

1. Follow coding guidelines in [AI.md](AI.md)
2. Test all changes locally
3. Submit pull requests with clear descriptions

## Roadmap

### Phase 1 (Current)
- ✅ Core editor with GFM support
- ✅ LLM transformations
- ✅ GitHub integration
- ✅ Multiple export formats

### Phase 2 (Future)
- [ ] Real-time collaboration
- [ ] More cloud storage providers (Dropbox, Google Drive)
- [ ] Custom markdown extensions
- [ ] Plugin system
- [ ] Advanced search and replace
- [ ] Vim keybindings
- [ ] Templates library

## Support

For issues and feature requests, please use the GitHub issue tracker.
