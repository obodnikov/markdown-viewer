# Port Configuration Feature

## ✅ Feature Added: Configurable Backend Port

You can now configure the backend server port in multiple ways!

---

## 🚀 Quick Usage

### Command-Line (Recommended)

```bash
# Default port (5000)
python3 start.py

# Custom port
python3 start.py --port 3000

# Custom host and port
python3 start.py --host 127.0.0.1 --port 8080

# Enable debug mode
python3 start.py --debug

# All options combined
python3 start.py --host 0.0.0.0 --port 3000 --debug
```

### Environment Variables

In your `.env` file:
```bash
BACKEND_HOST=0.0.0.0
BACKEND_PORT=5000
```

Or as shell variables:
```bash
BACKEND_PORT=3000 python3 start.py
```

### URL Parameter (Frontend)

Access with custom backend:
```
http://localhost:8000?api_url=http://localhost:3000/api
```

### Browser Console (Frontend)

Change backend URL dynamically:
```javascript
// In browser console
APIClient.setBackendURL('http://localhost:3000/api')

// View current backend URL
APIClient.getBackendURL()

// Reset to default
APIClient.resetBackendURL()
```

---

## 📋 Configuration Priority

When multiple methods are used:

```
1. Command-Line Arguments (highest)
2. Environment Variables
3. Default Values (lowest)
```

**Example:**
```bash
# .env has: BACKEND_PORT=3000
python3 start.py --port 8080
# Result: Port 8080 (CLI overrides .env)
```

---

## 📝 Files Modified

### Backend Changes

1. **`backend/config.py`**
   - Added `BACKEND_HOST` config
   - Added `BACKEND_PORT` config

2. **`backend/app.py`**
   - Added command-line argument parsing
   - Added `--host`, `--port`, `--debug` flags
   - Enhanced startup messages

3. **`start.py`**
   - Added full CLI argument support
   - Added help documentation
   - Enhanced error messages

### Frontend Changes

4. **`scripts/utils/api.js`**
   - Auto-detects backend URL from localStorage
   - Supports URL parameter: `?api_url=...`
   - Added `setBackendURL()` method
   - Added `getBackendURL()` method
   - Added `resetBackendURL()` method

### Configuration

5. **`.env.example`**
   - Added `BACKEND_HOST` variable
   - Added `BACKEND_PORT` variable
   - Updated documentation

---

## 💡 Usage Scenarios

### Scenario 1: Development on Default Port

```bash
# Start backend
python3 start.py

# Start frontend
cd public && python3 -m http.server 8000

# Access: http://localhost:8000
```

### Scenario 2: Custom Backend Port

```bash
# Start backend on port 3000
python3 start.py --port 3000

# Update frontend (option 1: URL parameter)
# Access: http://localhost:8000?api_url=http://localhost:3000/api

# Update frontend (option 2: browser console)
# Open console and run:
APIClient.setBackendURL('http://localhost:3000/api')
```

### Scenario 3: Multiple Instances

Run multiple backend instances on different ports:

```bash
# Terminal 1: Instance A
python3 start.py --port 5001

# Terminal 2: Instance B
python3 start.py --port 5002

# Terminal 3: Instance C
python3 start.py --port 5003
```

### Scenario 4: Docker with Custom Port

Edit `docker-compose.yml`:
```yaml
services:
  markdown-viewer:
    ports:
      - "3000:5000"  # Map host:3000 to container:5000
    environment:
      - BACKEND_PORT=5000
```

---

## 🔧 Frontend API Configuration

### Method 1: URL Parameter (Temporary)

```
http://localhost:8000?api_url=http://localhost:3000/api
```

### Method 2: localStorage (Persistent)

```javascript
// Open browser console (F12)
APIClient.setBackendURL('http://localhost:3000/api')
// Page reloads with new backend URL
```

### Method 3: Edit Source (Permanent)

Edit `scripts/utils/api.js`:
```javascript
// Change default URL
return 'http://localhost:3000/api';
```

---

## 🧪 Testing

### Test Backend Port Change

```bash
# Start on custom port
python3 start.py --port 3000

# Test health endpoint
curl http://localhost:3000/api/health

# Expected response:
# {"status":"healthy","service":"markdown-viewer-backend"}
```

### Test Frontend Connection

```bash
# With backend on port 3000
# Open: http://localhost:8000?api_url=http://localhost:3000/api

# Open browser console (F12)
# Type: APIClient.getBackendURL()
# Should show: http://localhost:3000/api
```

---

## 📚 Help & Documentation

### View CLI Help

```bash
python3 start.py --help
```

Output:
```
usage: start.py [-h] [--host HOST] [--port PORT] [--debug]

Markdown Viewer Backend Server

optional arguments:
  -h, --help   show this help message and exit
  --host HOST  Host to bind to (default: from BACKEND_HOST or 0.0.0.0)
  --port PORT  Port to bind to (default: from BACKEND_PORT or 5000)
  --debug      Enable debug mode

Examples:
  python3 start.py                    # Start on default port (5000)
  python3 start.py --port 3000        # Start on port 3000
  python3 start.py --debug            # Start in debug mode
  python3 start.py --host 127.0.0.1   # Bind to localhost only
```

### Full Configuration Guide

See [CONFIGURATION.md](CONFIGURATION.md) for complete details on:
- All configuration methods
- CORS setup for custom ports
- GitHub OAuth with custom ports
- Docker configuration
- Troubleshooting

---

## ⚠️ Important Notes

### CORS Configuration

When changing backend port, update CORS in `.env`:

```bash
# Backend on port 3000:
CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
```

### GitHub OAuth Redirect

When changing backend port, update:

**In `.env`:**
```bash
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback
```

**On GitHub:**
Update OAuth app callback URL to match

### Port Conflicts

If port is already in use:

```bash
# Check what's using port 5000
lsof -ti:5000

# Kill the process
lsof -ti:5000 | xargs kill -9

# Or use different port
python3 start.py --port 5001
```

---

## 🎯 Examples Gallery

### Example 1: Localhost Only (Security)

```bash
# Backend accessible only from local machine
python3 start.py --host 127.0.0.1 --port 5000
```

### Example 2: Network Access

```bash
# Backend accessible from network
python3 start.py --host 0.0.0.0 --port 5000
```

### Example 3: Debug Mode

```bash
# Enable auto-reload and detailed errors
python3 start.py --debug
```

### Example 4: Production-like

```bash
# In .env:
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8080
DEBUG=False

# Start:
python3 start.py
```

### Example 5: Testing Multiple Versions

```bash
# Terminal 1: Main version on 5000
python3 start.py

# Terminal 2: Test version on 5001
python3 start.py --port 5001 --debug

# Terminal 3: Dev version on 5002
python3 start.py --port 5002 --debug
```

---

## 🔍 Troubleshooting

### Issue: "Port already in use"

**Solution:**
```bash
# Find and kill process
lsof -ti:5000 | xargs kill -9

# Or use different port
python3 start.py --port 5001
```

### Issue: Frontend can't connect to backend

**Check:**
1. Backend is running: `curl http://localhost:5000/api/health`
2. Port matches in frontend URL
3. CORS origins include frontend URL
4. No firewall blocking the port

**Solution:**
```javascript
// In browser console
APIClient.setBackendURL('http://localhost:CORRECT_PORT/api')
```

### Issue: GitHub OAuth fails after port change

**Solution:**
1. Update `GITHUB_REDIRECT_URI` in `.env`
2. Update GitHub OAuth app settings
3. Restart backend
4. Clear browser cookies

---

## 📖 Additional Resources

- **[CONFIGURATION.md](CONFIGURATION.md)** - Complete configuration guide
- **[README.md](README.md)** - Full project documentation
- **[QUICKSTART.md](QUICKSTART.md)** - Quick setup guide
- **[.env.example](.env.example)** - Environment template

---

## ✅ Feature Summary

**What's New:**
- ✅ Configure backend port via CLI arguments
- ✅ Configure backend port via environment variables
- ✅ Frontend auto-detects backend URL
- ✅ Support for URL parameters
- ✅ Browser console methods for dynamic configuration
- ✅ Enhanced startup messages with configuration details
- ✅ Help documentation built-in

**Backwards Compatible:**
- ✅ Default behavior unchanged (port 5000)
- ✅ Existing `.env` files work without modification
- ✅ Docker setup unchanged

**No Breaking Changes!** 🎉
