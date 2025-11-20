# Frontend Server Fix

## Issue
When running `python3 -m http.server 8000` from the `public` directory, CSS and JavaScript files return 404 errors because they're located in sibling directories (`styles/`, `scripts/`).

## Solution
Use one of these methods to serve the frontend correctly:

---

## ✅ Method 1: Use Custom Frontend Server (Recommended)

```bash
# From project root
python3 serve-frontend.py --port 8000
```

**Features:**
- Serves from project root (all files accessible)
- Auto-redirects `/` to `/public/index.html`
- CORS headers included
- Configurable port: `--port 8080`
- Configurable host: `--host 127.0.0.1`

---

## ✅ Method 2: HTTP Server from Project Root

```bash
# From project root (NOT from public/)
python3 -m http.server 8000

# Then access:
# http://localhost:8000/public/index.html
```

**Note:** Must access via `/public/index.html`, not just `/`

---

## ✅ Method 3: Use Automated Script

```bash
./run-dev.sh
```

This script:
- Starts backend on port 5000
- Starts frontend on port 8000
- Handles cleanup on Ctrl+C

---

## Directory Structure

Your file structure should look like this:

```
markdown-viewer/
├── public/
│   └── index.html          ← HTML file
├── styles/
│   ├── base.css            ← CSS files
│   └── components/
├── scripts/
│   ├── main.js             ← JavaScript files
│   └── utils/
├── serve-frontend.py       ← Custom server
└── run-dev.sh             ← Automated script
```

When serving from **project root**, paths work correctly:
- `/public/index.html` ✅
- `/styles/base.css` ✅
- `/scripts/main.js` ✅

When serving from **public/**, paths break:
- `/index.html` ✅
- `/styles/base.css` ❌ (not in public/)
- `/scripts/main.js` ❌ (not in public/)

---

## Quick Fix for Current Session

If you're already running the server from `public/`:

1. **Stop the current server** (Ctrl+C)
2. **Go to project root**:
   ```bash
   cd ..  # Go up one directory to project root
   ```
3. **Start frontend server**:
   ```bash
   python3 serve-frontend.py
   ```
4. **Access**: http://localhost:8000

---

## Updated Commands

### Start Frontend Only

**Option A - Custom Server (Best):**
```bash
python3 serve-frontend.py
# Access: http://localhost:8000
```

**Option B - Python HTTP Server:**
```bash
python3 -m http.server 8000
# Access: http://localhost:8000/public/index.html
```

### Start Both Backend and Frontend

**Option A - Automated Script:**
```bash
./run-dev.sh
# Frontend: http://localhost:8000
# Backend: http://localhost:5000
```

**Option B - Manual (2 terminals):**

Terminal 1 - Backend:
```bash
python3 start.py
```

Terminal 2 - Frontend:
```bash
python3 serve-frontend.py
```

---

## Verification

After starting the frontend server, check these URLs:

```bash
# Should all return 200 OK
curl http://localhost:8000/public/index.html
curl http://localhost:8000/styles/base.css
curl http://localhost:8000/scripts/main.js
```

Open browser console (F12) and check for:
- ✅ No 404 errors
- ✅ CSS loaded (page is styled)
- ✅ JavaScript loaded (no errors in console)

---

## serve-frontend.py Features

The custom frontend server (`serve-frontend.py`) provides:

1. **Serves from project root** - All assets accessible
2. **Root redirect** - `/` → `/public/index.html`
3. **CORS headers** - Allows API calls
4. **Configurable**:
   ```bash
   python3 serve-frontend.py --port 8080 --host 127.0.0.1
   ```
5. **Clean shutdown** - Ctrl+C gracefully stops server

**View help:**
```bash
python3 serve-frontend.py --help
```

---

## Updated Documentation

The following files have been updated:
- ✅ `serve-frontend.py` - New custom frontend server
- ✅ `run-dev.sh` - Uses custom server
- ✅ This fix document

---

## Common Mistakes

### ❌ Wrong: Starting from public/
```bash
cd public
python3 -m http.server 8000
# Result: 404 errors for CSS/JS
```

### ✅ Right: Starting from project root
```bash
# From project root
python3 serve-frontend.py
# Result: All files load correctly
```

---

## Quick Reference

| Command | Directory | URL | Status |
|---------|-----------|-----|--------|
| `python3 serve-frontend.py` | project root | `http://localhost:8000` | ✅ Best |
| `python3 -m http.server 8000` | project root | `http://localhost:8000/public/` | ✅ Works |
| `./run-dev.sh` | project root | `http://localhost:8000` | ✅ Automated |
| `python3 -m http.server 8000` | public/ | `http://localhost:8000` | ❌ Broken |

---

## Summary

**Problem:** CSS/JS files not loading (404 errors)

**Cause:** Server running from wrong directory

**Solution:** Use `serve-frontend.py` or serve from project root

**Quick Fix:**
```bash
# Stop current server (Ctrl+C)
# From project root:
python3 serve-frontend.py
```

**Permanent Fix:** Always use `./run-dev.sh` or `serve-frontend.py`
