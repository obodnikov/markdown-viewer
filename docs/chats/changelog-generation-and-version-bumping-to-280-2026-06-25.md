# Claude Chat Export
**Generated: 2026-07-03 10:40:06**

---

👤 **USER:**
> check last tag 2.7.1
I would like to create a changelog since that tag only with meaningful changes

Here's the proposed new changelog section based on the meaningful commits since 2.7.1:

---

**`## [Unreleased]`** (or whatever version you want to bump to)

**Added**
- Backend health indicator in the toolbar
- Manual refresh button for models and languages
- Chunked LLM processing for large documents with streaming progress
- Chunked processing extended to Custom Prompt and Restore Markdown actions
- Content size guard for LLM endpoints (80% token limit)

**Fixed**
- Proxy live backend port so API calls survive backend restarts
- Refresh models/languages on health recovery (not only on restart)
- Refresh models and languages after backend restart
- Kill orphaned backend processes before port allocation
- Improved Flask backend port allocation for multi-instance scenarios

---

Skipped: `docs:` commits, the `.gitignore` update, and the git hooks removal — none of those are user-facing.

What version should I use for this entry? I'll update `CHANGELOG.md` once you confirm.

---

👤 **USER:**
> yes update it

The changes include new features (health indicator, chunked processing, manual refresh), so a minor bump to **2.8.0** makes sense. Using today's date: 2026-06-25.

Done. Added `[2.8.0] - 2026-06-25` at the top of the changelog with 5 additions and 5 fixes.

