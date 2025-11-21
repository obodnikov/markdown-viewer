# Fixes: Port Configuration and CORS Issues

## Problems Identified

1. ❌ **Frontend hardcoded backend port** to 5000
2. ❌ **CORS preflight requests** not properly configured
3. ❌ **Backend running on port 5050** but frontend connecting to 5000

## Solutions Applied

### 1. Updated Frontend Configuration to Use Relative URLs

**File:** [scripts/config.js](scripts/config.js)

```javascript
export const config = {
    BACKEND_URL: '/api',  // Relative URL for reverse proxy compatibility
};
```

**Why:**
- Works in all environments (local dev, Docker, reverse proxy)
- No CORS issues (same origin)
- HTTPS handled automatically
- No configuration changes needed when deploying behind proxy

---

### 2. Updated API Client to Use Config

**File:** [scripts/utils/api.js](scripts/utils/api.js)

**Changed:**
```javascript
// OLD - Hardcoded
return 'http://localhost:5000/api';

// NEW - From config file
import { config } from '../config.js';
return config.BACKEND_URL;
```

**Priority order:**
1. localStorage (manual override)
2. URL parameter `?api_url=...`
3. Config file (default)

---

### 3. Enhanced CORS Configuration

**File:** [backend/app.py](backend/app.py:35-40)

**Changed:**
```python
# OLD - Basic CORS
CORS(app, origins=config_class.CORS_ORIGINS, supports_credentials=True)

# NEW - Full preflight support
CORS(app,
     origins=config_class.CORS_ORIGINS,
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
```

**Why:** Proper CORS configuration requires explicit headers and methods for preflight requests.

---

## How to Fix Your Current Setup

### Step 1: Frontend Config Now Uses Relative URLs

The [scripts/config.js](scripts/config.js) now uses relative URLs:

```javascript
export const config = {
    BACKEND_URL: '/api',  // Relative URL - works everywhere
};
```

This works in:
- Local development: `/api` → `http://localhost:8000/api` → nginx → backend:5050
- Behind reverse proxy: `/api` → `https://yourdomain.com/api` → proxy → container

### Step 2: Verify Backend CORS

Check your [.env](.env) file:

```bash
BACKEND_PORT=5050
CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
```

### Step 3: Restart Backend

```bash
python3 start.py
```

You should see:
```
🚀 Starting Markdown Viewer Backend
   Host: 127.0.0.1
   Port: 5050
   Debug: True
   URL: http://localhost:5050
```

### Step 4: Clear Browser Cache

**Option A: Hard refresh**
- Windows/Linux: Ctrl + Shift + R
- Mac: Cmd + Shift + R

**Option B: Clear localStorage**
Open console (F12) and run:
```javascript
localStorage.clear()
location.reload()
```

### Step 5: Verify Connection

Open http://localhost:8000 and check console for:
```
✅ Loaded N models from backend
```

---

## Testing the Fix

### Test 1: Backend Health Check

```bash
curl http://localhost:5050/api/health
```

Expected:
```json
{
  "status": "healthy",
  "service": "markdown-viewer-backend"
}
```

### Test 2: Models Endpoint

```bash
curl http://localhost:5050/api/llm/models
```

Expected:
```json
{
  "success": true,
  "models": [
    "anthropic/claude-3.5-sonnet",
    ...
  ]
}
```

### Test 3: CORS Headers

```bash
curl -H "Origin: http://localhost:8000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:5050/api/llm/models -v
```

Look for these headers in response:
```
Access-Control-Allow-Origin: http://localhost:8000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Configuration Files Changed

| File | Change | Purpose |
|------|--------|---------|
| `scripts/config.js` | **NEW** | Frontend configuration |
| `scripts/utils/api.js` | Modified | Import and use config |
| `backend/app.py` | Modified | Enhanced CORS setup |

---

## Quick Reference Commands

### Change backend URL temporarily (browser console):
```javascript
APIClient.setBackendURL('http://localhost:5050/api')
```

### Check current backend URL:
```javascript
console.log(APIClient.getBackendURL())
```

### Reset to default:
```javascript
APIClient.resetBackendURL()
```

### Test backend from terminal:
```bash
# Health check
curl http://localhost:5050/api/health

# List models
curl http://localhost:5050/api/llm/models
```

---

## Common Errors and Solutions

### Error: "CORS policy blocked"

**Solution:**
1. Add frontend origin to backend `.env`:
   ```bash
   CORS_ORIGINS=http://localhost:8000
   ```
2. Restart backend
3. Hard refresh browser (Ctrl+Shift+R)

### Error: "net::ERR_FAILED"

**Solution:**
1. Verify backend is running on correct port
2. Update `scripts/config.js` to match
3. Reload page

### Error: "No models loaded"

**Solution:**
1. Check backend logs for errors
2. Verify `.env` has `OPENROUTER_MODELS` set
3. Test endpoint: `curl http://localhost:5050/api/llm/models`

---

## Related Documentation

- [FRONTEND_CONFIGURATION.md](FRONTEND_CONFIGURATION.md) - Complete frontend config guide
- [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md) - Backend port configuration
- [MODEL_CONFIGURATION.md](MODEL_CONFIGURATION.md) - LLM model configuration

---

## Status

✅ Frontend configuration centralized in `scripts/config.js`
✅ API client updated to use config file
✅ CORS properly configured with preflight support
✅ Port 5050 now configurable in frontend
✅ Documentation created

**All issues resolved!** 🎉
