# AI.md — Web Interface Guidelines (HTML • CSS • JS • Material-inspired)

## Purpose
Instructions for AI coding assistants so the generated UI is consistent, maintainable, and Material-inspired.  
**Do not** change or “re-clean” existing files unless explicitly requested.

---

## Architecture & File Layout
- **Separation of Concerns**
  - No inline CSS or JavaScript in HTML.
  - All CSS in dedicated `.css` files; all JS in dedicated `.js` modules.
- **Suggested structure**
  ```
  /public
    index.html
  /styles
    base.css         # resets, variables, tokens
    layout.css       # grid, containers, responsive helpers
    components/      # button.css, card.css, dialog.css, etc.
    themes/          # light.css, dark.css, high-contrast.css
  /scripts
    main.js          # app bootstrap (tiny)
    router.js        # optional: hash/router
    utils/           # dom.js, format.js, fetch.js, etc.
    components/      # button.js, dialog.js (enhancements only)
  /assets            # icons, images, fonts
  ```
- **File size rule**: keep each JS file **~800 lines or less**. Split into modules when larger.

---

## Material-Inspired Design System
Follow [Material Design 3](https://m3.material.io) tokens and principles (color, elevation, motion, typography).  
Use CSS variables in `/styles/base.css` to define your design tokens.

- **Spacing & layout:** multiples of **8px**.  
- **Elevation:** use `box-shadow` tokens for hierarchy.  
- **Motion:** subtle transitions with standard easing.  
- **Typography:** consistent scale; minimal font variations.

---

## HTML Guidelines
- Semantic HTML5 (`header`, `nav`, `main`, `section`, `footer`).
- Accessibility first: label controls, `aria-*` where needed, maintain focus states.
- No inline styles/scripts; reference external files only.
- Follow **BEM** or similar naming convention (`card__header`, `card--elevated`).

---

## CSS Guidelines
- **Structure:** `base` → `layout` → `components` → `utilities`.
- Use classes, not IDs. Keep selectors shallow.
- Each component gets its own `.css` (and optional `.js`).
- States: `:hover`, `:focus-visible`, `.is-active`, `.is-disabled`.
- Add dark mode overrides via `[data-theme="dark"]`.

---

## JavaScript Guidelines
- Use ES modules (`type="module"`).
- Keep each file **~800 lines or less**; split large scripts into modules.
- Progressive enhancement: JS adds behavior on top of functional HTML/CSS.
- Avoid unnecessary dependencies; justify new ones in comments.
- Use `/scripts/utils/` for helpers.
- Prefer event delegation and clean DOM queries.

---

## Accessibility
- All interactive elements are keyboard reachable and have visible focus.
- Maintain sufficient color contrast (WCAG AA+).
- Manage focus for dialogs/menus; return focus to opener on close.

---

## Performance & Quality
- Load minimal JS; defer non-critical scripts.
- Minify in production; keep source maps for debugging.
- Configure ESLint, Stylelint, and Prettier for consistency.

---

## Theming
- Light/Dark via `data-theme` on `html` or `body`.
- Respect `prefers-color-scheme` where possible.

---

## Security & Secrets
- Never embed secrets or tokens in HTML/JS.
- Use environment variables or server-side config injection.
- Sanitize all dynamic HTML content.

---

## Design Reference Sources
When generating UI or styling decisions, take visual and structural cues from:

- [Material Design 3](https://m3.material.io) — official color, elevation, motion system.
- [Materialize CSS](https://materializecss.com) — clean HTML/CSS patterns.
- [MUI](https://mui.com/material-ui) — layout proportions and modern Material components.
- [HTML5UP](https://html5up.net) — semantic responsive HTML structure.
- [Material Tailwind](https://www.material-tailwind.com/) — modern spacing and typography ideas.

Use these sources **for inspiration only**, not for direct code import.
Maintain our internal rules: **no inline CSS/JS** and keep JS files **~800 lines**.

---

## Summary
- **Material-inspired**: tokens, 8px spacing, elevation, subtle motion.
- **Strict separation**: HTML • CSS • JS (no inline).
- **Small modules**: JS files ~800 lines max.
- **Accessible**: focus states, contrast, keyboard support.
- **Respect existing cleaned files**: no unsolicited refactors.
