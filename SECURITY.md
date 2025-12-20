# Security Guidelines for BookStack Integration

## Overview

This document outlines security considerations and best practices for deploying the BookStack integration feature in production environments.

---

## Session Security

### Token Storage Decision

The BookStack integration stores API tokens (token_id and token_secret) in Flask sessions. This design decision was made based on the following considerations:

**Why Session Storage:**
- ✅ **Temporary storage**: Tokens are session-scoped and automatically cleared on logout
- ✅ **No database required**: Simplifies deployment and reduces attack surface
- ✅ **User-controlled**: Each user manages their own tokens independently
- ✅ **Easy revocation**: Tokens can be regenerated in BookStack at any time
- ✅ **Team use case**: Designed for trusted team environments, not public access

**Security Trade-offs:**
- ⚠️ **Session hijacking risk**: If HTTPS is not enforced, session cookies can be intercepted
- ⚠️ **Cookie theft**: Weak session secrets or XSS vulnerabilities could expose tokens
- ⚠️ **24-hour lifetime**: Sessions persist for 24 hours (configurable)

**Mitigation Strategies:**
- ✅ **HTTPS enforcement in production** (see below)
- ✅ **Secure session configuration** (httpOnly, secure, sameSite flags)
- ✅ **Strong SECRET_KEY** (random, long, kept secure)
- ✅ **Limited scope**: Tokens have minimal BookStack permissions

---

## HTTPS Enforcement in Production

### Critical Requirement

**⚠️ HTTPS MUST be enforced in production environments when using BookStack integration.**

Session cookies containing BookStack API tokens are transmitted with every request. Without HTTPS:
- 🚨 **Tokens can be intercepted** via man-in-the-middle attacks
- 🚨 **Session hijacking** becomes trivial on unsecured networks
- 🚨 **User credentials** are exposed in plain text

### Implementation via Reverse Proxy

The recommended production deployment uses a reverse proxy (nginx, Traefik, Caddy) to handle HTTPS termination.

#### Architecture

```
Internet (HTTPS) → Reverse Proxy → Docker Container (HTTP)
                   ├─ SSL/TLS termination
                   ├─ HTTPS enforcement
                   └─ Security headers
```

#### nginx Example

```nginx
server {
    # HTTP → HTTPS redirect
    listen 80;
    server_name md.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name md.yourdomain.com;

    # SSL configuration
    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256...';
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Docker container
    location / {
        proxy_pass http://172.30.0.20:80;  # Container IP
        proxy_http_version 1.1;

        # Forward client info
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for large operations
        proxy_read_timeout 600s;
        client_max_body_size 50M;
    }
}
```

#### Traefik Example

```yaml
# docker-compose.yml with Traefik
services:
  markdown-viewer:
    image: markdown-viewer:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.markdown.rule=Host(`md.yourdomain.com`)"
      - "traefik.http.routers.markdown.entrypoints=websecure"
      - "traefik.http.routers.markdown.tls.certresolver=letsencrypt"
      # Force HTTPS
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
      - "traefik.http.routers.markdown-http.middlewares=redirect-to-https"
```

#### Caddy Example

```
md.yourdomain.com {
    reverse_proxy markdown-viewer:80
    # Caddy handles HTTPS automatically with Let's Encrypt
}
```

### Flask Session Configuration

Ensure these settings are enabled in production (already configured in app.py):

```python
app.config.update(
    # Strong random secret (NEVER commit to git)
    SECRET_KEY=os.environ.get('SECRET_KEY'),

    # Prevent JavaScript access to session cookies
    SESSION_COOKIE_HTTPONLY=True,

    # CRITICAL: Only send cookies over HTTPS
    SESSION_COOKIE_SECURE=True,  # Set to True in production

    # CSRF protection
    SESSION_COOKIE_SAMESITE='Lax',

    # Session expiry (24 hours)
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24)
)
```

**Important:** Set `SESSION_COOKIE_SECURE=True` when deploying behind HTTPS reverse proxy.

### Verification Checklist

Before deploying to production:

- [ ] Reverse proxy configured with valid SSL certificate
- [ ] HTTP → HTTPS redirect enabled
- [ ] `SESSION_COOKIE_SECURE=True` in Flask configuration
- [ ] Strong `SECRET_KEY` set in environment variables (min 32 random characters)
- [ ] HSTS header enabled (`Strict-Transport-Security`)
- [ ] Security headers configured (X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] SSL/TLS protocols limited to TLSv1.2+ only
- [ ] BookStack instance also uses HTTPS

---

## Secret Key Management

### Generate Strong SECRET_KEY

```bash
# Python method
python -c "import secrets; print(secrets.token_hex(32))"

# OpenSSL method
openssl rand -hex 32

# Example output (NEVER reuse this):
# 8f3d2e1c9a7b4d6e8f1a3c5e7b9d2f4a6c8e1f3b5d7a9c2e4f6a8b1c3d5e7f9a
```

### Secure Storage

**DO:**
- ✅ Store in `.env` file (excluded from git via `.gitignore`)
- ✅ Use environment variables in production
- ✅ Use secret management services (AWS Secrets Manager, HashiCorp Vault, etc.)
- ✅ Rotate periodically (e.g., every 90 days)

**DON'T:**
- ❌ Commit secrets to git repository
- ❌ Use default or weak values like 'dev-secret-key'
- ❌ Share the same key across multiple environments
- ❌ Hardcode in source code

---

## BookStack Token Management

### User Responsibilities

Each user should:
- Generate dedicated API tokens in BookStack (not their main credentials)
- Use descriptive token names (e.g., "Markdown Editor - John Doe")
- Set token expiration (recommend 6-12 months, then rotate)
- Revoke tokens immediately if compromised or no longer needed
- Never share tokens with other users

### Admin Responsibilities

BookStack administrators should:
- Create a role with minimal required permissions for markdown editing
- Assign users to this role before token creation
- Review active tokens periodically
- Monitor BookStack audit logs for suspicious activity
- Revoke tokens for users who leave the team

### Token Permissions

Recommended BookStack role permissions:
- ✅ **View** books, chapters, pages
- ✅ **Create** pages
- ✅ **Update** pages (own or all, depending on use case)
- ❌ **Delete** pages (optional, use with caution)
- ❌ **Manage** books, chapters, shelves (admin-only)
- ❌ **Access System API** beyond content operations

---

## Network Security

### Internal Network Deployment

If BookStack is on an internal network:
- 🔒 Backend can communicate directly (no public internet)
- 🔒 Reduce attack surface for token interception
- 🔒 Network segmentation provides additional layer

### VPN/Tunnel Access

For remote teams:
- Use VPN to access BookStack securely
- Consider mutual TLS (mTLS) for backend-to-BookStack communication
- Implement IP whitelisting if possible

---

## Monitoring and Logging

### What to Monitor

1. **Failed Authentication Attempts**
   - Multiple failed logins may indicate credential guessing
   - Log to security monitoring system

2. **Session Anomalies**
   - Session hijacking attempts (IP changes, unusual user agents)
   - Concurrent sessions from different locations

3. **BookStack API Errors**
   - 401/403 errors may indicate revoked or invalid tokens
   - Rate limiting triggers

4. **Unusual Activity**
   - Mass page updates
   - Access to sensitive books/pages
   - Off-hours activity

### Logging Configuration

```python
# Add to Flask app
import logging

# Configure security logging
security_logger = logging.getLogger('security')
security_logger.setLevel(logging.WARNING)

# Log authentication events
@bookstack_bp.route('/authenticate', methods=['POST'])
def authenticate():
    # ... existing code ...
    try:
        user = service.authenticate()
        security_logger.info(f"BookStack auth success: {user.get('email')}")
        # ...
    except requests.exceptions.HTTPError as e:
        security_logger.warning(f"BookStack auth failed: {e.response.status_code}")
        # ...
```

---

## Incident Response

### If Token Compromise Suspected

1. **Immediate Actions:**
   - User logs out of markdown viewer (clears session)
   - Admin revokes token in BookStack
   - Review BookStack audit log for unauthorized changes

2. **Investigation:**
   - Check application logs for suspicious access patterns
   - Review nginx/reverse proxy access logs
   - Examine BookStack audit trail

3. **Remediation:**
   - Generate new token for user
   - Update session SECRET_KEY if session hijacking suspected
   - Review and update security configurations

### If SECRET_KEY Compromised

1. **Immediate Actions:**
   - Generate new SECRET_KEY
   - Restart application (invalidates all sessions)
   - Notify all users to re-authenticate

2. **Investigation:**
   - Determine how key was exposed
   - Review git history, logs, backups

3. **Prevention:**
   - Audit secret management practices
   - Implement secret scanning in CI/CD
   - Review access controls

---

## Additional Security Best Practices

### 1. Input Validation

All user inputs are validated server-side:
- Query parameters (count, offset) have reasonable limits
- Page content sanitized before storage
- File paths validated to prevent directory traversal

### 2. Rate Limiting

Consider implementing rate limiting:
```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=lambda: session.get('bookstack_user', {}).get('id'),
    default_limits=["200 per hour"]
)

@bookstack_bp.route('/pages/<int:page_id>', methods=['PUT'])
@limiter.limit("20 per minute")
def update_page(page_id):
    # ...
```

### 3. Content Security Policy

Add CSP headers to prevent XSS:
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline';" always;
```

### 4. Regular Updates

- Keep Flask and dependencies updated
- Monitor security advisories for BookStack
- Review and update TLS configurations annually

---

## Production Deployment Checklist

### Before Go-Live

- [ ] HTTPS enforced via reverse proxy
- [ ] Valid SSL certificate installed (not self-signed)
- [ ] HTTP → HTTPS redirect configured
- [ ] `SESSION_COOKIE_SECURE=True` in environment
- [ ] Strong `SECRET_KEY` generated and stored securely
- [ ] Security headers configured (HSTS, X-Frame-Options, CSP)
- [ ] TLS 1.2+ only (disable TLS 1.0/1.1)
- [ ] Strong cipher suites configured
- [ ] CORS origins restricted to your domain
- [ ] BookStack URL uses HTTPS
- [ ] User tokens created with minimal permissions
- [ ] Logging configured and monitored
- [ ] Backup and recovery procedures documented
- [ ] Incident response plan prepared

### Ongoing Maintenance

- [ ] Review BookStack tokens quarterly
- [ ] Rotate `SECRET_KEY` annually
- [ ] Update SSL certificates before expiry
- [ ] Monitor security logs weekly
- [ ] Apply security patches within 30 days
- [ ] Review access logs monthly
- [ ] Audit user permissions semi-annually

---

## Summary

The BookStack integration is designed for **trusted team environments** with appropriate security controls:

1. **HTTPS is mandatory in production** - Enforced via reverse proxy
2. **Session tokens are temporary** - 24-hour lifetime, cleared on logout
3. **Strong secrets required** - Random SECRET_KEY, secure storage
4. **Minimal permissions** - Users have only needed BookStack access
5. **Monitoring essential** - Log and review authentication events

Following these guidelines ensures secure deployment while maintaining the simplicity and usability of the integration.

---

## Questions or Concerns?

If you have security questions or discover vulnerabilities:
1. Review this document and implementation plan
2. Check BookStack security documentation
3. Report security issues privately (not in public issue tracker)
4. Follow responsible disclosure practices

**Remember: Security is a shared responsibility between developers, administrators, and users.**
