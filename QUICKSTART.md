# Quick Start Guide

## 🚀 5-Minute Setup

### Prerequisites Checklist
- [ ] Python 3.9+ installed
- [ ] OpenRouter API key (get from [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys))
- [ ] pandoc installed (optional, for PDF/DOCX export)

---

## Step 1: Configuration

```bash
# Clone/navigate to project
cd markdown-viewer

# Copy environment template
cp .env.example .env

# Edit .env and add your OpenRouter API key
# OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
```

---

## Step 2: Choose Your Setup Method

### Option A: Docker (Easiest) ⭐

```bash
# Start everything
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Access app at http://localhost:8000
```

**Stop:** `docker-compose down`

---

### Option B: Development Script

```bash
# Run the automated dev script
./run-dev.sh

# Access app at http://localhost:8000
```

**Stop:** Press `Ctrl+C`

---

### Option C: Manual Setup

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install Python packages
pip install -r backend/requirements.txt

# 3. Install pandoc (optional)
brew install pandoc  # macOS
# OR: sudo apt-get install pandoc  # Linux

# 4. Start backend (Terminal 1)
python3 start.py
# OR: python3 backend/app.py

# 5. Start frontend (Terminal 2)
cd public
python3 -m http.server 8000

# Access app at http://localhost:8000
```

**Note:** Use `start.py` for better error messages and path handling.

---

## Step 3: Verify Installation

### Quick Test
```bash
# Health check
curl http://localhost:5000/api/health

# Expected: {"status":"healthy","service":"markdown-viewer-backend"}
```

### Full Verification
```bash
./verify-install.sh
```

---

## Step 4: First Use

1. **Open browser:** http://localhost:8000
2. **Type markdown** in the left pane
3. **See live preview** in the right pane
4. **Try transformations:**
   - Click sidebar hamburger menu
   - Select "Translate"
   - Choose target language
   - Click "Translate" button

---

## Common Issues

### "No matching distribution found for openrouter"
**Fixed!** Updated to `openrouter>=0.0.19` (official package)

```bash
# Re-install dependencies
pip install -r backend/requirements.txt
```

### "OPENROUTER_API_KEY is required"
```bash
# Check .env file exists
ls -la .env

# Verify key is set (no spaces around =)
grep OPENROUTER_API_KEY .env

# Should output: OPENROUTER_API_KEY=sk-or-v1-...
```

### "pandoc not found"
```bash
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install pandoc texlive-xetex

# Verify
pandoc --version
```

### CORS errors in browser
- Backend must run on port **5000**
- Frontend must run on port **8000**
- Check both are running

### Port already in use
```bash
# Find process using port 5000
lsof -ti:5000 | xargs kill -9

# Find process using port 8000
lsof -ti:8000 | xargs kill -9
```

---

## URLs Reference

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:8000 | Main app interface |
| **Backend API** | http://localhost:5000 | REST API |
| **Health Check** | http://localhost:5000/api/health | Status endpoint |

---

## Environment Variables

### Required
```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### Optional
```bash
# GitHub OAuth (for GitHub integration)
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Security
SECRET_KEY=$(openssl rand -hex 32)
DEBUG=False  # Set to True for development

# CORS (add your domain if deploying)
CORS_ORIGINS=http://localhost:8000
```

---

## Feature Quick Reference

### Keyboard Shortcuts
- `Ctrl/Cmd + S` - Save file
- `Ctrl/Cmd + O` - Open file
- `Ctrl/Cmd + N` - New document
- `Ctrl/Cmd + E` - Export dialog

### Transform Operations
1. **Translation** - Translate to 9 languages
2. **Remove Newlines** - Smart/paragraph/aggressive modes
3. **Tone Change** - Formal or casual
4. **Summarize** - Create concise summary
5. **Expand** - Elaborate on content
6. **Custom Prompt** - Any LLM instruction

### Export Formats
- Markdown (`.md`) - Direct download
- HTML (`.html`) - Rendered page
- PDF (`.pdf`) - Requires pandoc
- Word (`.docx`) - Requires pandoc

---

## Next Steps

1. **Read full docs:** [README.md](README.md)
2. **Check deployment guide:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
3. **View technical details:** [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

---

## Getting Help

### Before asking for help:
- [ ] Ran `./verify-install.sh`
- [ ] Checked `.env` file has valid API key
- [ ] Both frontend (8000) and backend (5000) are running
- [ ] Checked browser console for errors (F12)
- [ ] Tested with `curl http://localhost:5000/api/health`

### Logs Location
- **Docker:** `docker-compose logs -f`
- **Manual:** Terminal output + Browser console (F12)

---

## Success! ✅

You should now see:
- ✅ Backend responding to health checks
- ✅ Frontend loading at http://localhost:8000
- ✅ Live markdown preview working
- ✅ Can perform LLM transformations
- ✅ No errors in browser console

**Happy markdown editing!** 🎉
