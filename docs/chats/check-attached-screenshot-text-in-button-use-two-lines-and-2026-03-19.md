# Claude Chat Export
**Generated: 2026-03-23 15:46:49**

I will follow these instructions.

---

👤 **USER:**
> Check attached screenshot. Text in button use two lines and become ugly. Suggest shorter button name

The button text "Restore Markdown Format" wraps to two lines because it's too long. Here are some shorter alternatives that would fit on one line:

- "Restore Markdown"
- "Fix Markdown"
- "Restore Format"
- "Reformat MD"

"Restore Markdown" is probably the best balance of clarity and brevity. Want me to find where this button label is defined and update it?

---

👤 **USER:**
> check codebase. As I remember it should restore previous version of document independanly is it was correct MArkdown document or not

Let me look at the codebase to understand what this button actually does.

Now let me check the actual handler to understand what the function does:

OK so now I see the full picture. The function sends content to an LLM asking it to restore markdown formatting that was lost during copy/paste. It's specifically about recovering markdown syntax (headings, lists, code blocks, etc.) from plain text — not about restoring a previous document version.

So the current name "Restore Markdown Format" is actually accurate to what it does. But you're right it's too long for the button. Given the function's purpose (recovering markdown formatting from pasted plain text), here are shorter options that still convey the meaning:

- "Restore MD" — short, clear for markdown users
- "Fix Formatting" — generic but fits
- "Recover Markup" — slightly different wording
- "Reformat MD" — implies reformatting

Given your memory that it should restore a previous version regardless of markdown, that's actually what the Undo button does (there's a separate undo mechanism). This button specifically uses an LLM to re-add markdown syntax to plain text.

So for a shorter label that fits one line, I'd suggest "Restore MD" or "Fix Formatting". Want me to update the button label?

