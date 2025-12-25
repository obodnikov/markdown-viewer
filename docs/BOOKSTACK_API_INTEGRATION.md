# BookStack API Integration

**Last Updated:** 2025-12-25

This document describes how the Markdown Viewer integrates with BookStack's REST API for bidirectional sync.

---

## Overview

The application supports full bidirectional sync with BookStack instances:
- **Read**: Load pages from BookStack for editing
- **Write**: Save edited content back to BookStack pages
- **Create**: Create new pages in BookStack from the editor

---

## API Endpoints Used

### 1. Page Loading (Read Operations)

**Primary Method: Native Markdown Export (Recommended)**

```http
GET /api/pages/{id}/export/markdown
Authorization: Token {token_id}:{token_secret}
```

**Response:** Plain text markdown content

**Advantages:**
- Native markdown export from BookStack
- Most accurate conversion
- Preserves BookStack-specific formatting
- Designed specifically for markdown extraction

**Fallback Method: HTML Conversion**

If the export endpoint is unavailable (404) or fails:

```http
GET /api/pages/{id}
Authorization: Token {token_id}:{token_secret}
```

**Response:** JSON object with page metadata and HTML content

The application uses `html2text` library to convert HTML to Markdown as a fallback.

**Implementation Strategy:**

```python
def get_page(page_id):
    # 1. Get page metadata
    page = GET /api/pages/{id}

    # 2. Try native export endpoint
    try:
        markdown = GET /api/pages/{id}/export/markdown
        page['markdown'] = markdown
        return page  # Success!
    except (404, 403, TimeoutError):
        # Export not available
        pass

    # 3. Fallback: Convert HTML to Markdown
    if page['html'] and not page['markdown']:
        page['markdown'] = html_to_markdown(page['html'])

    return page
```

### 2. Page Saving (Write Operations)

**Update Existing Page:**

```http
PUT /api/pages/{id}
Authorization: Token {token_id}:{token_secret}
Content-Type: application/json

{
  "markdown": "# Updated content...",
  "name": "Updated Title (optional)",
  "tags": [{"name": "tag1"}] (optional)
}
```

**Response:** JSON object with updated page

**Create New Page:**

```http
POST /api/pages
Authorization: Token {token_id}:{token_secret}
Content-Type: application/json

{
  "book_id": 123,
  "chapter_id": 456 (optional),
  "name": "New Page Title",
  "markdown": "# Content...",
  "tags": [{"name": "tag1"}] (optional)
}
```

**Response:** JSON object with created page

---

## Authentication

**Method:** Token-based authentication

**Format:**
```
Authorization: Token {token_id}:{token_secret}
```

**Credential Management:**
- BookStack URL: Configured in `.env` (admin-managed, team-wide)
- Token ID & Secret: Per-user credentials stored in Flask session
- Session duration: 24 hours
- Security: Backend proxy pattern (credentials never exposed to frontend)

**Example:**
```bash
# Admin configures in .env
BOOKSTACK_URL=https://bookstack.example.com

# User enters credentials in UI
Token ID: AbCd1234EfGh5678
Token Secret: IjKl9012MnOp3456
```

---

## Bidirectional Sync Flow

### Loading a Page for Editing

```
User clicks page in BookStack browser
    ↓
Frontend: GET /api/bookstack/pages/{id}
    ↓
Backend:
  1. GET BookStack /api/pages/{id} (metadata)
  2. Try GET BookStack /api/pages/{id}/export/markdown ✅
     - Success → Use native markdown
     - Fail (404/403) → Fallback to HTML conversion
    ↓
Frontend: Load markdown into editor
    ↓
User edits content
```

### Saving Changes Back to BookStack

```
User clicks Save (Ctrl+S)
    ↓
Frontend: PUT /api/bookstack/pages/{id}
Body: {
  "markdown": "...",
  "updated_at": "2025-12-20T10:30:00Z"
}
    ↓
Backend:
  1. Check for conflicts (compare updated_at)
  2. If conflict → Return conflict warning
  3. If no conflict or overwrite → PUT BookStack /api/pages/{id}
    ↓
BookStack: Update page with new markdown
    ↓
Frontend: Show success toast
```

---

## Conflict Detection

The application implements timestamp-based conflict detection:

1. **On Load:** Store page's `updated_at` timestamp
2. **On Save:** Send original `updated_at` to backend
3. **Backend Check:** Compare with current BookStack timestamp
4. **Conflict Handling:**
   - No conflict → Save proceeds
   - Conflict detected → User chooses:
     - Cancel (don't save)
     - Overwrite (force save)
     - Merge (future feature)

**Example:**

```javascript
// User A loads page at 10:00 AM
page = { updated_at: "2025-12-25T10:00:00Z" }

// User B edits and saves at 10:15 AM
// BookStack updated_at now: "2025-12-25T10:15:00Z"

// User A tries to save at 10:30 AM
PUT /api/bookstack/pages/123
{
  "markdown": "My changes...",
  "updated_at": "2025-12-25T10:00:00Z"  // Original timestamp
}

// Backend detects: 10:00:00 ≠ 10:15:00 → CONFLICT!
// Returns: { conflict: true, remote_page: {...} }
// User A sees warning and chooses action
```

---

## Error Handling

### Export Endpoint Failures

| Error | Cause | Action |
|-------|-------|--------|
| 404 Not Found | Export endpoint not available on this BookStack version | Fallback to HTML conversion |
| 403 Forbidden | User lacks export permission | Fallback to HTML conversion |
| Timeout | Network/server slow | Fallback to HTML conversion |
| Empty response | Page has no content | Fallback to HTML conversion |

**All errors are logged for monitoring:**

```
INFO: Successfully retrieved page via export/markdown endpoint
WARNING: Export endpoint not available (404) - falling back to HTML conversion
INFO: Converting HTML to Markdown (fallback method)
```

### Save Failures

| Error | Cause | Action |
|-------|-------|--------|
| 401 Unauthorized | Session expired | Prompt re-authentication |
| 403 Forbidden | Permission denied | Show error, check BookStack permissions |
| 404 Not Found | Page deleted | Show error, refresh browser |
| 409 Conflict | Page modified remotely | Show conflict dialog |
| Timeout | Network/server slow | Show error, retry option |

---

## Logging & Monitoring

The application provides detailed logging for all BookStack operations:

**Page Load:**
```
DEBUG: Attempting to fetch page using export/markdown endpoint | page_id=123
DEBUG: BookStack export API request | page_id=123 endpoint=/api/pages/123/export/markdown
DEBUG: BookStack export API response | page_id=123 status_code=200 elapsed=0.45s content_length=1234
INFO: Successfully retrieved page via export/markdown endpoint | page_id=123 markdown_length=1234
```

**Fallback:**
```
WARNING: Export endpoint not available (404) | page_id=123 - falling back to HTML conversion
INFO: Converting HTML to Markdown (fallback method) | page_id=123 html_length=5678
DEBUG: HTML conversion complete | page_id=123 markdown_length=1234
```

**Save:**
```
INFO: Updating page | page_id=123 name=My Page conflict_resolution=None
INFO: Page updated successfully | page_id=123 name=My Page
```

---

## BookStack Version Compatibility

### Export Endpoint Availability

The `/api/pages/{id}/export/markdown` endpoint was added in **BookStack v21.05**.

**Version Support:**
- ✅ **v21.05+**: Full support with native export
- ⚠️ **v0.30 - v21.04**: HTML fallback only (export unavailable)
- ❌ **< v0.30**: No API support

**Checking Your Version:**

```bash
# Via API
curl -H "Authorization: Token ID:SECRET" \
  https://bookstack.example.com/api/docs.json | jq .version

# Via UI
BookStack → Settings → About → Version
```

---

## Configuration

### Environment Variables

```bash
# Required: BookStack instance URL (admin-managed)
BOOKSTACK_URL=https://bookstack.example.com

# Optional: API timeout in seconds (default: 30)
BOOKSTACK_API_TIMEOUT=30
```

### User Setup

1. **Admin creates API token for user:**
   - BookStack → Users → [User] → API Tokens
   - Create Token → Copy Token ID & Secret

2. **User authenticates in app:**
   - Click "BookStack" button
   - Enter Token ID and Token Secret
   - Credentials stored in session (24 hours)

3. **User browses and edits:**
   - Navigate shelves/books/chapters/pages
   - Click page to load
   - Edit in editor
   - Save with Ctrl+S

---

## Best Practices

### For Administrators

1. **Use BookStack v21.05+** for optimal experience (native markdown export)
2. **Configure appropriate permissions** for API token users:
   - "Access System API" (required)
   - "Create/Edit Pages" (for editing)
   - Export permissions (for markdown export)
3. **Set token expiry** (recommend 6-12 months, then rotate)
4. **Monitor audit logs** for API usage and issues
5. **Use HTTPS** for BookStack instance (security)

### For Users

1. **Save frequently** (Ctrl+S) to avoid conflicts
2. **Check for conflicts** if working collaboratively
3. **Use "Overwrite" carefully** when conflicts occur
4. **Re-authenticate if session expires** (after 24 hours)
5. **Report issues** if export/save operations fail

---

## Troubleshooting

### "Export endpoint not available (404)"

**Cause:** BookStack version < v21.05

**Solution:**
- Upgrade BookStack to v21.05+
- Or: Accept fallback to HTML conversion (still works)

### "Export endpoint forbidden (403)"

**Cause:** User lacks export permission

**Solution:**
- Admin: Grant export permissions to user's role
- Or: Accept fallback to HTML conversion

### "Converting HTML to Markdown (fallback method)"

**Cause:** Export endpoint unavailable (normal fallback)

**Solution:**
- This is expected behavior
- Upgrade BookStack for native export
- HTML conversion still produces good results

### "Conflict detected"

**Cause:** Another user modified the page

**Solution:**
- Review changes
- Choose "Overwrite" to force save
- Or "Cancel" and refresh to see latest version

---

## API Reference

### Complete Endpoint List

**Authentication:**
```http
GET /api/docs.json                    # Validate credentials
```

**Navigation:**
```http
GET /api/shelves                      # List shelves
GET /api/shelves/{id}                 # Get shelf with books
GET /api/books                        # List books
GET /api/books/{id}                   # Get book with chapters/pages
```

**Page Operations:**
```http
GET /api/pages/{id}                   # Get page metadata
GET /api/pages/{id}/export/markdown   # Export as markdown (RECOMMENDED)
POST /api/pages                       # Create new page
PUT /api/pages/{id}                   # Update existing page
DELETE /api/pages/{id}                # Delete page
```

**Search:**
```http
GET /api/search?query=...&type=page   # Search pages
```

---

## Summary

The Markdown Viewer's BookStack integration provides:

✅ **Bidirectional Sync** - Read and write pages
✅ **Native Export** - Uses BookStack's markdown export API
✅ **Smart Fallback** - HTML conversion when export unavailable
✅ **Conflict Detection** - Prevents overwriting remote changes
✅ **Secure Authentication** - Session-based with backend proxy
✅ **Full Compatibility** - Works with BookStack v0.30+ (v21.05+ recommended)

**Key Innovation:** The dual-strategy approach (export + fallback) ensures maximum compatibility while preferring the most accurate method when available.

---

## See Also

- [BookStack API Documentation](https://demo.bookstackapp.com/api/docs)
- [README.md](../README.md) - Main project documentation
- [Implementation Plan](./chats/bookstack-integration-implementation-plan-2025-12-20.md) - Detailed implementation guide
