# Claude Chat Export
**Generated: 2026-03-01 17:44:15**

I will follow these instructions.

---

👤 **USER:**
> check differences from tag 1.4.3 and current stage. Suggest breif changelog

Let me check the git diff between tag 1.4.3 and the current state.

Let me get a bit more detail on the meaningful code changes (excluding docs/conversations):

Here's a suggested changelog for what's changed since 1.4.3:

---

### Changelog (since 1.4.3)

**New: Electron Desktop App**
- Full Electron desktop wrapper for the app (Phases 1–10)
- Flask backend manager with health checks and auto-restart
- Custom `app://` protocol with API proxy
- Native menu bar and Settings UI (configurable API port, pandoc path)
- GitHub OAuth flow adapted for desktop (with CSRF/nonce protection)
- Pandoc detection on startup
- PyInstaller bundling for Flask backend (Windows + macOS build scripts)
- Electron Forge packaging config with app icons
- 61 unit tests covering desktop modules (vitest)
- macOS window reopen-after-close fix

**BookStack Export**
- New bulk export endpoint with improved error handling
- Fixed unshelved books calculation with shelf pagination

**Backend**
- Configurable pandoc path setting
- GitHub OAuth route updates for desktop support
- New BookStack service + unit tests

**Frontend/Scripts**
- Updated `bookstack.js`, `github.js`, `local.js` export scripts
- Updated e2e export workflow tests

---

Want me to write this into `CHANGELOG.md` or adjust the format/detail level?

