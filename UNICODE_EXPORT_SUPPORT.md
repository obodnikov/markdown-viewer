# Unicode Export Support

This document explains how the Markdown Viewer handles Unicode characters (including emojis, special symbols, and non-Latin scripts) when exporting to different formats.

## Summary

All export formats are Unicode-based; for PDF, what appears depends on the font.
- PDF: Uses XeLaTeX engine; a character appears only if the configured font has it
- DOCX: Native Office Open XML Unicode support
- HTML: UTF-8 encoding handles all Unicode
- Markdown: UTF-8 encoding (no conversion needed)

---

## PDF Export with XeLaTeX

### What Changed

**Previous (caused errors):**
```python
# Used default pdflatex engine
pandoc --from=gfm --to=pdf
```

**Current (Unicode input, fonts chosen by configuration):**
```python
# Uses XeLaTeX engine by default, with the configured fonts
pandoc --from=gfm --to=pdf --pdf-engine=xelatex \
  -V mainfont="Times New Roman" -V monofont=Menlo
```

### Why XeLaTeX?

| Engine | Unicode Support | Speed | Notes |
|--------|----------------|-------|-------|
| **pdflatex** (old) | ❌ Limited | ⚡⚡ Fastest | Fails on Unicode chars like █, ●, emojis |
| **XeLaTeX** (new) | ✅ Reads all UTF-8 | ⚡ Fast | Shows a character only if the font has it |
| **LuaLaTeX** | ✅ Reads all UTF-8 | ⚡ Medium | Alternative; not tested with the app's defaults |

### Supported Characters

XeLaTeX accepts any character but can only print what the font contains. Pandoc's default
font has no Cyrillic, so the app sets its own fonts: see "PDF Export Configuration" in
[CONFIGURATION.md](CONFIGURATION.md). Measured coverage of the default fonts:

| Characters | Times New Roman + Menlo (macOS) | Liberation (Docker) |
|------------|--------------------------------|---------------------|
| Latin, Cyrillic, Greek | ✅ | ✅ |
| Box drawing: █ ▓ ▒ ░ ┌ ┐ └ ┘ | ✅ | ✅ |
| Bullets: ● ○ ■ □ ▪ ▫ | ✅ | ✅ |
| Arrows: → ← ↑ ↓ | ✅ | ✅ |
| Arrows: ⇒ ⇐ | ❌ | ❌ |
| Math: ∑ ∫ ∞ ≈ ≠ ≤ ≥ √ | ✅ | ✅ |
| Currency: € £ ¥ | ✅ | ✅ |
| Currency: ₹ ₽ | ❌ | ❌ |
| Chinese, Japanese, Korean | ❌ | ❌ |
| Emoji | ❌ | ❌ |

Arabic and Hebrew letters are not listed: right-to-left text is not set up, so their
layout has not been checked.

A character the font lacks is left out of the PDF. The export still succeeds, the app shows
a warning, and the backend log lists the characters. To include them, set a font that
has them in Main Font and Code Font (`PDF_MAIN_FONT`, `PDF_MONO_FONT`).

### Error That Was Fixed

**Before (with pdflatex):**
```
! LaTeX Error: Unicode character █ (U+2588) not set up for use with LaTeX.
See the LaTeX manual or LaTeX Companion for explanation.
Type H for immediate help.
```

**After (with XeLaTeX):**
```
✅ PDF generated; characters the font lacks are left out and reported as a warning
```

---

## DOCX Export

### Native Unicode Support

DOCX format uses **Office Open XML** which has native Unicode support. No special configuration needed.

**Supported:**
- ✅ All Unicode characters
- ✅ Emojis (rendered if font supports them)
- ✅ Non-Latin scripts
- ✅ Special symbols
- ✅ Box drawing characters

**How it works:**
```python
# pandoc automatically handles Unicode in DOCX
pandoc --from=gfm --to=docx
# All UTF-8 characters are preserved
```

### Font Considerations

Microsoft Word will use the document's default font. If a character is not available in the font:
- Word will automatically substitute with a compatible font
- Most modern systems have good Unicode font coverage
- Fallback fonts ensure characters display correctly

---

## HTML Export

### UTF-8 Encoding

HTML export uses UTF-8 encoding which supports all Unicode characters.

**Implementation:**
```python
# pandoc outputs UTF-8 HTML
pandoc --from=gfm --to=html5
# Result includes: <meta charset="UTF-8">
```

**Supported:**
- ✅ All Unicode characters
- ✅ Proper HTML entity encoding
- ✅ Browser compatibility

---

## Configuration Options

### PDF Engine Selection

You can override the PDF engine if needed:

**Python API:**
```python
export_service.to_pdf(
    markdown_content,
    options={
        'pdf_engine': 'xelatex',  # Default
        # or 'lualatex' for alternative
        # or 'pdflatex' for legacy (not recommended)
    }
)
```

**Frontend API:**
```javascript
// Default uses XeLaTeX automatically
APIClient.post('/api/export/pdf', {
    content: markdownText,
    options: {
        pdf_engine: 'xelatex'  // Optional override
    }
})
```

### Default Settings

The engine and fonts come from the environment or the desktop app's Settings: see
"PDF Export Configuration" in [CONFIGURATION.md](CONFIGURATION.md). The frontend asks
for A4 paper.

---

## Testing Unicode Support

### Test Characters

Use this test document to verify Unicode support:

```markdown
# Unicode Test Document

## Latin Scripts
Hello World! ABCDEFGHIJKLMNOPQRSTUVWXYZ

## Non-Latin Scripts
- **Chinese**: 你好世界 中文测试
- **Japanese**: こんにちは世界 日本語テスト
- **Korean**: 안녕하세요 세계
- **Arabic**: مرحبا بالعالم
- **Russian**: Привет мир
- **Greek**: Γεια σου κόσμε

## Special Characters
### Box Drawing
█ ▓ ▒ ░ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼

### Bullets & Symbols
● ○ ■ □ ▪ ▫ → ← ↑ ↓ ⇒ ⇐

### Emojis
😀 😎 🎉 🚀 ✨ ⚠️ ❌ ✅ 🔥 💯

### Math
∑ ∫ ∞ ≈ ≠ ≤ ≥ √ ∂ ∆

### Currency
$ € £ ¥ ₹ ₽
```

### Expected Results

| Format | Result | Notes |
|--------|--------|-------|
| PDF | Characters the font covers are visible; the rest are reported in a warning | See the coverage table above |
| DOCX | ✅ All characters visible | Word handles Unicode natively |
| HTML | ✅ All characters visible | UTF-8 encoding preserves all |

---

## Troubleshooting

### PDF Export: "PDF engine 'xelatex' not found"

**Cause:** XeLaTeX is not installed, or the app cannot find it. A packaged desktop app
does not get your shell's `PATH`.

**Solution:** Verify XeLaTeX is installed, then set its full path if needed:
```bash
# Check XeLaTeX availability and location
which xelatex
xelatex --version

# Docker: Already included (texlive-xetex)
# Manual install:
# Ubuntu: sudo apt-get install texlive-xetex
# macOS: brew install --cask mactex
```
In the desktop app, use Settings → PDF Export → PDF Engine Path. Elsewhere, set `PDF_ENGINE`.

### PDF Export: "PDF font ... not found"

**Cause:** Main Font or Code Font names a font the system does not have.

**Solution:** Correct the name in Settings → PDF Export (`PDF_MAIN_FONT`, `PDF_MONO_FONT`),
or clear the field to use the default. The app does not replace a missing font on its
own, because another font could silently lose text.

### PDF: Some text or symbols are missing

**Cause:** The font does not have those characters. The app shows a warning after the export.

**Solution:** Choose a font that has them; the backend log lists the missing characters.

### PDF: `[SVG image: ...]` instead of a picture

**Cause:** The SVG converter was not found.

**Solution:** Install it (`brew install librsvg`, or `sudo apt-get install librsvg2-bin`).
If it is installed in an unusual place, set Settings → PDF Export → SVG Converter Path
(`RSVG_CONVERT_PATH`).

### DOCX: Characters show as boxes

**Symptom:** Some characters display as □ or ?

**Cause:** Missing fonts in Microsoft Word

**Solution:**
1. Install font with Unicode coverage (e.g., Noto Sans, Arial Unicode MS)
2. Word will automatically substitute fonts for missing glyphs
3. Most modern systems have sufficient coverage by default

### HTML: Characters not displaying

**Symptom:** Weird characters or question marks in browser

**Cause:** Incorrect encoding detection

**Solution:**
1. Ensure `<meta charset="UTF-8">` is in HTML head (pandoc includes this by default)
2. Serve HTML with `Content-Type: text/html; charset=utf-8` header
3. Clear browser cache and reload

---

## Technical Details

### Dependencies

**Docker (Dockerfile):**
```dockerfile
RUN apt-get install -y \
    pandoc \
    texlive-xetex \              # Includes XeLaTeX
    texlive-fonts-recommended \
    texlive-plain-generic \
    fonts-liberation \           # Default PDF fonts, with Cyrillic
    librsvg2-bin                 # rsvg-convert, for SVG images
```

**Manual Install:**
```bash
# Ubuntu/Debian
sudo apt-get install pandoc texlive-xetex texlive-fonts-recommended fonts-liberation librsvg2-bin

# macOS
brew install pandoc librsvg
brew install --cask mactex  # Full TeX distribution with XeLaTeX

# Windows
choco install pandoc miktex rsvg-convert  # MiKTeX includes XeLaTeX
```

### Pandoc Command Details

**PDF with XeLaTeX:**
```bash
pandoc \
  --from=gfm \                    # GitHub Flavored Markdown
  --to=pdf \                      # Output format
  --pdf-engine=xelatex \          # Unicode-capable engine
  --lua-filter=prepare_images.lua \ # Prepares images before LaTeX runs
  -V mainfont="Times New Roman" \ # Font for text; must have the document's characters
  -V monofont=Menlo \             # Font for code
  -V papersize=A4 \               # Paper size variable
  -V margin-top=1in \             # Margin settings
  input.md -o output.pdf
```

**DOCX:**
```bash
pandoc \
  --from=gfm \                    # GitHub Flavored Markdown
  --to=docx \                     # Office Open XML format
  input.md -o output.docx
# Unicode handled automatically by Office Open XML
```

---

## Performance Notes

### XeLaTeX vs pdflatex

| Metric | pdflatex | XeLaTeX | Difference |
|--------|----------|---------|------------|
| **Compilation time** | ~2-3 sec | ~3-4 sec | +33% slower |
| **Unicode support** | Limited | Full | Worth it! |
| **Font handling** | Type 1 only | OTF/TTF/Type 1 | Better |
| **Output quality** | Good | Excellent | Superior |

**Verdict:** The small performance hit is worth the Unicode input and better quality output.

### Optimization Tips

For large documents (>100 pages):
1. Consider splitting into chapters
2. Use `--pdf-engine=lualatex` for better handling of very large docs
3. Increase timeout in nginx.conf (already set to 600s)

---

## Summary

**PDF Export:** Latin and Cyrillic work with the default fonts; choose another font for other characters
✅ **DOCX Export:** Native Unicode support (Office Open XML)
✅ **HTML Export:** Full UTF-8 support (no issues)

---

## Related Documentation

- [README.md](README.md) - General application documentation
- [backend/services/export_service.py](backend/services/export_service.py) - Export implementation
- [Dockerfile](Dockerfile) - LaTeX dependencies included
- [pandoc Documentation](https://pandoc.org/MANUAL.html#pdf-engine) - PDF engine options
