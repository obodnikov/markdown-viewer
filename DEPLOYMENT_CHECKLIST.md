# Deployment Checklist

## Pre-Deployment Setup

### 1. Required Software Installation

- [ ] **Python 3.11+** installed
  ```bash
  python3 --version
  ```

- [ ] **pandoc** installed (for PDF/DOCX export)
  ```bash
  # macOS
  brew install pandoc

  # Ubuntu/Debian
  sudo apt-get update
  sudo apt-get install pandoc texlive-xetex

  # Verify
  pandoc --version
  ```

- [ ] **Docker & Docker Compose** (if using Docker)
  ```bash
  docker --version
  docker-compose --version
  ```

### 2. API Keys & Credentials

- [ ] **OpenRouter API Key** (REQUIRED)
  - Get from: https://openrouter.ai/settings/keys
  - Add credits to account
  - Test key validity

- [ ] **GitHub OAuth App** (OPTIONAL - for GitHub integration)
  - Register at: https://github.com/settings/developers
  - Create new OAuth App
  - Set Homepage URL: `http://localhost:8000` (or your domain)
  - Set Callback URL: `http://localhost:5000/api/github/callback`
  - Note Client ID and Client Secret

### 3. Environment Configuration

- [ ] Copy environment template
  ```bash
  cp .env.example .env
  ```

- [ ] Edit `.env` with your values:
  ```bash
  # Required
  OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here

  # Recommended
  SECRET_KEY=$(openssl rand -hex 32)

  # Optional (for GitHub)
  GITHUB_CLIENT_ID=your_github_client_id
  GITHUB_CLIENT_SECRET=your_github_client_secret

  # Production settings
  DEBUG=False
  CORS_ORIGINS=http://yourdomain.com
  ```

---

## Deployment Options

### Option A: Docker Deployment (Recommended)

#### Pre-flight Checks
- [ ] Docker daemon running
- [ ] `.env` file configured
- [ ] Port 8000 available
- [ ] Port 5000 available

#### Build and Run
```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

#### Verify Deployment
- [ ] Backend health check: http://localhost:5000/api/health
- [ ] Frontend loads: http://localhost:8000
- [ ] No errors in logs: `docker-compose logs`

### Option B: Manual Development

#### Pre-flight Checks
- [ ] Python virtual environment
- [ ] pandoc installed
- [ ] `.env` configured
- [ ] Ports 5000 and 8000 available

#### Setup Backend
```bash
# Create virtual environment
python3 -m venv venv

# Activate (macOS/Linux)
source venv/bin/activate
# Or Windows
# venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Verify installation
python -c "import flask, openrouter, github; print('✓ All imports successful')"
```

#### Run Services

**Option B1: Using Development Script**
```bash
chmod +x run-dev.sh
./run-dev.sh
```

**Option B2: Manual Start**

Terminal 1 - Backend:
```bash
source venv/bin/activate
export FLASK_APP=backend/app.py
export FLASK_ENV=development
export DEBUG=true
python backend/app.py
```

Terminal 2 - Frontend:
```bash
cd public
python3 -m http.server 8000
```

#### Verify Deployment
- [ ] Backend responds: `curl http://localhost:5000/api/health`
- [ ] Frontend loads: http://localhost:8000
- [ ] Console shows no errors

---

## Post-Deployment Testing

### 1. Backend API Tests

- [ ] **Health Check**
  ```bash
  curl http://localhost:5000/api/health
  # Expected: {"status":"healthy","service":"markdown-viewer-backend"}
  ```

- [ ] **LLM Models List**
  ```bash
  curl http://localhost:5000/api/llm/models
  # Expected: {"success":true,"models":[...]}
  ```

- [ ] **LLM Translation Test**
  ```bash
  curl -X POST http://localhost:5000/api/llm/transform \
    -H "Content-Type: application/json" \
    -d '{
      "operation": "translate",
      "content": "# Hello World",
      "params": {"target_language": "Spanish"}
    }'
  # Expected: {"success":true,"content":"# Hola Mundo",...}
  ```

### 2. Frontend Tests

- [ ] **Page Loads**
  - Open http://localhost:8000
  - No console errors
  - UI renders correctly

- [ ] **Editor Works**
  - Type markdown in left pane
  - Preview updates in right pane
  - Headers, lists, code blocks render correctly

- [ ] **View Modes**
  - Click "Split View" - both panes visible
  - Click "Edit Only" - only editor visible
  - Click "Preview Only" - only preview visible

- [ ] **Theme Toggle**
  - Click sun/moon icon in toolbar
  - Theme switches between light/dark
  - Colors update correctly

- [ ] **Sidebar Toggle**
  - Click hamburger menu
  - Transform panel hides/shows

### 3. Feature Tests

#### Newline Removal (Client-side)
- [ ] Paste multi-line paragraph
- [ ] Click "Remove Newlines"
- [ ] Select "Smart" mode
- [ ] Lines join preserving structure

#### Translation (LLM)
- [ ] Enter English markdown
- [ ] Select target language (e.g., Spanish)
- [ ] Click "Translate"
- [ ] Wait for transformation
- [ ] Markdown structure preserved
- [ ] Text translated

#### Custom LLM Prompt
- [ ] Enter markdown content
- [ ] Type custom prompt (e.g., "Make this more technical")
- [ ] Select model
- [ ] Click "Apply Prompt"
- [ ] Content transforms

#### File Operations
- [ ] **Local Open**
  - Click "Open"
  - Select .md file
  - Content loads in editor

- [ ] **Local Save**
  - Edit content
  - Click "Save"
  - File downloads/saves

#### Export
- [ ] Click "Export"
- [ ] Test Markdown export (.md)
- [ ] Test HTML export (.html)
- [ ] Test PDF export (.pdf) - requires pandoc
- [ ] Test DOCX export (.docx) - requires pandoc

#### GitHub Integration (if configured)
- [ ] Click "GitHub"
- [ ] Click "Connect GitHub Account"
- [ ] OAuth flow completes
- [ ] Repositories list loads
- [ ] Can open repository files
- [ ] Can save back to GitHub

---

## Troubleshooting

### Common Issues

#### 1. "ModuleNotFoundError: No module named 'openrouter'"
```bash
# Activate venv first
source venv/bin/activate
pip install -r backend/requirements.txt
```

#### 2. "pandoc: command not found"
```bash
# macOS
brew install pandoc

# Ubuntu
sudo apt-get install pandoc

# Verify
which pandoc
```

#### 3. "OPENROUTER_API_KEY is required"
- Check `.env` file exists
- Verify `OPENROUTER_API_KEY=sk-or-v1-...` is set
- No spaces around `=`
- Key starts with `sk-or-v1-`

#### 4. CORS Errors in Browser Console
- Check backend is running on port 5000
- Check frontend is on port 8000
- Verify `CORS_ORIGINS` in `.env` includes `http://localhost:8000`

#### 5. "Failed to fetch" on transformations
- Backend running? `curl http://localhost:5000/api/health`
- API key valid? Check OpenRouter dashboard
- Credits available? Check OpenRouter balance

#### 6. GitHub OAuth "Redirect URI mismatch"
- GitHub app callback URL must be: `http://localhost:5000/api/github/callback`
- Exact match required (http vs https, port, path)

#### 7. Export fails (PDF/DOCX)
- pandoc installed? `pandoc --version`
- For PDF: LaTeX installed? `sudo apt-get install texlive-xetex`

### Log Locations

**Docker:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

**Manual:**
- Backend: Terminal output
- Frontend: Browser console (F12)
- Python errors: Check terminal running Flask

---

## Production Deployment Considerations

### Security
- [ ] Change `SECRET_KEY` from default
- [ ] Set `DEBUG=False`
- [ ] Use HTTPS (nginx with SSL)
- [ ] Restrict CORS origins to your domain
- [ ] Don't commit `.env` to git
- [ ] Use environment variables in CI/CD

### Performance
- [ ] Use `gunicorn` instead of Flask dev server
  ```bash
  gunicorn -w 4 -b 0.0.0.0:5000 backend.app:create_app()
  ```
- [ ] Enable nginx gzip compression
- [ ] Add CDN for static assets
- [ ] Implement rate limiting

### Monitoring
- [ ] Set up logging (e.g., Sentry)
- [ ] Monitor API usage (OpenRouter dashboard)
- [ ] Track error rates
- [ ] Set up uptime monitoring

### Backup
- [ ] User data stored client-side only (LocalStorage)
- [ ] GitHub files managed by GitHub
- [ ] No database to backup

---

## Quick Reference Commands

### Docker
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Rebuild
docker-compose build

# Logs
docker-compose logs -f

# Restart single service
docker-compose restart backend
```

### Development
```bash
# Activate venv
source venv/bin/activate

# Install deps
pip install -r backend/requirements.txt

# Run backend
python backend/app.py

# Run frontend (separate terminal)
cd public && python3 -m http.server 8000

# Or use script
./run-dev.sh
```

### Testing
```bash
# Health check
curl http://localhost:5000/api/health

# Test translation
curl -X POST http://localhost:5000/api/llm/transform \
  -H "Content-Type: application/json" \
  -d '{"operation":"translate","content":"# Test","params":{"target_language":"French"}}'
```

---

## Support Checklist

Before asking for help, verify:

- [ ] Followed all setup steps
- [ ] `.env` file configured with valid keys
- [ ] Both backend and frontend running
- [ ] Checked logs for errors
- [ ] Tested with `curl` commands above
- [ ] Tried in different browser
- [ ] Cleared browser cache
- [ ] pandoc installed (for export features)

---

## Success Indicators

✅ All checks passed when:
- Backend responds to health check
- Frontend loads without console errors
- Can type and see live preview
- Can perform LLM transformation
- Can export to at least one format
- Theme toggle works
- File open/save works

**You're ready to use the Markdown Viewer!** 🎉
