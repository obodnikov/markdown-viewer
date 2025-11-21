# Reverse Proxy Setup Guide

This guide explains how to deploy the Markdown Viewer behind a reverse proxy (nginx, Traefik, Caddy, etc.).

## Why It Works Seamlessly

The application is **designed for reverse proxy deployments** with zero configuration changes needed. The frontend uses **relative URLs** (`/api`) that automatically adapt to your domain.

### Architecture

```
User Browser
    ↓ https://md.yourdomain.com
Reverse Proxy (nginx, Traefik, etc.)
    ↓ http://172.30.0.20:80 (Docker container)
Container nginx (port 80)
    ↓ /api → http://localhost:5050
Flask Backend (port 5050)
```

### Key Benefits

✅ **No configuration changes** - Same Docker image works in all environments
✅ **No CORS issues** - Same origin for browser
✅ **HTTPS automatic** - Handled by reverse proxy
✅ **Works locally too** - Relative URLs work in development

---

## nginx Reverse Proxy Configuration

### Complete Example

```nginx
# HTTP → HTTPS redirect
server {
  listen 80;
  server_name md.yourdomain.com;
  return 301 https://$host$request_uri;
}

# HTTPS server
server {
  listen 443 ssl http2;
  server_name md.yourdomain.com;

  # SSL configuration
  ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  # Security headers
  add_header X-Content-Type-Options "nosniff";
  add_header X-Frame-Options "SAMEORIGIN";
  add_header X-XSS-Protection "1; mode=block";

  # Proxy to Docker container
  location / {
    proxy_pass http://172.30.0.20:80;  # Replace with your container IP
    proxy_http_version 1.1;

    # Required headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket support (if needed in future)
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Timeouts for large file exports
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
    proxy_connect_timeout 600s;

    # Large file uploads/downloads
    client_max_body_size 100M;

    # Buffering
    proxy_buffering off;
    proxy_request_buffering off;
  }

  # Let's Encrypt challenge
  location /.well-known/acme-challenge/ {
    alias /var/www/html/.well-known/acme-challenge/;
  }
}
```

### Minimal Configuration

If you just need basic proxying:

```nginx
server {
  listen 443 ssl http2;
  server_name md.yourdomain.com;

  ssl_certificate     /path/to/fullchain.pem;
  ssl_certificate_key /path/to/privkey.pem;

  location / {
    proxy_pass http://172.30.0.20:80;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## Traefik Configuration

### docker-compose.yml with Traefik

```yaml
version: '3.8'

services:
  markdown-viewer:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: markdown-viewer
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - GITHUB_REDIRECT_URI=https://md.yourdomain.com/api/github/callback
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.markdown.rule=Host(`md.yourdomain.com`)"
      - "traefik.http.routers.markdown.entrypoints=websecure"
      - "traefik.http.routers.markdown.tls.certresolver=letsencrypt"
      - "traefik.http.services.markdown.loadbalancer.server.port=80"
    networks:
      - traefik
    restart: unless-stopped

networks:
  traefik:
    external: true
```

---

## Caddy Configuration

Caddy makes it even simpler:

```caddy
md.yourdomain.com {
    reverse_proxy http://172.30.0.20:80
}
```

That's it! Caddy handles HTTPS automatically.

---

## Environment Configuration for Production

### Update .env for Your Domain

```bash
# Required: OpenRouter API key
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional: GitHub OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_REDIRECT_URI=https://md.yourdomain.com/api/github/callback

# Backend configuration
BACKEND_PORT=5050
SECRET_KEY=change-me-to-random-string-in-production

# CORS - add your domain
CORS_ORIGINS=https://md.yourdomain.com
```

### GitHub OAuth App Settings

If using GitHub integration, update your OAuth app:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Select your OAuth app
3. Update **Authorization callback URL** to: `https://md.yourdomain.com/api/github/callback`

---

## Deployment Steps

### 1. Prepare Server

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone repository
git clone <your-repo-url>
cd markdown-viewer

# Copy and configure environment
cp .env.example .env
nano .env  # Edit with your settings
```

### 2. Start Container

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f

# Verify health
curl http://localhost:8000  # Should return HTML
```

### 3. Configure Reverse Proxy

Add the nginx configuration above to:
- `/etc/nginx/sites-available/markdown-viewer`
- Create symlink: `ln -s /etc/nginx/sites-available/markdown-viewer /etc/nginx/sites-enabled/`
- Test: `nginx -t`
- Reload: `systemctl reload nginx`

### 4. Get SSL Certificate

```bash
# Using certbot
certbot --nginx -d md.yourdomain.com
```

### 5. Test

- Visit `https://md.yourdomain.com`
- Check browser console (F12) - should see `[API] Backend URL: /api`
- Test features (open file, export, transformations)

---

## Troubleshooting

### Issue: "Failed to fetch"

**Cause:** Container not accessible to reverse proxy

**Solution:**
```bash
# Check container is running
docker ps | grep markdown-viewer

# Check container IP
docker inspect markdown-viewer | grep IPAddress

# Update nginx proxy_pass with correct IP
```

### Issue: "CORS errors"

**Cause:** Should not happen with relative URLs, but if using custom config:

**Solution:**
```bash
# Check CORS in .env includes your domain
CORS_ORIGINS=https://md.yourdomain.com

# Restart container
docker-compose restart
```

### Issue: "GitHub OAuth redirect mismatch"

**Cause:** GitHub app callback URL doesn't match

**Solution:**
1. Check `.env`: `GITHUB_REDIRECT_URI=https://md.yourdomain.com/api/github/callback`
2. Check GitHub app settings match exactly
3. Restart container

### Issue: Export timeout

**Cause:** PDF/DOCX generation takes time

**Solution:** Increase nginx timeout:
```nginx
proxy_read_timeout 600s;
proxy_send_timeout 600s;
```

---

## Security Recommendations

### 1. Use Strong Secrets

```bash
# Generate random secret key
openssl rand -base64 32

# Add to .env
SECRET_KEY=<generated-key>
```

### 2. Restrict CORS

Only allow your domain:
```bash
CORS_ORIGINS=https://md.yourdomain.com
```

### 3. Enable Security Headers

Already included in nginx example above:
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`

### 4. Keep Software Updated

```bash
# Update container
cd /path/to/markdown-viewer
git pull
docker-compose build --no-cache
docker-compose up -d
```

---

## Performance Optimization

### Enable Caching

Add to nginx configuration:

```nginx
# Cache static files
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
    proxy_pass http://172.30.0.20:80;
    proxy_cache_valid 200 1d;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Enable Gzip (already enabled in container's nginx)

Container nginx.conf already has:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

---

## Monitoring

### Check Health Endpoint

```bash
# Direct to container
curl http://localhost:8000/api/health

# Through reverse proxy
curl https://md.yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "markdown-viewer-backend"
}
```

### View Logs

```bash
# Container logs
docker-compose logs -f

# nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## Summary

✅ **Zero configuration changes needed** - Relative URLs work everywhere
✅ **Add reverse proxy** - Use nginx, Traefik, or Caddy
✅ **Update .env** - Set domain in GITHUB_REDIRECT_URI
✅ **Update GitHub OAuth** - Set callback URL to your domain
✅ **Deploy and test** - Should work immediately

The application is production-ready and reverse proxy-friendly by design!
