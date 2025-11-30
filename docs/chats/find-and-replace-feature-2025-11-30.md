# Find & Replace Feature Implementation

**Date:** 2025-11-30
**Feature:** Advanced Find & Replace with Regex Presets and AI-Powered Pattern Generation

## Overview

Added a comprehensive Find & Replace feature to the markdown editor with two modes:
1. **Basic Mode** - User-friendly preset patterns for common operations
2. **AI Assistant Mode** - Natural language to regex pattern generation

## Implementation Details

### Frontend Components

#### 1. Core Logic (`scripts/transforms/find-replace.js`)
- **Preset Patterns**: 11 predefined patterns including:
  - Starts with
  - Ends with
  - Contains
  - Whole word
  - Remove lines (starting/ending/containing)
  - Between (text between delimiters)
  - Empty lines
  - Multiple spaces
  - Custom RegExp

- **Key Methods**:
  - `generatePattern(presetId, input)` - Generates regex from preset
  - `findMatches(content, pattern, flags)` - Finds all matches
  - `replace(content, pattern, replacement, flags)` - Performs replacement
  - `getMatchStats(matches)` - Returns match statistics
  - `previewReplace()` - Preview before applying changes

#### 2. AI Integration (`scripts/transforms/ai-regex.js`)
- **Natural Language → Regex**: Converts descriptions to patterns
- **Pattern Explanation**: Explains what a pattern does
- **Example Generation**: Provides sample matches
- **Fallback Support**: Uses custom-prompt endpoint if dedicated endpoint unavailable

**Example Usage**:
```javascript
const aiRegex = new AIRegex();
const result = await aiRegex.generatePattern("find all email addresses");
// Returns: { pattern: "\\b[A-Za-z0-9._%+-]+@...", flags: "g", explanation: "...", examples: [...] }
```

#### 3. UI Integration (`scripts/transforms/transform-ui.js`)
- Added Find & Replace button to Text Formatting section
- Dialog with tabbed interface (Basic/AI)
- Live preview showing matches
- Context display for each match
- Event handlers for all interactions

#### 4. Styling (`styles/components/dialog.css`)
- Material Design 3 inspired styles
- Tabbed navigation
- Preview samples with highlighting
- Responsive design (mobile-friendly)
- Accessible form elements

#### 5. HTML Structure (`public/index.html`)
- New button in sidebar: 🔍 Find & Replace
- Modal dialog with two tabs
- Form fields for pattern selection, find/replace inputs
- Preview area with match statistics

### Backend Components

#### 1. API Endpoint (`backend/routes/llm.py`)
```python
POST /api/llm/generate-regex
{
  "description": "find all email addresses",
  "mode": "find"
}

Response:
{
  "success": true,
  "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
  "flags": "g",
  "explanation": "Matches email addresses",
  "examples": ["user@example.com", "name@domain.co.uk"],
  "replacement": ""
}
```

#### 2. Service Method (`backend/services/openrouter.py`)
- `generate_regex_pattern(description, mode)` - Uses LLM to generate patterns
- Optimized prompt for JSON output
- Error handling and validation
- JSON extraction from LLM response

## Feature Capabilities

### Basic Mode Presets

1. **Starts with**: Match lines beginning with text
   - Example: `#` matches all markdown headers

2. **Ends with**: Match lines ending with text
   - Example: `.` matches lines ending with period

3. **Contains**: Match text anywhere
   - Example: `TODO` finds all TODO items

4. **Whole word**: Match complete words only
   - Example: `cat` matches "cat" but not "catalog"

5. **Remove lines starting with**: Delete entire lines
   - Example: `#` removes all markdown headers

6. **Remove lines ending with**: Delete lines by ending
   - Example: `.` removes lines ending with period

7. **Remove lines containing**: Delete lines with pattern
   - Example: `DEBUG` removes all debug lines

8. **Between**: Match text between delimiters
   - Example: `**|**` matches bold text

9. **Empty lines**: Remove blank lines
   - No input needed

10. **Multiple spaces**: Replace consecutive spaces
    - Replaces with single space

11. **Custom RegExp**: Direct regex input
    - For advanced users

### AI Assistant Mode

**Examples of Natural Language Queries**:

1. "find all email addresses"
   - Generates: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`

2. "remove all markdown headers"
   - Generates: `^#{1,6}\s+.*$` with flags `gm`

3. "find phone numbers in format 123-456-7890"
   - Generates: `\d{3}-\d{3}-\d{4}`

4. "match URLs"
   - Generates: `https?://[^\s<>"]+`

5. "find all code blocks"
   - Generates: `` ```[\s\S]*?``` ``

## Usage Examples

### Example 1: Remove Comments
**Basic Mode**:
- Pattern Type: "Remove lines starting with"
- Find: `//`
- Click "Replace All"

### Example 2: Find Emails (AI)
**AI Mode**:
- Describe: "find all email addresses"
- Click "Generate Pattern"
- Review pattern and examples
- Enter replacement if needed
- Click "Apply"

### Example 3: Clean Whitespace
**Basic Mode**:
- Pattern Type: "Empty lines"
- Click "Replace All"

Then:
- Pattern Type: "Multiple spaces"
- Click "Replace All"

## Technical Specifications

### File Sizes (All under 800 lines per AI.md)
- `find-replace.js`: ~350 lines
- `ai-regex.js`: ~280 lines
- `transform-ui.js`: ~580 lines (after additions)
- Dialog CSS additions: ~200 lines

### Dependencies
- Existing: LLM client, API utilities
- New: None (pure JavaScript)

### Browser Compatibility
- Modern browsers with ES6 support
- Dialog API (polyfill available if needed)
- Regex engine (universal support)

## Testing Checklist

### Basic Mode Tests
- [x] All 11 presets generate correct patterns
- [x] Case sensitive toggle works
- [x] Preview shows correct matches
- [x] Replace All modifies content correctly
- [x] No input required for "Empty lines" and "Multiple spaces"
- [x] Custom regex input works

### AI Mode Tests
- [ ] Natural language generates valid patterns
- [ ] Pattern explanation is clear
- [ ] Examples are accurate
- [ ] Apply button works correctly
- [ ] Error handling for invalid descriptions
- [ ] Fallback to custom-prompt works

### UI/UX Tests
- [ ] Dialog opens and closes properly
- [ ] Tab switching works
- [ ] Preview updates correctly
- [ ] Match highlighting is visible
- [ ] Responsive on mobile
- [ ] Keyboard navigation works

### Integration Tests
- [ ] Backend endpoint returns valid JSON
- [ ] LLM generates working patterns
- [ ] Error messages are user-friendly
- [ ] Loading states display correctly

## Known Limitations

1. **AI Pattern Generation**:
   - Requires OpenRouter API key
   - May take 2-5 seconds for complex patterns
   - Quality depends on LLM understanding

2. **Preview**:
   - Shows max 5 sample matches
   - Large documents may be slow

3. **Browser Support**:
   - Requires modern browser with dialog API
   - Older browsers need polyfill

## Future Enhancements

1. **Advanced Features**:
   - [ ] Regex playground/tester
   - [ ] Pattern library (save favorites)
   - [ ] Find next/previous
   - [ ] Replace one-by-one
   - [ ] Undo/redo for replacements

2. **AI Improvements**:
   - [ ] Pattern validation before applying
   - [ ] Suggest improvements to user patterns
   - [ ] Multi-step transformations

3. **UX Enhancements**:
   - [ ] Keyboard shortcuts (Ctrl+F, Ctrl+H)
   - [ ] Recent patterns history
   - [ ] Export/import pattern sets

## Documentation Updates Needed

- [x] Add to README.md feature list
- [ ] Add to user guide
- [ ] Add example use cases
- [ ] Add API documentation

## Files Modified/Created

### Created:
- `scripts/transforms/find-replace.js`
- `scripts/transforms/ai-regex.js`
- `docs/chats/find-and-replace-feature-2025-11-30.md`

### Modified:
- `scripts/transforms/transform-ui.js`
- `styles/components/dialog.css`
- `public/index.html`
- `backend/routes/llm.py`
- `backend/services/openrouter.py`

## Success Criteria

✅ All code follows AI.md guidelines
✅ Files under 800 lines
✅ Material Design 3 styling
✅ No inline CSS/JS
✅ ES6 modules
✅ Relative URLs only
✅ Accessible UI
✅ Error handling
✅ Loading states

## Notes

- Feature fully integrated into existing transform panel
- Maintains consistency with other transformations
- Backend endpoint optional (falls back to custom-prompt)
- AI mode is optional enhancement, basic mode fully functional standalone
- All regex operations client-side (fast, no API calls for basic mode)
