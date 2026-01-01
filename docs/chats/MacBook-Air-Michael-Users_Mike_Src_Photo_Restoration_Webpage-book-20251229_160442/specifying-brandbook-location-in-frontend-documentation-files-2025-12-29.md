# Claude Chat Export
**Generated: 2025-12-29 16:06:03**

---

👤 **USER:**
> help me to update CLAUDE.md to explicitly specify that you should use tmp/AI_WEB_DESIGN_SQOWE.md as brandbook for UI

I'll help you update CLAUDE.md to explicitly specify the brandbook for UI. Let me first read the current CLAUDE.md file and the brandbook file to understand the context.

Now I understand the context. I can see:
1. The current [CLAUDE.md](CLAUDE.md) structure and rules
2. The brandbook file [tmp/AI_WEB_DESIGN_SQOWE.md](tmp/AI_WEB_DESIGN_SQOWE.md) which contains comprehensive UI/design guidelines for the sqowe brand

## Proposed Solution

I'll update [CLAUDE.md](CLAUDE.md) to add a new section that explicitly specifies using [tmp/AI_WEB_DESIGN_SQOWE.md](tmp/AI_WEB_DESIGN_SQOWE.md) as the brandbook for all UI/design work. This will ensure consistency in:
- Color system (Dark Ground, Light Purple, Dark Purple, Light Grey)
- Typography (Montserrat font family)
- Component styles (buttons, cards, forms, navigation)
- Layout and spacing
- Accessibility guidelines

The update will add a clear directive in the "Before proposing or making any changes" section and/or as a standalone section to make it prominent.

**Proposed addition:**

```markdown
## UI/Design Guidelines

For all UI, frontend, and design-related work:
- Use tmp/AI_WEB_DESIGN_SQOWE.md as the official brandbook
- Follow the sqowe brand color system, typography, and component styles defined in the brandbook
- Ensure all UI implementations comply with the design guidelines and accessibility standards
```

Would you like me to proceed with updating [CLAUDE.md](CLAUDE.md) with this addition?

---

👤 **USER:**
> Suggest where to better specify this. In ARCHITECTURE.md, CLAUDE.md or AI_FRONTEND.md

Let me read the relevant files to understand their purpose and structure, then suggest the best location.

Perfect! Now I have a clear understanding of all three documents. Here's my analysis and recommendation:

## Analysis

### Current State:

1. **[ARCHITECTURE.md](ARCHITECTURE.md:94-95)** - Already mentions the brandbook:
   - Line 94: Lists `tmp/AI_WEB_DESIGN_SQOWE.md` in the directory structure
   - Line 363: References it as "sqowe brand design system (Material-inspired)"

2. **[CLAUDE.md](CLAUDE.md)** - Project workflow rules:
   - Focuses on general workflow (propose before implementing, never commit, tool usage)
   - Lists AI*.md files to follow

3. **[AI_FRONTEND.md](AI_FRONTEND.md)** - Frontend coding rules:
   - Covers tech stack, structure, conventions, styling
   - Currently only has general styling rules (CSS Modules/TailwindCSS)
   - No specific brand/design guidelines

## Recommendation: **Update AI_FRONTEND.md**

Add the brandbook reference to [AI_FRONTEND.md](AI_FRONTEND.md) because:

### ✅ Why AI_FRONTEND.md:
1. **Scope alignment** - It's specifically for frontend/UI development work
2. **Developer focus** - Developers working on UI will naturally read this file
3. **Contextual relevance** - Styling section (Section 7) is the perfect place to add brand guidelines
4. **Existing pattern** - ARCHITECTURE.md already points to AI_FRONTEND.md for frontend rules (line 361)
5. **Separation of concerns** - ARCHITECTURE.md is for architecture, AI_FRONTEND.md is for implementation rules

### ❌ Why NOT ARCHITECTURE.md:
- Already mentions it in the directory structure
- ARCHITECTURE.md is high-level, not for detailed implementation rules
- It correctly delegates to AI_FRONTEND.md for frontend-specific rules

### ❌ Why NOT CLAUDE.md:
- CLAUDE.md is about workflow/process, not technical implementation
- It already tells you to "follow AI*.md files"
- Adding specific tech rules here would mix concerns

## Proposed Change

Add a new subsection to **[AI_FRONTEND.md](AI_FRONTEND.md)**, Section 7 (Styling & Layout):

```markdown
## 7. Styling & Layout

### 7.1 Brand Guidelines (sqowe)

**IMPORTANT:** All UI/design work MUST follow the sqowe brand design system.

* **Authoritative source:** `tmp/AI_WEB_DESIGN_SQOWE.md`
* **Color palette:** Dark Ground (#222222), Light Purple (#8E88A3), Dark Purple (#5B5377), Light Grey (#B2B3B2)
* **Typography:** Montserrat font family (Light 300, Regular 400, Medium 500, Bold 700)
* **Components:** Use predefined button styles, card patterns, navigation, forms, hero sections
* **Accessibility:** Ensure WCAG AA compliance with approved color combinations

**Before implementing UI components:**
1. Read `tmp/AI_WEB_DESIGN_SQOWE.md` for complete design guidelines
2. Use CSS variables defined in the brandbook
3. Follow Material-inspired component patterns
4. Maintain brand consistency across all interfaces

### 7.2 Styling System

* Prefer one of:
  * **CSS Modules / SASS Modules**, or
  * **TailwindCSS** with sqowe design tokens
```

Would you like me to proceed with updating [AI_FRONTEND.md](AI_FRONTEND.md) with this addition?

---

👤 **USER:**
> yes update

Perfect! I've successfully updated [AI_FRONTEND.md](AI_FRONTEND.md:196-210) to explicitly specify the sqowe brandbook for UI work.

## Summary of Changes

**Updated [AI_FRONTEND.md](AI_FRONTEND.md)**:
- Added new **Section 7.1: Brand Guidelines (sqowe)** with:
  - Clear reference to [tmp/AI_WEB_DESIGN_SQOWE.md](tmp/AI_WEB_DESIGN_SQOWE.md) as the authoritative source
  - Quick reference to key brand elements (colors, typography, components)
  - Checklist for implementing UI components that enforces reading the brandbook
  - Emphasis on accessibility compliance

- Renumbered existing styling content to **Section 7.2: Styling System**

Now whenever AI assistants work on frontend/UI tasks, they will:
1. Read [AI_FRONTEND.md](AI_FRONTEND.md) (as per [CLAUDE.md](CLAUDE.md) and [ARCHITECTURE.md](ARCHITECTURE.md))
2. See the prominent brand guidelines section at the beginning of the Styling & Layout section
3. Be directed to read the complete brandbook before implementing UI components

This ensures brand consistency across all UI implementations while maintaining the proper separation of concerns across your documentation files.

