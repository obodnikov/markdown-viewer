# Claude Chat Export
**Generated: 2026-04-25 09:05:59**

I will follow these instructions.

---

👤 **USER:**
> I would like to brainstorm one idea.I have self-hosted owncloud installation and would like to create a plugin that will be able to show and edit markdown files in owncloud. I am thinking about to reuse what we did here in this workplace even reuse backend that is present on the same host as owncloud just in other docker container. Be progmatic and not adulateUse semantic-index skill to search current codebase, documentation or conversationsUse firecrawl mcp server to search web for solutions.

Let me scan the project rules and gather context before we brainstorm.

Got the lay of the land. Let me check a few more things before drafting the plan: existing file source adapters (GitHub/BookStack pattern) and any prior docs/chats on owncloud/nextcloud.

No prior owncloud work in this repo (the hits are from another project's chat log). Let me quickly verify the owncloud plugin/app landscape before proposing.

Good — enough signal. A key question: "ownCloud Classic" (PHP 10.x) vs "ownCloud Infinite Scale" (oCIS, Go) have very different extension models. I need to know which one you're running before the design locks in. Let me surface the proposal without coding.

Here's my pragmatic read.

**What's in the workspace we can actually reuse**

- Frontend: vanilla ES6 modules, no build step. The whole editor lives in `public/index.html` + `scripts/`. It already knows how to be hosted behind any reverse proxy because all API calls use `/api/*` (AI.md hard rule).
- Backend: Flask with clean source/service split. There's already a near-identical integration pattern in `backend/routes/bookstack.py` + `backend/services/bookstack_service.py` (browse hierarchy, load content, save with conflict detection, per-user session auth). An owncloud adapter drops into this shape almost 1:1.
- Auth model already used: user enters credentials in the UI, they're kept in a Flask session — not in `.env`. Same model fits owncloud app passwords perfectly.

**What "reuse the backend in another container" actually means**

The Flask backend is stateless HTTP. If it runs as a sibling container next to owncloud (same Docker network) or on the same host, your owncloud reverse proxy just needs to forward a path (say `/apps/mdviewer/` for the UI and `/apps/mdviewer/api/*` for the backend) into the markdown-viewer container. Zero code changes thanks to the relative-URL rule. This is the cheapest path and the one I'd push.

**The uncomfortable question: which ownCloud?**

This matters a lot and the two paths diverge hard:

1. ownCloud **Classic** (10.x, PHP). Real "app" extension system: you ship a PHP app that registers a file action / file handler for `.md` so clicking a markdown file opens your viewer. The app can embed an iframe pointing at the markdown-viewer container and hand over the file path + an app-password-based WebDAV session. This is the closest thing to a real "plugin."
2. ownCloud **Infinite Scale (oCIS)**. No PHP app ecosystem. Extension happens via "Web Applications" / external apps registered in the Web UI config, or via a reverse-proxy-mounted SPA. The editor gets loaded in an iframe and talks to oCIS over WebDAV / the app-provider protocol. Much less "plugin," much more "companion web app."
3. Pure **WebDAV client** (no owncloud-side code at all). Add owncloud as a third file source inside our existing editor (alongside Local / GitHub / BookStack). User enters URL + username + app password, we list and edit `.md` files over WebDAV. No plugin to install on the owncloud side. This is honestly the most pragmatic MVP and works on both Classic and oCIS.

**My honest recommendation (not flattery)**

Do option 3 first. It's 80% of the value, fits the existing architecture exactly, doesn't touch owncloud internals, and gives you something working in days, not weeks. Then, if you want the "open a .md file from the owncloud UI and it launches the editor" experience, bolt on option 1 or 2 as a thin wrapper that just points at the already-working editor with the file path as a query parameter. The heavy lifting stays in the Flask + vanilla-JS code you already trust.

**What option 3 looks like concretely**

- `backend/services/owncloud_service.py` — thin WebDAV client (PROPFIND to list, GET to load, PUT to save, optional If-Match ETag for conflict detection). Use `requests` directly; no heavy SDK needed. Mirror the method names from `bookstack_service.py`.
- `backend/routes/owncloud.py` — blueprint with `/authenticate`, `/status`, `/logout`, `/list?path=`, `/file?path=`, `PUT /file`. Session-based like BookStack.
- `scripts/file/owncloud.js` — file browser dialog + smart-save hook. Mirror `scripts/file/bookstack.js`.
- Config: `OWNCLOUD_URL` (optional default) in `.env.example`; per-user username + app password entered in UI. App password beats real password — it's revocable and bypasses 2FA properly.
- Deploy: one new service in `docker-compose.yml` on the same network as owncloud, or just route through the existing reverse proxy in front of owncloud.

**What to watch out for (pragmatic, not decorative)**

- `.md` rendering inside owncloud's file viewer: Classic has a built-in "Text" app that renders markdown read-only. Your editor needs to register as a handler with higher priority, or be launched via a file action button. This is the trickiest part of option 1.
- oCIS doesn't give you a real hook there. You'll end up with a "Open in Markdown Editor" app tile, or the user opens the editor directly and browses via WebDAV.
- Conflict detection over WebDAV: use ETags (`If-Match` on PUT). Don't invent your own `updated_at` scheme like BookStack needed.
- CORS: if the editor is on a different subdomain than owncloud, WebDAV calls go server→server from Flask, not from the browser. Fine, but means the backend container has to reach the owncloud URL. Document this.
- Credentials: store app password only in the Flask session, never forward it to the browser. Match BookStack's pattern exactly.

**What I need from you before drafting anything**

1. Classic (10.x, PHP) or Infinite Scale (oCIS)? Or both?
2. Is the goal "browse/edit markdown files from inside owncloud's UI" (needs owncloud-side plugin), or "use this editor as a standalone app that happens to read/write owncloud files" (option 3 alone is enough)?
3. Single-user self-hosted, or do multiple owncloud users need to each use the editor with their own credentials?

Tell me those three and I'll come back with a concrete design doc + task list before touching any code.

---

👤 **USER:**
> I guess classic ownCloud 10.16.1 (stable)Better to have possibility to use by multiple user

Good — that pins the target. Classic 10.16.1 + multi-user changes a few things. Let me verify the Classic 10 app extension mechanics before I commit to a design (the details matter: file actions, app passwords, WebDAV endpoint shape).

Enough to be precise. Here's the pragmatic design.

**Target fixed**

- ownCloud Server Classic 10.16.1 (PHP).
- Multi-user: every owncloud user uses their own credentials, independently.

**The key constraint you just introduced: multi-user**

That rules out a single shared account in `.env`. Credentials have to be per-user, entered in the UI, kept only server-side in a session. Good news: this is literally how `bookstack.py` already works in this codebase. Same pattern, different backend.

**Architecture I'd ship (two layers, built in order)**

*Layer A — "WebDAV file source" (MVP, do this first)*

Exactly the same shape as the existing BookStack integration:

- `backend/services/owncloud_service.py` — WebDAV client using `requests`:
  - `PROPFIND` to list a directory (parse XML, filter `.md` + folders)
  - `GET` to load file, captures `ETag`
  - `PUT` with `If-Match: <etag>` to save with conflict detection
  - `MKCOL` to create folders (later)
  - Base URL: `{OWNCLOUD_URL}/remote.php/dav/files/{username}/`
- `backend/routes/owncloud.py` — blueprint:
  - `POST /api/owncloud/authenticate` — user posts `{username, app_password}`, we do a cheap `PROPFIND` on their root to verify, then stash `{url, username, app_password}` in `flask.session`.
  - `GET /api/owncloud/status`
  - `POST /api/owncloud/logout`
  - `GET /api/owncloud/list?path=`
  - `GET /api/owncloud/file?path=` → returns `{content, etag}`
  - `PUT /api/owncloud/file` → body `{path, content, etag}`, returns new etag; 409 on mismatch
- `scripts/file/owncloud.js` — mirrors `scripts/file/bookstack.js`:
  - Login dialog (URL prefilled from `/api/owncloud/config`, username + app password fields, with a link to the ownCloud "Security → App passwords" page)
  - File tree / browser dialog
  - Smart-save hook wired into the existing `Ctrl+S` flow (same way BookStack and GitHub are wired)
  - Export target in the export dialog (write to owncloud path)
- Config:
  - `OWNCLOUD_URL` optional default in `.env.example`
  - `OWNCLOUD_VERIFY_TLS` (default true; toggle for self-signed)
  - No credentials in env — per-user only
- Deployment: one new service in the existing `docker-compose.yml`, on the same Docker network as owncloud, so Flask reaches `http://owncloud/` internally. Public traffic still goes through your existing reverse proxy; the editor stays on its own subdomain (e.g. `md.yourdomain.com`).

That alone gives every owncloud user a working markdown editor that reads and writes their owncloud files, with conflict detection, in days not weeks. You use it by going to the editor's URL and logging in with your owncloud username + an app password.

*Layer B — "Opens from owncloud UI" (thin PHP app, do this second, only if you actually want the in-owncloud handoff)*

A minimal ownCloud Classic 10 app whose only job is to make clicking a `.md` file launch the editor with that file prefilled:

- `apps/markdown_viewer/appinfo/info.xml` + routes + a ~20-line JS that registers a file action via `OCA.Files.fileActions.registerAction({mime: 'text/markdown', name: 'Edit with Markdown Viewer', ...})`.
- The action handler opens a new tab or an iframe at `https://md.yourdomain.com/?source=owncloud&path=/Docs/notes.md`.
- The editor, on boot, sees the query params and, if the user already has a session, loads the file; otherwise it shows the login dialog with the path remembered.
- No PHP business logic beyond registering the file action. The real work stays in Flask where it's testable.

That's it — no editing inside owncloud's UI, no reimplementing anything in PHP. The file handoff is just a deep link.

**Why this split is the right answer for your stack**

- Respects ARCHITECTURE.md stability zones: owncloud becomes a new ⚠️ Experimental file source next to GitHub / BookStack, no stable component changes.
- Respects AI.md: all frontend API calls are `/api/owncloud/*`, no absolute URLs.
- Respects AI_FLASK.md: routes thin, service fat, mock `requests` in tests.
- The multi-user requirement is solved for free by the existing Flask session pattern used by BookStack.
- Layer B is optional and decoupled. If you never build it, Layer A still delivers.

**Things I want to be honest about**

- App passwords in ownCloud 10 exist and are the right choice, but they were historically flaky (the Central thread I found confirms occasional persistence bugs). If a user reports a password suddenly not working, that's on owncloud, not on us. We'll surface a clean "re-authenticate" UX.
- WebDAV over HTTPS with self-signed certs is a real pain in Docker. `OWNCLOUD_VERIFY_TLS=false` escape hatch, documented as a footgun.
- Conflict detection via `If-Match`/ETag is solid but ownCloud has been known to change ETag behavior on edge cases (renames, server-side edits through the sync client). We'll treat a 412 as "remote changed, offer overwrite" — same UX BookStack already has.
- We won't do locking in v1. If two users edit the same file simultaneously, last-writer-wins with a warning. Owncloud Classic has a locking app; integrating it is v2.
- Multi-user on the editor side: each browser session is independent. If you want SSO (user logs into owncloud, lands in editor already authenticated), that's a much bigger lift — OAuth2 against the owncloud OAuth2 app. Not in v1. App password is the pragmatic path.

**What I'd like your call on before I write a spec**

1. Is Layer A alone enough to start, or do you want Layer B (the PHP file-action app) in the same first delivery?
2. HTTPS setup between the editor container and the owncloud container: can they share a Docker network and talk over plain HTTP internally? If yes, life is simpler.
3. Do you want me to write this up as a full Kiro spec (requirements → design → tasks) under `.kiro/specs/owncloud-integration/`, or a lighter `docs/OWNCLOUD_INTEGRATION_PLAN.md` like the Electron one? I'd lean spec — it's a feature of the same scope as BookStack, which deserves the full treatment.

Give me those three and I'll produce the spec (no code yet, per CLAUDE.md).

---

👤 **USER:**
> 1. I would like to have both. But split them as two steps in implementation plan2. Yes they can talk plain HTTP between containers3. I prefer to have lighter OWNCLOUD_INTEGRATION_PLAN.md like the Electron one

Good. Before I draft the plan, let me peek at the Electron plan's shape and the BookStack integration doc so I match the existing style rather than inventing a new one.

Got the idiom. Here's what I propose to write — confirming before I put anything on disk, per CLAUDE.md.

**Proposed plan**

Single new file: `docs/OWNCLOUD_INTEGRATION_PLAN.md` (nothing else touched).

Structure, matching the Electron plan's tone:

1. Overview — goal, two-step split (Layer A: WebDAV file source in the editor; Layer B: ownCloud 10 file-action app), explicit non-goals (no SSO in v1, no locking in v1, no rich-text editing inside ownCloud).
2. Architecture — one diagram showing owncloud container + markdown-viewer container on a shared Docker network, plain HTTP internally, reverse proxy on the edge. Call out the per-user session model reused from BookStack.
3. Project structure — which files get added in each step.
4. Step 1 — WebDAV File Source (Layer A) with phase breakdown:
   - 1.1 Config and env (`OWNCLOUD_URL`, `OWNCLOUD_INTERNAL_URL`, `OWNCLOUD_VERIFY_TLS`)
   - 1.2 `backend/services/owncloud_service.py` — WebDAV client (`requests`, XML parsing, `PROPFIND` / `GET` / `PUT` with `If-Match`, minimal and testable)
   - 1.3 `backend/routes/owncloud.py` — `authenticate`, `status`, `logout`, `list`, `file` GET/PUT; session-stored creds
   - 1.4 Frontend module `scripts/file/owncloud.js` — login dialog, browser, wiring into smart-save and export dialog; mirrors `scripts/file/bookstack.js`
   - 1.5 Styles (new `styles/components/owncloud.css` only if needed, else reuse bookstack tokens)
   - 1.6 Tests — `backend/tests/unit/test_owncloud_service.py` mocking `requests`, `backend/tests/integration/test_owncloud_routes.py`, plus a Vitest unit for the frontend client
   - 1.7 Docker Compose additions — service on the shared network, env wiring
   - 1.8 Documentation — small README section + `.env.example` entries
   - Acceptance checklist for Step 1
5. Step 2 — ownCloud 10 Classic App (Layer B):
   - 2.1 `apps/markdown_viewer/` skeleton (`appinfo/info.xml`, `appinfo/routes.php`, `js/fileaction.js`)
   - 2.2 File action registration via `OCA.Files.fileActions.registerAction` for `text/markdown` plus `.md` extension fallback
   - 2.3 Launch URL format: `https://md.yourdomain.com/?source=owncloud&path=<encoded>` (new tab by default, iframe mode behind a config flag)
   - 2.4 Editor bootstrap changes in `scripts/main.js` to honor `?source=owncloud&path=` and trigger the owncloud loader after auth
   - 2.5 Packaging and installation into ownCloud (`occ app:enable markdown_viewer`)
   - 2.6 Tests — PHP side is tiny, mostly manual verification; we document the steps
   - Acceptance checklist for Step 2
6. Security considerations — app passwords only, no TLS skip in production, CORS stays zero because the frontend still calls `/api/*`, session cookies `httpOnly` + `SameSite=Lax`.
7. Risk assessment — app password quirks on ownCloud 10, ETag edge cases (412 handling), self-signed certs, concurrent edits.
8. Rollout — Step 1 as a standalone release; Step 2 added later without touching Step 1 code.
9. Open questions — anything I'd want to confirm before implementation starts (subdomain vs subpath for the editor, whether you want the launch URL to open in-tab or in an iframe inside ownCloud).

What I will not include:

- No code samples beyond small signatures/snippets for clarity (keeps the doc light like the Electron one).
- No stubs or files created outside this doc.
- No changes to `AI*.md`, `ARCHITECTURE.md`, `.env.example`, `docker-compose.yml`, or any source file — those come in the implementation PRs later.

Ready to write `docs/OWNCLOUD_INTEGRATION_PLAN.md`? Say the word and I'll create it.

Writing the plan in two appends to keep each write snappy.

Done. Plan landed at `docs/OWNCLOUD_INTEGRATION_PLAN.md`. Two-step split, Step 1 (WebDAV file source) is standalone, Step 2 (Classic 10 PHP launcher app) bolts on later. Open questions at §9 are what I need answered before any implementation PR.

---

👤 **USER:**
> I suggest go thru https://doc.owncloud.com/server/latest/developer_manual/index.html developer documentation and re-check solution

Good call. Let me pull the actual developer manual before adjusting anything.

The scrape only shows top-level content, not the nav tree. Let me get the sitemap to find the concrete pages on file actions, WebDAV, and app structure.

Let me extract only the 10.16 developer_manual URLs, plus the one about `external_sites` (that's the official pattern for pointing at an external web UI from ownCloud — potentially changes Layer B).

The file has odd line breaks. Let me handle that.

Now I have the full map. The key pages to read for this review: `webdav_api/index.html`, `app/fundamentals/js.html` (file actions), `app/fundamentals/info.html` (info.xml), `app/fundamentals/routes.html`, `app/fundamentals/filesystem.html`, plus the external_sites admin config. Let me pull them.

I have enough signal. The `webdav_api/index.html` page is a stub — the actual endpoint shape sits in the admin manual's `access_webdav.html`, which I already sampled earlier. Let me also check the key filesystem, routes, and external_sites pages so I can validate a few details I'm unsure about.

Good — I now have everything I need. Let me summarize what the docs actually say vs what our plan currently says, then propose concrete edits.

**What the docs confirmed (plan is right)**

- WebDAV endpoint is `{base}/remote.php/dav/files/{USERNAME}/` — exactly what the plan already specifies. There's also a legacy `/remote.php/webdav` path but the new per-user `/dav/files/<user>/` is the documented one for 10.x.
- `PROPFIND` with depth `1`, response in `d:multistatus` / `d:response` XML, `d:getetag`, `d:getcontentlength`, `d:getlastmodified`, `d:resourcetype`, `oc:fileid` — all present, namespaces match my plan. `oc:fileid` is a bonus we could use for stable identity across renames.
- Basic Auth with username + password works; app passwords are the recommended credential.
- `PROPFIND` / `PUT` with conditional `If-Match` header is the right mechanism; ETag is the canonical concurrency token.
- `MKCOL` is how you create directories, `MOVE` is how you rename (useful for Step 1 "Save As").

**What the docs revealed that the plan got wrong or missed**

1. **There is a first-party `external_sites` app.** Already shipped in every ownCloud 10, just needs enabling in Admin. It adds an iframe-backed menu entry pointing at any URL. That means Step 2 *might* not need a custom PHP app at all — if all we want is "launch the editor from ownCloud", `external_sites` does it zero-code. The docs are also blunt that iframe embedding of arbitrary external sites is fragile because of `X-Frame-Options` / CSP. That's a real risk for iframe mode of any solution.
2. **File actions API is tied to `OCA.Files.FileList`, not the plain `OCA.Files.fileActions` registry.** The plan wrote `OCA.Files.fileActions.registerAction(...)` at global scope, but the documented 10.x pattern is:

    ```js
    OC.Plugins.register('OCA.Files.FileList', {
      attach: function(fileList) {
        fileList.fileActions.registerAction({ /* ... */ });
      }
    });
    ```

    That's an important correction — the global form isn't the canonical API in 10.x.
3. **Registering JS from a PHP app requires hooking into `OCA\Files::loadAdditionalScripts`.** Our "Layer B app has no PHP controllers" line is not quite right — we need `appinfo/app.php` to register the event listener that calls `script('markdown_viewer', 'fileaction')`. That's trivial PHP (a few lines) but it's not "zero PHP."
4. **`appinfo/info.xml` is stricter than I assumed.** It requires `<summary>` (≤90 chars), `<types><filesystem/></types>` or an appropriate types tag, `<category>`, `<website>`, `<repository>`, `<bugs>`, `<documentation>`. Our plan undersold this; the skeleton needs those fields to even install. `<owncloud min-version="10.11" max-version="10" />` pins compatibility.
5. **Security guidelines impose constraints we should honor explicitly.**
   - "Don't save highly sensitive data in persistent storage on the client side" — reinforces that the app password belongs in the Flask session, never `localStorage`. Plan already says this; good.
   - CSRF tokens in ownCloud JS requests use header `requesttoken` from `oc_requesttoken`. If our file-action handler ever calls back into ownCloud it needs that header. In our design it only calls `window.open(...)` so we dodge this, but worth calling out.
   - Clickjacking: ownCloud sends `X-Frame-Options` on its templates. If we ever went the "editor in an iframe inside ownCloud" route, we'd be fighting the framework. That's an argument *for* `window.open` as the default and against the iframe path.
6. **`external_sites` app screenshot + docs explicitly warn about iframe embedding being blocked by X-Frame-Options / CSP.** So the iframe mode of Layer B is not just brittle in theory, ownCloud's own docs say it is brittle in practice. Plan should downgrade it from "optional behind a flag" to "not recommended, documented footgun."
7. **Launch URL is a potential "unvalidated redirect".** The security guide calls out this exact pattern. Our file action's `window.open(editor_url + '?path=...')` is fine because we validate `editor_url` is an admin-set config value, not user input, and `path` comes from the file list (trusted). Worth stating explicitly in the plan.
8. **The `oc:fileid` property is stable across renames / moves.** We could track this alongside path and ETag, so "Save" still works if the user renames the file in ownCloud between load and save. Low-cost upgrade, worth mentioning as a v1.1 improvement, not blocking v1.
9. **The `webdav_api/` subsection of the developer manual is a stub** that just points at the admin-manual `access_webdav.html`. Worth citing the real source URL so future maintainers don't hunt for it.
10. **The "Marketplace" is the official distribution path.** If we ever want others to install the Layer B app, Marketplace is where it goes. We should mention it as a possible future step; for now the tar.gz + manual install path is fine.

**Proposed edits to `docs/OWNCLOUD_INTEGRATION_PLAN.md`**

Here's what I'd change, concretely, before touching any code:

- **Layer B rework (§5 / Step 2):** Add a new §2.0 "Three launcher options, pick the right one":
  - Option A (zero-code): enable the built-in `external_sites` app, point it at the editor. No per-file action, just a menu item. Use this if we don't care about per-file click.
  - Option B (recommended): a minimal PHP app that registers a file action via the documented `OC.Plugins.register('OCA.Files.FileList', ...)` pattern. Opens the editor in a new tab.
  - Option C (not recommended): iframe the editor inside ownCloud. Explicitly documented as fragile due to X-Frame-Options / CSP, called out by ownCloud's own docs. Removed from the "optional flag" status.
- **Layer B file action code pattern (§2.2):** Fix the registration snippet to the correct nested form.
- **Layer B skeleton (§2.1):** Expand `info.xml` description to include the required fields (`summary`, `types`, `category`, `website`, `repository`, `bugs`, `documentation`, `owncloud min/max-version`). Add `appinfo/app.php` with the `OCA\Files::loadAdditionalScripts` listener. Drop the claim that the app has "no server-side endpoints" — it has one tiny bit of PHP glue.
- **Security section (§6):** Add two new bullets:
  - Explicitly cite ownCloud's security guide on client-side persistence — we do not store credentials in `localStorage`; they live in Flask session only.
  - Note unvalidated-redirect consideration on the launch URL and state that `editor_url` is an admin config, `path` is a trusted filename from the file listing — not user input.
- **Risk assessment (§7):** Replace the "iframe CSP" row with a stronger row that cites the ownCloud docs position and removes the "disabled by default flag" phrasing.
- **Add a new §2.8 "Enhancements for v1.1":** track `oc:fileid` alongside ETag for rename-resilient saves; Marketplace publishing.
- **Reference links:** add a short "Reference" subsection linking to the five doc pages I scraped, for future maintainers.

**What I'm *not* going to change**

- Layer A (WebDAV file source) is validated by the docs. Endpoint shape, PROPFIND namespaces, ETag flow, Basic Auth with app password — all match. No edits needed there.
- The two-step split, docker network, multi-user model, session handling — all still correct.
- The open questions in §9 — still relevant, still need answers before implementation.

Want me to apply these edits to `docs/OWNCLOUD_INTEGRATION_PLAN.md`?

---

👤 **USER:**
> yes apply

Applying the edits as independent replacements. Let me also bump the doc version and cite the doc URLs.

Now rework Step 2 (Layer B). I'll replace the whole §2.1–§2.2 block with an expanded version that adds the three-option intro, correct file-action API, and realistic info.xml / app.php.

Let me re-read the file to get the exact current text.

Now I can do the replacement accurately. I noticed the difference: previous `fileaction.css` line had "Optional; icon styling only". Let me use the exact string.

Now update the Security section to add two bullets, the Risk Assessment to fix the iframe row, and then add the Enhancements (§2.8) + References subsection. I'll read the current tail of the file to make precise edits.

Now I'll make three targeted edits: Security section, Risk table row, and add a new §2.8 + References subsection at the end.

Now append the References section at the end.

Done. Changes applied to `docs/OWNCLOUD_INTEGRATION_PLAN.md`:

- Bumped version to 1.1.0 with a "reviewed against docs" note.
- New §2.0 comparing the three launcher options, with Option C (iframe) explicitly ruled out per ownCloud's own docs.
- §2.1 expanded with real `info.xml` requirements and correct `app.php` responsibility.
- §2.2 rewritten to use the documented `OC.Plugins.register('OCA.Files.FileList', ...)` pattern instead of the wrong global form.
- New §2.8 for v1.1 enhancements (`oc:fileid`, Marketplace, mime fallback).
- §6 Security tightened: client-side persistence rule, launch-URL redirect class bounded, iframe position aligned with §2.0.
- §7 Risk table: iframe row marked N/A since Option C is out of scope.
- New §10 References with the five doc pages that informed this pass.

