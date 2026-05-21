# Claude Chat Export
**Generated: 2026-04-25 09:06:11**

I will follow these instructions.

---

👤 **USER:**
> Check screenshot I provided. Make text "Restore Markdown Format" aligned left as text on rest buttons

Let me find the relevant UI file for this button. The "Restore Markdown Format" button text is centered while the other buttons have left-aligned text with icons.

Now let me look at the HTML and CSS to understand the current styling:

I see the issue. The `.sidebar__action` uses `display: flex` with `align-items: center` and `gap`, which should left-align the text. But looking at the screenshot, the "Restore Markdown Format" text is wrapping and centering. There's likely a `text-align: center` somewhere, or the button text is centering because the label doesn't have `text-align: left` explicitly set.

The fix is simple: add `text-align: left` to `.action__label` to ensure the text stays left-aligned even when it wraps.

Here's what I'd change in `styles/components/sidebar.css`:

Add `text-align: left;` to the `.action__label` rule so the wrapped text stays left-aligned like the other buttons.

Ready to proceed?

---

👤 **USER:**
> yes add

Done. Added `text-align: left` to `.action__label` so the "Restore Markdown Format" text aligns left when it wraps, matching the other buttons.

---

👤 **USER:**
> suggest commit message

```
fix: align sidebar action label text to left on wrap
```

