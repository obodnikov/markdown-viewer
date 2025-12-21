# Configuration Guide

## Backend Port Configuration

The backend server port can be configured in three ways (in order of priority):

### 1. Command-Line Arguments (Highest Priority)

```bash
# Start on custom port
python3 start.py --port 3000

# Start on custom host and port
python3 start.py --host 127.0.0.1 --port 8080

# Enable debug mode
python3 start.py --debug

# Combine options
python3 start.py --host 0.0.0.0 --port 3000 --debug
```

**Available CLI options:**
- `--host HOST` - Host to bind to (default: 0.0.0.0)
- `--port PORT` - Port to bind to (default: 5000)
- `--debug` - Enable debug mode

**View help:**
```bash
python3 start.py --help
```

### 2. Environment Variables (Medium Priority)

Set in your `.env` file:

```bash
# Backend Server Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=5000
```

Or set as environment variables:

```bash
# Temporary (current session)
export BACKEND_PORT=3000
python3 start.py

# Or inline
BACKEND_PORT=3000 python3 start.py
```

### 3. Default Values (Lowest Priority)

If neither CLI args nor environment variables are set:
- **Host:** `0.0.0.0` (all interfaces)
- **Port:** `5000`
- **Debug:** `False`

---

## Priority Order

When multiple configuration methods are used, the priority is:

```
Command-Line Arguments > Environment Variables > Defaults
```

**Example:**
```bash
# .env file has: BACKEND_PORT=3000
# CLI argument: --port 8080
# Result: Server starts on port 8080 (CLI overrides .env)
```

---

## Usage Examples

### Development (default port)
```bash
python3 start.py
# Server: http://localhost:5000
```

### Custom Port
```bash
python3 start.py --port 3000
# Server: http://localhost:3000
```

### Localhost Only (security)
```bash
python3 start.py --host 127.0.0.1 --port 5000
# Server: http://127.0.0.1:5000 (not accessible from network)
```

### Debug Mode
```bash
python3 start.py --debug
# Enables auto-reload and detailed error messages
```

### Production-like Setup
```bash
# In .env:
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8080
DEBUG=False

# Start:
python3 start.py
# Server: http://0.0.0.0:8080
```

---

## Frontend Configuration

**Important:** When changing the backend port, you must update the frontend API URL.

### Option 1: Update JavaScript API Client

Edit `scripts/utils/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:3000/api';  // Change port here
```

### Option 2: Environment-Based (Recommended)

Update the API client to read from environment:

```javascript
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
```

### Option 3: Make it Dynamic

Update `scripts/utils/api.js` to auto-detect:

```javascript
// Detect backend port from window location or default
const BACKEND_PORT = window.location.port === '8000' ? '5000' : window.location.port;
const API_BASE_URL = `http://localhost:${BACKEND_PORT}/api`;
```

---

## Docker Configuration

### Docker Compose

Edit `docker-compose.yml` to change the port mapping:

```yaml
services:
  markdown-viewer:
    ports:
      - "8000:80"      # Frontend
      - "3000:5000"    # Backend (host:container)
    environment:
      - BACKEND_PORT=5000  # Internal port
```

**Example: Run backend on port 3000:**
```yaml
ports:
  - "3000:5000"  # Access on localhost:3000, container uses 5000
```

### Docker Run

```bash
docker run -p 3000:5000 -e BACKEND_PORT=5000 markdown-viewer
```

---

## CORS Configuration

When changing the backend port, update CORS origins in `.env`:

```bash
# If backend runs on port 3000:
CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000

# If frontend also changes port:
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

## GitHub OAuth Redirect URI

When changing the backend port, update GitHub OAuth settings:

**In `.env`:**
```bash
# If backend runs on port 3000:
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback
```

**On GitHub:**
1. Go to https://github.com/settings/developers
2. Edit your OAuth App
3. Update "Authorization callback URL" to match your backend port

---

## Complete Configuration Example

### Scenario: Backend on port 3000, Frontend on port 8080

**1. Configure Backend (.env):**
```bash
BACKEND_PORT=3000
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback
```

**2. Start Backend:**
```bash
python3 start.py
# or: python3 start.py --port 3000
```

**3. Update Frontend API URL:**

Edit `scripts/utils/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

**4. Start Frontend:**
```bash
cd public
python3 -m http.server 8080
```

**5. Access Application:**
- Frontend: http://localhost:8080
- Backend: http://localhost:3000

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5000
lsof -ti:5000

# Kill process
lsof -ti:5000 | xargs kill -9

# Or use different port
python3 start.py --port 5001
```

### CORS Errors After Port Change

Check these:
1. Backend CORS_ORIGINS includes your frontend URL
2. Frontend API_BASE_URL points to correct backend port
3. Both servers are running
4. No typos in URLs (http vs https, port numbers)

### GitHub OAuth Fails After Port Change

1. Update `GITHUB_REDIRECT_URI` in `.env`
2. Update callback URL in GitHub OAuth app settings
3. Restart backend server
4. URLs must match exactly (including protocol and port)

---

## Environment Variables Reference

### Backend Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_HOST` | `0.0.0.0` | Host to bind to |
| `BACKEND_PORT` | `5000` | Port to bind to |
| `DEBUG` | `False` | Enable debug mode |
| `SECRET_KEY` | (random) | Flask session secret |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `LOG_FORMAT` | `detailed` | Log format (`simple` or `detailed`) |
| `DISABLE_FILE_LOGGING` | `False` | Disable file logging (use for Docker) |

### API Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | ✅ Yes | OpenRouter API key |
| `OPENROUTER_DEFAULT_MODEL` | No | Default LLM model |

### GitHub OAuth

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth secret |
| `GITHUB_REDIRECT_URI` | Optional | OAuth callback URL |

### CORS & Security

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `localhost:8000` | Allowed CORS origins |

---

## Quick Reference Commands

```bash
# Default (port 5000)
python3 start.py

# Custom port
python3 start.py --port 3000

# Localhost only
python3 start.py --host 127.0.0.1

# Debug mode
python3 start.py --debug

# All options
python3 start.py --host 0.0.0.0 --port 3000 --debug

# Environment variable
BACKEND_PORT=3000 python3 start.py

# View help
python3 start.py --help

# Check what port is configured
grep BACKEND_PORT .env
```

---

## Testing Different Ports

```bash
# Terminal 1: Start backend on port 3000
python3 start.py --port 3000

# Terminal 2: Test backend
curl http://localhost:3000/api/health

# Expected: {"status":"healthy","service":"markdown-viewer-backend"}
```

---

## Logging Configuration

### Overview

The application supports both console (stdout/stderr) and file-based logging. Configuration can be adjusted for different environments.

### Logging Levels

Set via `LOG_LEVEL` environment variable:
- `DEBUG` - Detailed debugging information
- `INFO` - General informational messages (default)
- `WARNING` - Warning messages
- `ERROR` - Error messages only

### Log Formats

Set via `LOG_FORMAT` environment variable:

**Simple format:**
```
[2025-12-21 10:30:45] INFO - Application started
```

**Detailed format (default):**
```
[2025-12-21 10:30:45] INFO [app.create_app:106] - Application started
```

### File Logging Control

By default, logs are written to both:
- **Console (stdout/stderr)** - Always enabled
- **File (`backend/logs/app.log`)** - Enabled by default, can be disabled

### Docker Logging (Recommended)

For Docker deployments, disable file logging to ensure logs appear in `docker logs`:

**In `docker-compose.yml`:**
```yaml
environment:
  - DISABLE_FILE_LOGGING=true
  - LOG_LEVEL=INFO
```

**Why?** Docker best practices recommend logging to stdout/stderr so that:
- Logs are visible via `docker logs <container>`
- No disk I/O overhead for log files
- Easier integration with log aggregation tools
- Follows 12-factor app principles

### Local Development Logging

For local development, keep file logging enabled:

**In `.env`:**
```bash
DISABLE_FILE_LOGGING=false  # or omit (defaults to false)
LOG_LEVEL=DEBUG
LOG_FORMAT=detailed
```

Logs will be written to:
- Console: stdout/stderr
- File: `backend/logs/app.log` (rotates at 10MB, keeps 5 backups)

### Viewing Docker Logs

```bash
# Follow logs in real-time
docker logs -f markdown-viewer

# Last 100 lines
docker logs --tail 100 markdown-viewer

# Logs since 1 hour ago
docker logs --since 1h markdown-viewer

# Timestamps
docker logs -t markdown-viewer
```

### Supervisor Output

The `supervisord.conf` is configured to send all process output to stdout/stderr:

```ini
[program:flask]
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
```

This ensures Flask application logs flow through Docker's logging system.

### Configuration Examples

**Production Docker:**
```bash
LOG_LEVEL=INFO
LOG_FORMAT=simple
DISABLE_FILE_LOGGING=true
```

**Development Local:**
```bash
LOG_LEVEL=DEBUG
LOG_FORMAT=detailed
DISABLE_FILE_LOGGING=false
```

**Debugging Issues:**
```bash
LOG_LEVEL=DEBUG
LOG_FORMAT=detailed
DISABLE_FILE_LOGGING=false  # Keep files for analysis
```

### Troubleshooting

**Logs not appearing in Docker:**
1. Check `DISABLE_FILE_LOGGING=true` is set
2. Verify `supervisord.conf` uses `/dev/stdout` and `/dev/stderr`
3. Restart container: `docker-compose restart`

**Too much log noise:**
1. Set `LOG_LEVEL=WARNING` or `LOG_LEVEL=ERROR`
2. Use `LOG_FORMAT=simple` for cleaner output

**Need more details:**
1. Set `LOG_LEVEL=DEBUG`
2. Use `LOG_FORMAT=detailed`
3. Check `backend/logs/app.log` (if file logging enabled)

---

## Best Practices

1. **Development:** Use default port 5000
2. **Production:** Use standard ports (80, 443) or configured port
3. **Security:** Use `127.0.0.1` for local-only access
4. **Docker:** Keep internal port 5000, map external as needed
5. **Documentation:** Always update CORS and callback URIs when changing ports
6. **Logging:** Use `DISABLE_FILE_LOGGING=true` in Docker environments

---

## Related Documentation

- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick setup guide
- [.env.example](.env.example) - Environment template
- [docker-compose.yml](docker-compose.yml) - Docker configuration
