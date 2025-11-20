# Frontend Configuration

## Backend URL Configuration

The frontend needs to know where your backend server is running. There are **three ways** to configure this, listed by priority:

### Priority Order

1. **localStorage** (highest priority)
2. **URL parameter**
3. **Config file** (default)

---

## Method 1: Config File (Recommended)

Edit [scripts/config.js](scripts/config.js) and change the `BACKEND_URL`:

```javascript
export const config = {
    BACKEND_URL: 'http://localhost:5050/api',  // Change this line
};
```

**When to use:**
- Setting a permanent default for your environment
- Deploying to production with a fixed backend URL

**Example:**
```javascript
// Development
BACKEND_URL: 'http://localhost:5050/api'

// Production
BACKEND_URL: 'https://api.example.com/api'
```

---

## Method 2: URL Parameter

Add `?api_url=` to your URL:

```
http://localhost:8000?api_url=http://localhost:5050/api
```

**When to use:**
- Testing against different backend servers
- Sharing a specific configuration with someone
- Temporary override without changing code

---

## Method 3: Browser Console

Use `APIClient.setBackendURL()` in the browser console:

```javascript
// Set custom backend URL
APIClient.setBackendURL('http://localhost:5050/api')

// Reset to default
APIClient.resetBackendURL()

// Check current URL
APIClient.getBackendURL()
```

**When to use:**
- Quick testing during development
- Switching backends without reloading
- Debugging connection issues

---

## Common Port Configurations

### Development (Local)

**Backend on default port (5000):**
```javascript
BACKEND_URL: 'http://localhost:5000/api'
```

**Backend on custom port (5050):**
```javascript
BACKEND_URL: 'http://localhost:5050/api'
```

**Backend on different host:**
```javascript
BACKEND_URL: 'http://192.168.1.100:5000/api'
```

### Production

**Same domain (reverse proxy):**
```javascript
BACKEND_URL: '/api'  // Relative URL
```

**Different domain:**
```javascript
BACKEND_URL: 'https://api.example.com/api'
```

**Different subdomain:**
```javascript
BACKEND_URL: 'https://backend.example.com/api'
```

---

## Checking Your Configuration

### 1. Check Current Backend URL

Open browser console (F12) and run:

```javascript
APIClient.getBackendURL()
```

### 2. Test Backend Connection

Check if backend is reachable:

```bash
# Replace port with your backend port
curl http://localhost:5050/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "markdown-viewer-backend"
}
```

### 3. Check Browser Console

Look for these log messages:
```
✅ Loaded N models from backend
```

If you see errors:
```
❌ Failed to load models: Error: ...
⚠️ Using hardcoded model list as fallback
```

---

## Troubleshooting

### Issue: "CORS policy" error

**Error message:**
```
Access to fetch at 'http://localhost:5050/api/...' from origin 'http://localhost:8000'
has been blocked by CORS policy
```

**Solution:**

1. Check backend `.env` file has correct CORS origins:
   ```bash
   CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
   ```

2. Restart backend after changing `.env`:
   ```bash
   python3 start.py
   ```

3. If using a different frontend port, add it to CORS_ORIGINS:
   ```bash
   CORS_ORIGINS=http://localhost:8000,http://localhost:3000
   ```

### Issue: "Connection refused" or "net::ERR_FAILED"

**Cause:** Backend is not running or using wrong port

**Solution:**

1. Verify backend is running:
   ```bash
   curl http://localhost:5050/api/health
   ```

2. Check backend startup message shows correct port:
   ```
   🚀 Starting Markdown Viewer Backend
      Port: 5050
   ```

3. Update frontend config to match:
   ```javascript
   BACKEND_URL: 'http://localhost:5050/api'  // Match backend port
   ```

### Issue: Backend port keeps changing

**Solution:** Set permanent port in `.env`:

```bash
BACKEND_PORT=5050
```

Then always start backend with:
```bash
python3 start.py  # Uses .env port
```

Or explicitly:
```bash
python3 start.py --port 5050
```

---

## Environment-Specific Configurations

### Development Setup

**Backend `.env`:**
```bash
BACKEND_HOST=127.0.0.1
BACKEND_PORT=5050
CORS_ORIGINS=http://localhost:8000
DEBUG=True
```

**Frontend `scripts/config.js`:**
```javascript
BACKEND_URL: 'http://localhost:5050/api'
```

### Production Setup

**Backend `.env`:**
```bash
BACKEND_HOST=0.0.0.0
BACKEND_PORT=5000
CORS_ORIGINS=https://example.com
DEBUG=False
```

**Frontend `scripts/config.js`:**
```javascript
BACKEND_URL: 'https://api.example.com/api'
```

### Docker Setup

**Backend `.env`:**
```bash
BACKEND_HOST=0.0.0.0
BACKEND_PORT=5000
CORS_ORIGINS=http://localhost:8000
```

**Frontend `scripts/config.js`:**
```javascript
BACKEND_URL: 'http://localhost:5000/api'
```

---

## Complete Example

### Scenario: Backend on port 5050, Frontend on port 8000

1. **Backend `.env`:**
   ```bash
   BACKEND_PORT=5050
   CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
   ```

2. **Frontend `scripts/config.js`:**
   ```javascript
   export const config = {
       BACKEND_URL: 'http://localhost:5050/api',
   };
   ```

3. **Start backend:**
   ```bash
   python3 start.py
   # Should show: Port: 5050
   ```

4. **Start frontend:**
   ```bash
   python3 serve-frontend.py --port 8000
   ```

5. **Verify:**
   - Open http://localhost:8000
   - Check console for: `✅ Loaded N models from backend`

---

## Quick Reference

| Configuration Method | Priority | Persists? | Use Case |
|---------------------|----------|-----------|----------|
| localStorage | 1 (highest) | Yes (until cleared) | Personal preference |
| URL parameter | 2 | No (session only) | Temporary testing |
| Config file | 3 (default) | Yes (in code) | Default/production |

**Change backend URL without restart:**
```javascript
APIClient.setBackendURL('http://localhost:5050/api')
```

**Reset to default:**
```javascript
APIClient.resetBackendURL()
```

**Check current URL:**
```javascript
console.log(APIClient.getBackendURL())
```

---

## Related Files

- **Frontend Config**: [scripts/config.js](scripts/config.js)
- **API Client**: [scripts/utils/api.js](scripts/utils/api.js)
- **Backend Config**: [backend/config.py](backend/config.py)
- **Backend .env**: [.env](.env)
- **Port Config Docs**: [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md)
