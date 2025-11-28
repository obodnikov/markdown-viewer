# Editable Document Title Implementation

**Date:** 2025-11-28
**Feature:** Click-to-edit document title with integration into save/export operations

## Summary

Implemented an editable document title feature that allows users to click on the document name at the top of the page to edit it. The edited title is then used when saving files or exporting documents.

## Changes Made

### 1. New Module: `scripts/ui/editable-title.js`
Created a new `EditableTitle` class that handles:
- Click-to-edit functionality
- Inline input field for editing
- Filename sanitization (removes invalid characters: `/\:*?"<>|`)
- Modified state tracking (asterisk indicator)
- Keyboard shortcuts:
  - **Enter**: Save changes
  - **Escape**: Cancel editing
- Auto-blur to save when clicking outside

**Key Methods:**
- `setTitle(title, modified)` - Update the title and modified state
- `getTitle()` - Get current title without modified marker
- `getFilename(extension)` - Get title as filename with extension
- `setModified(modified)` - Update modified state
- `sanitizeFilename(filename)` - Remove invalid filename characters

### 2. Updated: `styles/components/toolbar.css`
Added styles for editable title:
- Hover effect on title (shows it's clickable)
- Input field styling that matches Material Design 3
- Focus state with primary color border
- Smooth transitions

**New CSS Classes:**
- `.toolbar__title:hover` - Hover effect
- `.toolbar__title-input` - Input field when editing
- `.toolbar__title-input:focus` - Focus state

### 3. Updated: `scripts/main.js`
Integrated editable title throughout the application:

**Initialization:**
- Import `EditableTitle` module
- Initialize `editableTitle` in `init()` method
- Connect to `onTitleChange` callback

**Integration Points:**
- `onTitleChange(newTitle)` - Callback when title is edited
- `updateStatus()` - Use `editableTitle.setTitle()` instead of direct DOM manipulation
- `saveFile()` - Use `editableTitle.getFilename('.md')` for filename
- `exportDocument()` - Use `editableTitle.getTitle()` for export filename
- `loadDocument()` - Clean filename (remove `.md`, `.markdown`, `.txt` extensions)

## User Experience

### Editing the Title
1. **Click** on the document title at the top of the page
2. Title becomes an editable input field (auto-selected text)
3. **Type** the new name
4. **Press Enter** or **click outside** to save
5. **Press Escape** to cancel

### Visual Feedback
- Title shows hover effect (subtle background) to indicate it's clickable
- Cursor changes to pointer on hover
- Input field appears with primary color border when editing
- Modified indicator (*) is preserved during editing

### Filename Handling
- **Invalid characters** are automatically removed: `/\:*?"<>|`
- **File extensions** are handled automatically:
  - When loading: Extension is removed from title
  - When saving: Extension `.md` is added
  - When exporting: Appropriate extension is added by export manager
- **Spaces** in title are converted to hyphens for export filenames
- **Empty titles** default to "Untitled Document"

## File Operations

### Local File Save
- Uses editable title with `.md` extension
- File System Access API suggests the filename
- User can override in save dialog

### GitHub Save
- Uses the title from loaded GitHub file
- Can be edited before saving back

### Export Operations
- **Markdown (.md)**: Uses title as-is with `.md` extension
- **HTML (.html)**: Uses title converted to lowercase with hyphens
- **PDF (.pdf)**: Uses title converted to lowercase with hyphens
- **Word (.docx)**: Uses title converted to lowercase with hyphens

## Technical Details

### File Structure
```
scripts/
└── ui/
    └── editable-title.js    # New module (133 lines)

styles/components/
└── toolbar.css              # Updated with editable styles

scripts/
└── main.js                  # Integrated editable title
```

### Code Guidelines Compliance
✅ Follows [AI.md](../../AI.md) guidelines:
- ES6 module
- File size: 133 lines (well under 800 line limit)
- No inline CSS/JS
- Material Design 3 styling
- Separation of concerns

✅ Follows [AI_FLASK.md](../../AI_FLASK.md):
- Type-safe filename handling
- Proper error handling

## Testing Checklist

### Basic Functionality
- [ ] Click on "Untitled Document" - input appears
- [ ] Type new name and press Enter - title updates
- [ ] Type new name and click outside - title updates
- [ ] Type new name and press Escape - title reverts
- [ ] Modified indicator (*) appears after editing

### Filename Sanitization
- [ ] Special characters (`/\:*?"<>|`) are removed
- [ ] Leading/trailing spaces are removed
- [ ] Empty input defaults to "Untitled Document"

### File Operations
- [ ] Open a file - title shows filename without extension
- [ ] Edit title, then save - new filename is used
- [ ] Export as MD - uses edited title with `.md`
- [ ] Export as HTML - uses edited title with `.html`
- [ ] Export as PDF - uses edited title with `.pdf`
- [ ] Export as DOCX - uses edited title with `.docx`

### Edge Cases
- [ ] Very long titles are truncated with ellipsis
- [ ] Title with only spaces defaults to "Untitled Document"
- [ ] Multiple consecutive spaces in export filename become single hyphen
- [ ] Title persists across view mode changes
- [ ] Title persists with theme toggle

## Future Enhancements

Potential improvements for future iterations:
- Persist custom titles in localStorage
- Auto-suggest title from document content (first heading)
- Title validation feedback (e.g., "Title too long")
- Double-click to edit (in addition to single click)
- Title history/undo functionality

## Related Files

- [AI.md](../../AI.md) - Frontend coding guidelines
- [README.md](../../README.md) - User documentation
- [PROJECT_SUMMARY.md](../../PROJECT_SUMMARY.md) - Project overview
