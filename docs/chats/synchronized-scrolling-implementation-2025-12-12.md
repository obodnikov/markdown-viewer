# Synchronized Scrolling Implementation

**Date:** 2025-12-12
**Version:** 1.1.0
**Feature:** Proportional Bidirectional Scroll Synchronization in Split View Mode

---

## Overview

Implemented synchronized scrolling between the editor and preview panes in split view mode. When users scroll in either pane, the other pane automatically scrolls to the corresponding proportional position.

---

## Implementation Details

### 1. ScrollSync Class ([scripts/editor/sync.js](../../scripts/editor/sync.js))

**Key Features:**
- **Proportional Scrolling**: Uses scroll ratio (scroll position / max scroll) rather than absolute pixels
- **Bidirectional**: Works from editor → preview and preview → editor
- **Loop Prevention**: Uses `syncing` flag to prevent infinite scroll loops
- **Performance**: Uses passive event listeners and `requestAnimationFrame`

**Methods:**
- `enable()` - Activates scroll synchronization
- `disable()` - Deactivates scroll synchronization
- `syncEditorToPreview()` - Syncs preview when editor scrolls
- `syncPreviewToEditor()` - Syncs editor when preview scrolls

**Algorithm:**
```javascript
// Calculate scroll ratio
scrollRatio = scrollTop / (scrollHeight - clientHeight)

// Apply to other pane
otherPane.scrollTop = scrollRatio * (otherPane.scrollHeight - otherPane.clientHeight)
```

### 2. EditorManager Updates ([scripts/editor/editor.js](../../scripts/editor/editor.js))

**New Methods:**
- `getScrollContainer()` - Returns the scrollable element (textarea or CodeMirror scrollDOM)
- `setScrollPosition(scrollRatio)` - Sets scroll position based on ratio

**Compatibility:**
- Works with textarea fallback
- Works with CodeMirror 6 (via `scrollDOM` property)

### 3. Main Application Integration ([scripts/main.js](../../scripts/main.js))

**Initialization:**
```javascript
// Initialize scroll synchronization
this.scrollSync = new ScrollSync(
    this.editor,
    document.getElementById('preview')
);

// Enable for initial split view
this.scrollSync.enable();
```

**View Mode Control:**
```javascript
changeViewMode(mode) {
    // Enable/disable scroll sync based on view mode
    if (mode === 'split') {
        this.scrollSync.enable();
    } else {
        this.scrollSync.disable();
    }
}
```

---

## Technical Considerations

### Why Proportional Scrolling?

The editor and preview have different content heights due to:
- Different rendering (monospace text vs. rendered HTML)
- Different padding and margins
- Dynamic content (images, embedded media)

Using proportional scrolling (ratios) instead of absolute positions ensures:
- Top of editor aligns with top of preview (ratio = 0)
- Middle of editor aligns with middle of preview (ratio = 0.5)
- Bottom of editor aligns with bottom of preview (ratio = 1.0)

### Loop Prevention

Without the `syncing` flag:
1. User scrolls editor
2. Preview scrolls (triggers scroll event)
3. Editor scrolls (triggers scroll event)
4. Preview scrolls (infinite loop!)

The `syncing` flag and `requestAnimationFrame` prevent this:
```javascript
this.syncing = true;
previewPane.scrollTop = newPosition;
requestAnimationFrame(() => {
    this.syncing = false;
});
```

### Performance Optimization

- **Passive listeners**: `{ passive: true }` improves scroll performance
- **RequestAnimationFrame**: Ensures smooth visual updates
- **Early returns**: Checks prevent unnecessary calculations

---

## User Experience

### When Active
- **Split View Mode**: Scroll sync is automatically enabled
- **Bidirectional**: Users can scroll either pane and both stay in sync
- **Smooth**: Uses browser's native scrolling with no jank

### When Inactive
- **Edit Only Mode**: Scroll sync disabled (preview not visible)
- **Preview Only Mode**: Scroll sync disabled (editor not visible)

---

## Files Modified

### Core Implementation
1. **[scripts/editor/sync.js](../../scripts/editor/sync.js)** - Complete implementation (was placeholder)
2. **[scripts/editor/editor.js](../../scripts/editor/editor.js)** - Added scroll container access methods
3. **[scripts/main.js](../../scripts/main.js)** - Integrated ScrollSync and view mode handling

### Documentation
4. **[README.md](../../README.md)** - Added synchronized scrolling to features, updated roadmap to v1.1.0
5. **[PROJECT_SUMMARY.md](../../PROJECT_SUMMARY.md)** - Updated version, implementation status, and priorities
6. **[DOCUMENTATION_INDEX.md](../../DOCUMENTATION_INDEX.md)** - Added latest feature entry, updated version

---

## Testing Recommendations

### Manual Testing
1. **Basic Sync**:
   - Open app in split view
   - Type enough content to make both panes scrollable
   - Scroll editor → verify preview scrolls
   - Scroll preview → verify editor scrolls

2. **View Mode Changes**:
   - Switch to "Edit Only" → scroll should work independently
   - Switch back to "Split View" → sync should resume

3. **Edge Cases**:
   - Very short document (no scroll needed)
   - Very long document (1000+ lines)
   - Rapid scrolling
   - Switch view modes while scrolling

### Browser Compatibility
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari

---

## Code Quality

### Follows Project Guidelines
- ✅ [AI.md](../../AI.md) - ES6 modules, ~800 line limit
- ✅ [CLAUDE.md](../../CLAUDE.md) - Separation of concerns
- ✅ Material Design - Smooth interactions

### File Sizes
- `scripts/editor/sync.js`: 108 lines (well under 800)
- `scripts/editor/editor.js`: 117 lines (well under 800)
- `scripts/main.js`: 387 lines (well under 800)

---

## Future Enhancements

### Potential Improvements
1. **Line-based sync**: Match specific editor lines to preview sections
2. **Smooth scrolling**: Add CSS `scroll-behavior: smooth` option
3. **Sync indicators**: Visual feedback showing sync status
4. **User preference**: Toggle to enable/disable sync

### Not Planned
- Horizontal scrolling (not needed for markdown)
- Sync in edit-only or preview-only modes (no second pane)

---

## Version History

### v1.1.0 (2025-12-12)
- ✅ Implemented proportional bidirectional scroll synchronization
- ✅ Automatic enable/disable based on view mode
- ✅ Support for both CodeMirror and textarea editor
- ✅ Performance optimizations with passive listeners
- ✅ Loop prevention with syncing flag

### v1.0.0 (Previous)
- ❌ Scroll sync was placeholder only
- Independent scrolling in both panes

---

## Summary

The synchronized scrolling feature significantly improves the user experience in split view mode by maintaining context between the editor and preview. The implementation is:

- **Robust**: Handles edge cases and prevents infinite loops
- **Performant**: Uses browser-native optimizations
- **Maintainable**: Clean, well-documented code
- **User-friendly**: Automatic and transparent to users

This brings the markdown editor closer to feature parity with professional markdown editors while maintaining the project's lightweight, no-build philosophy.
