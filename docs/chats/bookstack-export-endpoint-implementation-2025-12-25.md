# BookStack Export Endpoint Implementation

**Date:** 2025-12-25
**Version:** 1.4.1
**Status:** ✅ Implemented

---

## Summary

Updated the BookStack integration to use the recommended `/api/pages/{id}/export/markdown` endpoint for loading pages, with smart fallback to HTML→Markdown conversion if the export endpoint is unavailable.

---

## Problem Statement

The initial implementation was not aligned with the BookStack API best practices:

- ❌ **Previous:** Used `GET /api/pages/{id}` and manually converted HTML to Markdown
- ✅ **Correct:** Use `GET /api/pages/{id}/export/markdown` for native markdown export
- ⚠️ **Issue:** Export endpoint not available on all BookStack versions (added in v21.05)

---

## Solution

Implemented a **dual-strategy approach** with automatic fallback:

### Strategy 1: Native Export (Primary)

```python
GET /api/pages/{id}/export/markdown
```

**Advantages:**
- Native markdown from BookStack
- Most accurate conversion
- Preserves BookStack-specific formatting
- Purpose-built for markdown extraction

### Strategy 2: HTML Conversion (Fallback)

```python
GET /api/pages/{id}
# Convert HTML to Markdown using html2text
```

**When Used:**
- Export endpoint returns 404 (not available)
- Export endpoint returns 403 (permission denied)
- Export endpoint times out
- Export returns empty content
- BookStack version < v21.05

---

## Implementation Details

### Updated Method: `get_page()`

**Location:** [backend/services/bookstack_service.py:198-246](../../backend/services/bookstack_service.py)

**Logic Flow:**

```python
def get_page(page_id):
    # 1. Get page metadata (always needed)
    page = GET /api/pages/{id}

    # 2. Try native export endpoint
    try:
        markdown = _export_markdown(page_id)
        if markdown and len(markdown.strip()) > 0:
            page['markdown'] = markdown
            return page  # Success!
    except HTTPError as e:
        if e.status_code == 404:
            log("Export not available - fallback")
        elif e.status_code == 403:
            log("Export forbidden - fallback")
        else:
            log(f"Export failed {e.status_code} - fallback")
    except Exception as e:
        log(f"Export error - fallback")

    # 3. Fallback: HTML → Markdown
    if page['html'] and not page['markdown']:
        page['markdown'] = html_to_markdown(page['html'])

    return page
```

### New Method: `_export_markdown()`

**Location:** [backend/services/bookstack_service.py:248-299](../../backend/services/bookstack_service.py)

**Purpose:** Handle plain text response from export endpoint

```python
def _export_markdown(page_id):
    """Export page as markdown using BookStack's export endpoint."""

    url = f'{base_url}/api/pages/{page_id}/export/markdown'

    response = requests.get(
        url=url,
        headers=auth_headers,
        timeout=timeout
    )

    response.raise_for_status()

    # Export returns plain text, not JSON
    return response.text
```

**Key Difference:** Export endpoint returns **plain text**, not JSON.

---

## Logging & Monitoring

### Success Case

```
DEBUG: Attempting to fetch page using export/markdown endpoint | page_id=123
DEBUG: BookStack export API request | page_id=123 endpoint=/api/pages/123/export/markdown
DEBUG: BookStack export API response | page_id=123 status_code=200 elapsed=0.45s content_length=1234
INFO: Successfully retrieved page via export/markdown endpoint | page_id=123 markdown_length=1234
```

### Fallback Case

```
DEBUG: Attempting to fetch page using export/markdown endpoint | page_id=123
WARNING: Export endpoint not available (404) | page_id=123 - falling back to HTML conversion
INFO: Converting HTML to Markdown (fallback method) | page_id=123 html_length=5678
DEBUG: HTML conversion complete | page_id=123 markdown_length=1234
```

**Benefits:**
- Clear visibility into which method was used
- Performance metrics (elapsed time, content length)
- Easy troubleshooting and debugging
- Monitor export endpoint availability

---

## Testing Scenarios

### Scenario 1: BookStack v21.05+ (Export Available)

**Input:** `get_page(123)`

**Expected:**
1. ✅ Fetch metadata via `GET /api/pages/123`
2. ✅ Try export via `GET /api/pages/123/export/markdown`
3. ✅ Export succeeds → Use native markdown
4. ✅ Return page with markdown content

**Log:**
```
INFO: Successfully retrieved page via export/markdown endpoint | page_id=123
```

### Scenario 2: BookStack v0.30-v21.04 (Export Unavailable)

**Input:** `get_page(123)`

**Expected:**
1. ✅ Fetch metadata via `GET /api/pages/123`
2. ✅ Try export via `GET /api/pages/123/export/markdown`
3. ❌ Export returns 404
4. ✅ Fallback to HTML conversion
5. ✅ Return page with converted markdown

**Log:**
```
INFO: Export endpoint not available (404) | page_id=123 - falling back to HTML conversion
INFO: Converting HTML to Markdown (fallback method) | page_id=123
```

### Scenario 3: Permission Denied

**Input:** `get_page(123)` with user lacking export permission

**Expected:**
1. ✅ Fetch metadata via `GET /api/pages/123`
2. ✅ Try export via `GET /api/pages/123/export/markdown`
3. ❌ Export returns 403
4. ✅ Fallback to HTML conversion
5. ✅ Return page with converted markdown

**Log:**
```
WARNING: Export endpoint forbidden (403) | page_id=123 - falling back to HTML conversion
INFO: Converting HTML to Markdown (fallback method) | page_id=123
```

### Scenario 4: Empty Export Response

**Input:** `get_page(123)` for page with no content

**Expected:**
1. ✅ Fetch metadata via `GET /api/pages/123`
2. ✅ Try export via `GET /api/pages/123/export/markdown`
3. ⚠️ Export returns empty string
4. ✅ Fallback to HTML conversion
5. ✅ Return page (possibly with empty markdown)

**Log:**
```
WARNING: Export endpoint returned empty content | page_id=123
INFO: Converting HTML to Markdown (fallback method) | page_id=123
```

---

## Documentation Updates

### Files Updated

1. ✅ **[backend/services/bookstack_service.py](../../backend/services/bookstack_service.py)**
   - Updated `get_page()` method with dual strategy
   - Added `_export_markdown()` helper method
   - Enhanced logging throughout

2. ✅ **[README.md](../../README.md)**
   - Added mention of native markdown export
   - Updated BookStack integration description
   - Added bidirectional sync details

3. ✅ **[CHANGELOG.md](../../CHANGELOG.md)**
   - Added v1.4.1 release notes
   - Documented export endpoint usage
   - Listed documentation updates

4. ✅ **[DOCUMENTATION_INDEX.md](../../DOCUMENTATION_INDEX.md)**
   - Added BookStack integration section
   - Updated latest features list
   - Added quick reference links
   - Updated version to 1.4.1

5. ✅ **[docs/BOOKSTACK_API_INTEGRATION.md](../BOOKSTACK_API_INTEGRATION.md)** (NEW)
   - Comprehensive BookStack API integration guide
   - Detailed endpoint documentation
   - Bidirectional sync flow diagrams
   - Error handling and troubleshooting
   - BookStack version compatibility matrix
   - Configuration examples

6. ✅ **[docs/chats/bookstack-integration-implementation-plan-2025-12-20.md](./bookstack-integration-implementation-plan-2025-12-20.md)**
   - Updated `get_page()` method description
   - Added strategy notes

---

## Benefits

### 1. Accuracy

✅ Native markdown export is more accurate than HTML conversion
✅ Preserves BookStack-specific formatting
✅ Handles edge cases better

### 2. Compatibility

✅ Works with BookStack v0.30+ (all versions with API)
✅ Graceful degradation for older versions
✅ Handles permission issues gracefully

### 3. Performance

✅ Reduced processing (no HTML conversion when export works)
✅ Detailed performance logging (elapsed time tracking)
✅ Faster page loading on supported BookStack versions

### 4. Reliability

✅ Multiple fallback mechanisms
✅ Comprehensive error handling
✅ Clear logging for troubleshooting

### 5. Maintainability

✅ Aligned with BookStack best practices
✅ Future-proof (uses recommended endpoint)
✅ Well-documented code and strategy

---

## Version Compatibility

| BookStack Version | Export Endpoint | Strategy Used | Works? |
|-------------------|----------------|---------------|--------|
| **v21.05+** | ✅ Available | Native Export | ✅ Yes |
| **v0.30 - v21.04** | ❌ Not Available | HTML Fallback | ✅ Yes |
| **< v0.30** | ❌ No API | N/A | ❌ No |

**Recommendation:** Upgrade to BookStack v21.05+ for optimal experience.

---

## Migration Notes

### For Existing Users

**No action required.** The update is backward compatible:

- ✅ Existing functionality preserved
- ✅ Automatic detection and fallback
- ✅ No configuration changes needed
- ✅ Existing saved pages work unchanged

### For New Deployments

**Recommended:**

1. Use BookStack v21.05+ for best experience
2. Grant users export permissions
3. Monitor logs to verify export endpoint usage
4. Check BOOKSTACK_URL configuration in `.env`

---

## Future Enhancements

### Potential Improvements

1. **Cache Export Capability**
   - Detect once per session if export is available
   - Skip export attempt if known to be unavailable
   - Reduces unnecessary API calls

2. **User Notification**
   - Show toast when using fallback
   - "Using HTML conversion (upgrade BookStack for better results)"
   - One-time notification per session

3. **Admin Dashboard**
   - Show BookStack version detected
   - Display export endpoint availability
   - Track usage statistics (export vs fallback ratio)

4. **Export Format Options**
   - Allow user to choose export format
   - HTML export for rich formatting
   - Plain text export for simple content
   - PDF export for archival

---

## Testing Checklist

### Manual Testing

- [x] Test with BookStack v21.05+ (export available)
- [x] Test with BookStack v20.x (export unavailable)
- [x] Test with permission denied (403)
- [x] Test with network timeout
- [x] Test with empty page content
- [x] Verify logging output
- [x] Verify fallback behavior
- [x] Check error handling

### Automated Testing

**Future:** Add unit tests for:
- `get_page()` success case (export works)
- `get_page()` fallback case (export fails)
- `_export_markdown()` plain text handling
- Error handling for various HTTP codes
- Empty content handling

---

## Conclusion

The implementation successfully aligns with BookStack API best practices while maintaining backward compatibility:

✅ **Primary Strategy:** Uses recommended `/api/pages/{id}/export/markdown` endpoint
✅ **Fallback Strategy:** HTML→Markdown conversion for older versions
✅ **Comprehensive Logging:** Track which method is used and why
✅ **Error Handling:** Graceful degradation for all failure scenarios
✅ **Documentation:** Complete guide and troubleshooting information
✅ **Testing:** Verified across multiple scenarios

**Result:** Robust, future-proof BookStack integration that works with all supported BookStack versions.

---

## References

- [BookStack API Documentation](https://demo.bookstackapp.com/api/docs)
- [BookStack API Changelog](https://github.com/BookStackApp/BookStack/blob/development/dev/api/responses.md)
- [Export Endpoint Release Notes](https://github.com/BookStackApp/BookStack/releases/tag/v21.05) (v21.05)
- [BOOKSTACK_API_INTEGRATION.md](../BOOKSTACK_API_INTEGRATION.md) - Complete integration guide
- [Implementation Plan](./bookstack-integration-implementation-plan-2025-12-20.md) - Original implementation

---

**Implementation Complete:** 2025-12-25
**Status:** ✅ Production Ready
**Version:** 1.4.1
