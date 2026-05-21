# ownCloud Integration — Implementation Plan

**Version:** 1.1.0
**Created:** 2026-04-21
**Last revised:** 2026-04-21 — reviewed against ownCloud 10.16 developer manual
**Status:** 📋 Planning
**Target:** Markdown Viewer v2.8.0
**ownCloud target:** Classic 10.16.1 (PHP), self-hosted, multi-user

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Step 1 — WebDAV File Source (Layer A)](#step-1--webdav-file-source-layer-a)
5. [Step 2 — ownCloud Classic App (Layer B)](#step-2--owncloud-classic-app-layer-b)
6. [Security Considerations](#6-security-considerations)
7. [Risk Assessment](#7-risk-assessment)
8. [Rollout](#8-rollout)
9. [Open Questions](#9-open-questions)

---

## 1. Overview

### Goal

Let every user of a self-hosted ownCloud Classic 10 instance read and edit their
Markdown files with this editor, using their own credentials, without installing
anything on their machine.

The work is split into two deliverables that can ship independently:

- **Layer A — WebDAV File Source.** The Markdown Viewer gains a new file source
  alongside the existing Local / GitHub / BookStack sources. Users authenticate
  against ownCloud with an app password, browse their files, load `.md` files,
  edit, and save back with conflict detection. This is the standalone editor
  experience.
- **Layer B — ownCloud Classic App.** A small PHP app installed into ownCloud
  that adds an "Edit with Markdown Viewer" file action for Markdown files. When
  a user clicks it, ownCloud opens the editor (Layer A) in a new tab with the
  file path pre-filled. No editing logic lives in PHP; the app is a thin
  launcher only.

Layer A is self-contained and useful on its own. Layer B requires Layer A but
adds nothing server-side beyond the launcher — all real work stays in Flask
where it is already tested.

### Non-goals (v1)

- No Single Sign-On between ownCloud and the editor. Per-user app passwords only.
- No file locking. Last-writer-wins with conflict detection via ETags.
- No rich-text / WYSIWYG editing inside ownCloud's own UI.
- No offline sync beyond what the existing editor already does via localStorage
  autosave.
- No support for ownCloud Infinite Scale (oCIS) in this iteration.

### Reuse

Layer A follows the exact pattern of the existing BookStack integration:
per-user credentials captured in the UI, kept only in a Flask session, a thin
route layer, a service layer that talks to the external API. No new
cross-cutting concepts are introduced.

---

## 2. Architecture

### Runtime model (same-host Docker deployment)

```
                        ┌───────────────────────────┐
                        │      Reverse Proxy        │
                        │  (nginx / Traefik, TLS)   │
                        └─────┬──────────────┬──────┘
                              │              │
            cloud.example.com │              │ md.example.com
                              │              │
                ┌─────────────▼───┐    ┌─────▼─────────────────┐
                │  ownCloud 10    │    │  markdown-viewer      │
                │  (PHP + Apache) │    │  nginx + Flask        │
                └─────────────────┘    └──────────┬────────────┘
                         ▲                        │
                         │   plain HTTP           │
                         │   (shared docker net)  │
                         └────────────────────────┘
                               PROPFIND / GET / PUT
                               /remote.php/dav/files/<user>/...
```

- Public TLS terminates at the reverse proxy.
- Inside the Docker network the Flask backend talks to ownCloud over plain HTTP
  using the internal service name. No CORS, no certificate hassle.
- The browser only ever talks to `md.example.com/api/*`. It never talks to
  ownCloud directly. Credentials never touch JavaScript.

### Per-user session model (reused from BookStack)

```
Browser ──▶ POST /api/owncloud/authenticate {username, app_password}
            │
            ▼
        Flask session ({url, username, app_password})
            │
            ▼
        All subsequent /api/owncloud/* calls read creds from session,
        proxy to ownCloud over WebDAV, return JSON to the browser.
```

Sessions are Flask's `SECRET_KEY`-signed cookies, `httpOnly`, `SameSite=Lax`,
lifetime 24 h (same as BookStack). Credentials are never sent back to the
browser after login.

---

## 3. Project Structure

### Files added by Step 1 (Layer A)

```
backend/
├── routes/
│   └── owncloud.py                 # Blueprint: authenticate, status, logout,
│                                   # list, file GET/PUT
├── services/
│   └── owncloud_service.py         # WebDAV client (requests + XML)
└── tests/
    ├── unit/
    │   └── test_owncloud_service.py
    └── integration/
        └── test_owncloud_routes.py

scripts/
├── file/
│   └── owncloud.js                 # Login dialog, browser, smart-save hook
└── tests/unit/file/
    └── owncloud.test.js

styles/components/
└── owncloud.css                    # Only if bookstack tokens don't cover it
```

No existing service / route / frontend module is modified in Step 1 except
`scripts/main.js` (wire the new source) and the export dialog (add owncloud as
a target). Both are 🔄 Semi-Stable per ARCHITECTURE.md §7, so changes are
scoped and minimal.

### Files added by Step 2 (Layer B)

```
owncloud-app/markdown_viewer/       # PHP app skeleton, packaged separately
├── appinfo/
│   ├── info.xml
│   ├── app.php
│   └── routes.php
├── js/
│   └── fileaction.js               # Registers OCA.Files.fileActions action
├── css/
│   └── fileaction.css              # Optional; icon styling only
└── README.md                       # Install / configure instructions
```

The `owncloud-app/` directory lives at the repo root, outside the Flask/Node
build paths. It is zipped and installed into ownCloud's `apps/` directory
separately; it is **not** deployed in the markdown-viewer container.

---

## Step 1 — WebDAV File Source (Layer A)

**Goal:** deliver a complete, tested ownCloud file source in the editor. After
Step 1 a user can go to `https://md.example.com`, log into ownCloud with their
username and an app password, and open, edit, save, and create `.md` files in
their ownCloud storage.

### 1.1 Configuration

Additions to `.env.example`:

```bash
# ownCloud integration (optional)
OWNCLOUD_URL=https://cloud.example.com           # Public URL shown to users
OWNCLOUD_INTERNAL_URL=http://owncloud            # URL Flask uses server-side.
                                                 # Defaults to OWNCLOUD_URL.
OWNCLOUD_VERIFY_TLS=true                         # Set to false ONLY for
                                                 # self-signed internal certs.
OWNCLOUD_TIMEOUT=30                              # Seconds per request
```

Rules:

- Credentials are **never** stored in env. Per-user only, captured in the UI.
- `OWNCLOUD_URL` is the value the frontend shows in "where do I get an app
  password" help text and prefilled login forms.
- `OWNCLOUD_INTERNAL_URL` lets Flask reach ownCloud over the internal Docker
  network without going back out through the reverse proxy.

### 1.2 Service layer — `backend/services/owncloud_service.py`

Responsibilities, mirroring `bookstack_service.py`:

- Build WebDAV URLs: `{internal_url}/remote.php/dav/files/{username}{path}`.
- `list_directory(path)` — `PROPFIND` depth 1, parse XML response, return
  `[{name, path, is_dir, size, etag, mtime}]`. Filter client-side to folders
  plus `.md` / `.markdown` files for the browser dialog.
- `get_file(path)` — `GET`, return `{content, etag}`.
- `put_file(path, content, etag=None)` — `PUT` with `If-Match: <etag>` when
  provided; raise a domain `ConflictError` on HTTP 412 so the route can map it
  to 409. No `If-Match` means unconditional overwrite (used for new files).
- `check_credentials(url, username, app_password)` — cheap `PROPFIND` depth 0
  on the user's root to validate login during `/authenticate`.
- All methods accept `(url, username, app_password)` — service is stateless,
  the route layer passes in values pulled from the session.
- Uses `requests.Session()` with `verify=OWNCLOUD_VERIFY_TLS`, a single
  `timeout=OWNCLOUD_TIMEOUT`, and `HTTPBasicAuth`.
- XML parsing via `xml.etree.ElementTree` — no new dependency. Namespace map
  `{'d': 'DAV:', 'oc': 'http://owncloud.org/ns'}`.

Explicit non-responsibilities:

- No recursion. Listing is depth-1 only; the frontend navigates one folder at
  a time.
- No file-content transformation. `.md` content is returned verbatim.
- No retries on 5xx. The frontend handles errors with a toast + retry button.

### 1.3 Route layer — `backend/routes/owncloud.py`

Endpoints, all prefixed with `/api/owncloud`:

| Method | Path             | Purpose                                                       |
|--------|------------------|---------------------------------------------------------------|
| POST   | `/authenticate`  | Body `{username, app_password}`. Validates against ownCloud, stores creds in session, returns `{authenticated: true, username}`. |
| GET    | `/status`        | Returns `{authenticated: bool, username}`.                    |
| POST   | `/logout`        | Clears owncloud-scoped session keys.                          |
| GET    | `/config`        | Returns `{url}` (the public `OWNCLOUD_URL`) for the login dialog prefill. No auth required. |
| GET    | `/list?path=`    | Lists a directory. `path` defaults to `/`.                    |
| GET    | `/file?path=`    | Returns `{content, etag, path}`.                              |
| PUT    | `/file`          | Body `{path, content, etag?}`. Returns `{etag}`. 409 on ETag mismatch. |

Session keys: `owncloud_url`, `owncloud_username`, `owncloud_app_password`.
Cleared on `/logout` and on any 401 returned by ownCloud.

Error mapping:

- ownCloud 401 → route 401, frontend shows "session expired, please sign in"
  and clears the session.
- ownCloud 404 → route 404.
- ownCloud 412 → route 409 `{error: "conflict", current_etag: ...}`.
- Network / timeout → route 502.

### 1.4 Frontend module — `scripts/file/owncloud.js`

Mirrors `scripts/file/bookstack.js` one-for-one. Public surface:

- `openLoginDialog()` — URL (readonly, from `/api/owncloud/config`), username,
  app password. Help link to `${url}/settings/personal?sectionid=security` for
  creating an app password.
- `openBrowser()` — folder navigator, shows folders + `.md` files, breadcrumb
  path, "Open" and "Cancel" buttons.
- `loadFile(path)` — calls `GET /api/owncloud/file`, hydrates the editor,
  stamps metadata `{source: 'owncloud', path, etag}` on the document.
- `savePage()` — called by smart-save when `source === 'owncloud'`. Sends
  `{path, content, etag}`. On 409, opens the existing conflict dialog
  (already used by BookStack) with "Overwrite" and "Cancel" options;
  "Overwrite" retries without an `If-Match`.
- `exportToOwncloud(content, path)` — target in the export dialog. Creates a
  new file via unconditional `PUT`.

Wiring:

- `scripts/main.js` — add keyboard shortcut `Ctrl/Cmd+L` (pick any free one)
  to open the ownCloud browser, and register the source with the smart-save
  dispatcher next to `bookstack` and `github`.
- Export dialog — add "ownCloud" as a target alongside "BookStack".

### 1.5 Styles

Reuse the BookStack dialog/browser styles. Only add
`styles/components/owncloud.css` if the ownCloud dialog needs an icon or a
color token the existing styles don't cover.

### 1.6 Tests

Backend (pytest, per AI_FLASK.md, 80 %+ coverage target):

- `backend/tests/unit/test_owncloud_service.py` — mock `requests.Session`
  with `responses` or `requests-mock`. Cases: successful list, empty
  directory, 401, 404, 412, XML with odd namespaces, URL encoding of paths
  with spaces and unicode, ETag round-trip.
- `backend/tests/integration/test_owncloud_routes.py` — Flask test client,
  service mocked. Cases: authenticate happy / bad creds, list / file without
  auth (401), conflict mapping (412 → 409), logout clears session.

Frontend (Vitest):

- `scripts/tests/unit/file/owncloud.test.js` — mock `fetch`, verify login
  dialog POST shape, browser list rendering, save ETag handling, conflict
  retry flow.

### 1.7 Docker Compose

Additions to `docker-compose.yml`:

- Join the markdown-viewer service to the same network as the ownCloud
  container (typically an existing external network such as
  `cloud_default`).
- Inject `OWNCLOUD_URL`, `OWNCLOUD_INTERNAL_URL`, `OWNCLOUD_VERIFY_TLS`,
  `OWNCLOUD_TIMEOUT` from `.env`.
- Document the network name and the expected service name for ownCloud in
  the README; the default `OWNCLOUD_INTERNAL_URL=http://owncloud` assumes
  the ownCloud service is named `owncloud` on the shared network.

No new container, no new process. The existing markdown-viewer container
just gains network access to ownCloud and a handful of env vars.

### 1.8 Documentation

- New "ownCloud Integration" section in `README.md` (setup, app password
  creation, troubleshooting).
- New "ownCloud" section in `CONFIGURATION.md` listing the env vars.
- No changes to `ARCHITECTURE.md` beyond adding ownCloud to §4.3 "External
  Integrations" and §7 "Stability Zones" (ownCloud lands as ⚠️ Experimental
  on first release).

### 1.9 Acceptance checklist — Step 1

- [ ] User can log in with ownCloud username + app password.
- [ ] User can browse folders and `.md` files in their ownCloud storage.
- [ ] User can open a `.md` file into the editor.
- [ ] Smart-save (Ctrl+S) writes back to ownCloud using the stored ETag.
- [ ] Conflicting save (remote modified) triggers the overwrite dialog.
- [ ] User can export a local / GitHub / BookStack document to a chosen
      ownCloud path.
- [ ] `/api/owncloud/logout` clears the session; subsequent calls 401.
- [ ] Two different users with two different browsers have independent
      sessions.
- [ ] Backend unit + integration tests green, coverage ≥ 80 %.
- [ ] Frontend unit tests green.
- [ ] README, CONFIGURATION.md, `.env.example` updated.

---

## Step 2 — ownCloud Classic App (Layer B)

**Goal:** installing a small PHP app into ownCloud adds an "Edit with Markdown
Viewer" file action on Markdown files. Clicking it opens the editor (Layer A)
in a new tab with the file path pre-filled. The user still logs into the
editor separately the first time; after that the Flask session handles
everything.

Nothing in Layer A changes except a tiny bootstrap tweak in `scripts/main.js`
to honor the launch URL.

### 2.0 Launcher options — pick the right one

ownCloud 10 offers more than one way to surface an external editor. Before
building anything, the three options are worth naming so the trade-offs are
explicit:

| Option | Effort | What the user sees                                 | Trade-off |
|--------|--------|----------------------------------------------------|-----------|
| A — Enable the built-in `external_sites` app | Zero code | A menu entry in ownCloud's top bar that opens the editor. **No per-file click**. | Gets the editor one click away; no handoff of a specific file. |
| B — Minimal PHP app with a file action (**recommended**) | ~50 lines PHP + JS | Per-file "Edit with Markdown Viewer" action in the `.md` three-dots menu. New tab, file path pre-filled. | We own the code and the install. Short, well-bounded. |
| C — iframe the editor inside ownCloud | Custom PHP + CSP work | Editor loads inside ownCloud's main panel. | ownCloud's own docs (see [external_sites admin guide](https://doc.owncloud.com/server/latest/admin_manual/configuration/server/external_sites.html)) warn that `X-Frame-Options` / CSP commonly break iframe embedding of external sites. **Not recommended.** |

This plan implements Option B. Option A is worth mentioning in the README as
a zero-code fallback if an admin wants a quick start before the PHP app is
installed. Option C is explicitly out of scope.

### 2.1 App skeleton

```
owncloud-app/markdown_viewer/
├── appinfo/
│   ├── info.xml          # Required metadata (see §2.1.1)
│   ├── app.php           # Registers the script via loadAdditionalScripts event
│   └── routes.php        # Returns []; no server-side endpoints
├── js/
│   └── fileaction.js     # Registers the file action (see §2.2)
├── css/
│   └── fileaction.css    # Icon class
└── README.md             # Install & configure instructions
```

The PHP footprint is two tiny files: a metadata manifest and an event-listener
registration. All behavior lives in `js/fileaction.js`.

#### 2.1.1 Minimum `info.xml` fields

Per the [ownCloud 10 app metadata guide](https://doc.owncloud.com/server/latest/developer_manual/app/fundamentals/info.html)
the following fields are mandatory and the install will fail without them:

- `id` (must match the folder name: `markdown_viewer`)
- `name`, `description`, `summary` (≤ 90 chars), `version`, `licence`
- `author`, `website`, `repository`, `bugs`, `documentation`
- `category` (e.g. `tools` or `productivity`)
- `types` — leave empty or declare `<filesystem/>` if we later need filesystem access hooks
- `dependencies` including `<owncloud min-version="10.11" max-version="10" />`
  to pin to the Classic 10 line

No database migrations, no repair steps, no settings sections. The app is
stateless on the PHP side.

#### 2.1.2 `app.php` responsibility

`appinfo/app.php` registers a listener for `OCA\Files::loadAdditionalScripts`
and, inside that listener, calls `script('markdown_viewer', 'fileaction')`
and `style('markdown_viewer', 'fileaction')`. This is the documented pattern
for injecting JS only when the file list is on screen — see
[JavaScript fundamentals](https://doc.owncloud.com/server/latest/developer_manual/app/fundamentals/js.html).
Loading the script globally is wasteful and is flagged in the same doc.

The admin-configurable editor URL is read via
`OC::$server->getConfig()->getAppValue('markdown_viewer', 'editor_url', '')`
and emitted as a small JSON blob in a `<script>` tag during the event so
`fileaction.js` can build launch URLs without a controller round-trip.

### 2.2 File action registration (correct 10.x pattern)

The [JavaScript fundamentals](https://doc.owncloud.com/server/latest/developer_manual/app/fundamentals/js.html)
doc shows the canonical registration shape. The action is registered **inside
a `OCA.Files.FileList` plugin `attach` callback**, not against a global
`OCA.Files.fileActions`:

```js
(function () {
    OC.Plugins.register('OCA.Files.FileList', {
        attach: function (fileList) {
            fileList.fileActions.registerAction({
                name: 'markdownViewerEdit',
                displayName: t('markdown_viewer', 'Edit with Markdown Viewer'),
                mime: 'text/markdown',
                permissions: OC.PERMISSION_UPDATE,
                iconClass: 'icon-rename',
                type: OCA.Files.FileActions.TYPE_DROPDOWN,
                actionHandler: function (fileName, context) {
                    var editorUrl = (window.OCA && OCA.MarkdownViewer && OCA.MarkdownViewer.editorUrl) || '';
                    if (!editorUrl) { return; }
                    var dir = context.dir || '/';
                    var full = (dir === '/' ? '' : dir) + '/' + fileName;
                    window.open(
                        editorUrl + '/?source=owncloud&path=' + encodeURIComponent(full),
                        '_blank',
                        'noopener'
                    );
                }
            });
        }
    });
})();
```

Notes:

- Registration goes through `OC.Plugins.register('OCA.Files.FileList', ...)`;
  the `attach(fileList)` callback is the canonical entry point.
- `mime: 'text/markdown'` covers `.md` when ownCloud knows the mime type. A
  second `registerAction` call with `mime: 'text/x-markdown'` or the
  `.markdown` extension as a fallback is safe.
- `permissions: OC.PERMISSION_UPDATE` hides the action on read-only shares.
- `window.open(..., '_blank', 'noopener')` prevents the new tab from reaching
  back into ownCloud's window via `window.opener`.
- No call back into ownCloud is made, so no `requesttoken` CSRF header is
  required. If that ever changes we read the token from `oc_requesttoken`
  as the JS fundamentals doc shows.

### 2.3 Launch URL contract

```
{editor_base_url}/?source=owncloud&path={url-encoded-absolute-path}
```

- `source=owncloud` — tells the editor to activate the ownCloud loader on
  boot.
- `path` — absolute path inside the user's ownCloud storage, URL-encoded.
- No credentials and no tokens ever appear in the URL.

### 2.4 Editor bootstrap tweak

In `scripts/main.js`, after the editor is initialized:

1. Parse `window.location.search`.
2. If `source === 'owncloud'`, delegate to `owncloud.js#handleLaunch(path)`:
   - If the Flask session is already authenticated (`/api/owncloud/status`
     returns `authenticated: true`), load the file directly.
   - Otherwise open the login dialog, remember the path, and load the file
     after successful authentication.
3. Clear the query string from the URL bar (`history.replaceState`) so a
   refresh doesn't re-trigger the launch.

This is the only change needed in Layer A for Layer B to work.

### 2.5 Packaging & installation

- Ship as a `tar.gz` produced from `owncloud-app/markdown_viewer/`.
- Install by extracting into ownCloud's `apps/` directory and running
  `occ app:enable markdown_viewer`.
- Admin configures the editor base URL via `occ config:app:set
  markdown_viewer editor_url --value=https://md.example.com`.
- Document both steps in `owncloud-app/markdown_viewer/README.md`.

### 2.6 Tests

The app is ~50 lines of JavaScript and a handful of XML/PHP manifests.
Automated tests are not worth the setup cost here. Verification is manual
and documented in the app README:

1. Install the app, enable it, configure the editor URL.
2. Upload a `.md` file in ownCloud.
3. Confirm the file action appears in the three-dots menu.
4. Click it; confirm the editor opens in a new tab with the file loaded.
5. Edit, save, confirm the change lands in ownCloud.

### 2.7 Acceptance checklist — Step 2

- [ ] App installs cleanly on ownCloud 10.16.x.
- [ ] File action appears on `.md` and `.markdown` files.
- [ ] Launch URL opens the editor with the correct path.
- [ ] Editor bootstrap correctly handles the pre-authenticated case.
- [ ] Editor bootstrap correctly handles the unauthenticated case
      (login → load file).
- [ ] Query string is cleared after launch.
- [ ] `owncloud-app/markdown_viewer/README.md` covers install, configure,
      verify, uninstall.

### 2.8 Enhancements deferred to v1.1

Not required for first release; tracked here to keep scope honest:

- **Rename-resilient saves via `oc:fileid`.** ownCloud's `PROPFIND`
  exposes a stable `oc:fileid` per file (see the
  [WebDAV access guide](https://doc.owncloud.com/server/latest/classic_ui/files/access_webdav.html#accessing-files-using-curl)).
  Capturing it alongside the path and ETag would let Save recover when the
  user renames or moves the file in ownCloud between load and save. Layer
  A service and route shapes already support this cleanly — just an extra
  field to carry.
- **Marketplace publishing of the PHP app.** Once the app has lived through
  one or two releases, publish to the
  [ownCloud Marketplace](https://marketplace.owncloud.com/) for one-click
  install. Requires a screenshot, a public repository, and an AGPL/MIT
  license — all already listed as required `info.xml` fields.
- **Content-type sniffing.** If ownCloud's mime DB doesn't resolve `.md`
  to `text/markdown` on a given install, add a fallback registration keyed
  on filename extension.

---

## 6. Security Considerations

- **Credentials.** App passwords only, stored server-side in the Flask
  session (signed cookie, `httpOnly`, `SameSite=Lax`). Never logged, never
  returned to the browser after login, never written to disk.
- **No client-side persistence.** Per the
  [ownCloud security guide](https://doc.owncloud.com/server/latest/developer_manual/general/security.html#persistent-storages-on-client-side)
  highly sensitive data must not be stored on the client. Credentials never
  enter `localStorage`, `sessionStorage`, IndexedDB, or any client-side
  persistent store.
- **TLS.** `OWNCLOUD_VERIFY_TLS=false` is an explicit footgun for
  same-host deployments with self-signed certs. Documented as such. In
  production with a public reverse proxy there is no reason to disable it.
- **CORS.** None. The browser only talks to `md.example.com/api/*`. Flask
  talks to ownCloud server-to-server.
- **Launch URL — unvalidated redirect class.** Layer B's action handler
  opens `${editor_url}/?source=owncloud&path=${path}` in a new tab.
  `editor_url` is an **admin-set app config value** (not user input);
  `path` comes from the ownCloud file list (trusted directory listing,
  never free-form user input). That places this outside the unvalidated
  redirect pattern flagged in the security guide, but the boundary is
  worth stating so future changes do not cross it.
- **CSP / iframe.** Option C (iframe embedding) is explicitly out of scope
  (see §2.0). ownCloud templates ship `X-Frame-Options` by default per the
  [security guide clickjacking section](https://doc.owncloud.com/server/latest/developer_manual/general/security.html#clickjacking);
  the docs themselves warn that external-site iframes are commonly blocked
  by `X-Frame-Options` / CSP. We do not fight the framework here.
- **Path traversal.** The service always URL-encodes paths and rejects `..`
  segments before building the WebDAV URL.
- **Rate limiting.** Out of scope for v1. ownCloud itself rate-limits app
  password usage.
- **Secret key.** Flask's existing `SECRET_KEY` requirement carries over;
  do not run without one in production.

---

## 7. Risk Assessment

| Risk                                                           | Likelihood | Impact | Mitigation                                                   |
|----------------------------------------------------------------|------------|--------|--------------------------------------------------------------|
| App password fails silently or gets deleted server-side        | Medium     | Low    | Clean re-auth UX; clear session on ownCloud 401.             |
| ETag changes unexpectedly (sync client overwrote in background)| Medium     | Medium | Map 412 → 409, show overwrite dialog reusing BookStack flow. |
| Self-signed cert blocks internal traffic                       | Medium     | High   | `OWNCLOUD_VERIFY_TLS=false` escape hatch + plain-HTTP path.  |
| Concurrent edits by two users on the same file                 | Low        | Medium | Last-writer-wins with 412 detection; locking is v2.          |
| ownCloud major upgrade breaks WebDAV paths                     | Low        | High   | Pin documented to 10.16.x; add compat note on upgrades.      |
| iframe mode blocked by ownCloud's own X-Frame-Options / CSP     | N/A (removed) | N/A    | Option C explicitly out of scope per §2.0; new-tab launch is the only supported handoff. |
| Large Markdown files (>1 MB) time out                          | Low        | Low    | `OWNCLOUD_TIMEOUT` knob; document the upper bound.           |
| Unicode filenames break XML parsing                            | Low        | Medium | Explicit UTF-8 decoding tests on WebDAV responses.           |

---

## 8. Rollout

**v2.8.0 — Step 1 ships standalone.** A complete ownCloud file source in the
editor. Users can adopt it immediately without touching their ownCloud server.

**v2.9.0 — Step 2 adds the launcher.** The PHP app is packaged and documented.
Installation is optional; Step 1 continues to work unchanged without it.

Each step lives behind a feature branch, merges independently, and passes the
standard CI gates (pytest + vitest + playwright smoke).

---

## 9. Open Questions

Answer before implementation starts:

1. **Editor host.** Subdomain (`md.example.com`) or subpath
   (`cloud.example.com/markdown`)? Subpath simplifies CSP for Layer B's
   iframe mode; subdomain is simpler for TLS.
2. **Docker network.** What is the existing external network the ownCloud
   container is on? The compose file needs the exact name.
3. **Default source in Step 2.** When the launcher URL hits the editor, do
   we want a "remember the launch source" setting so the user lands on the
   ownCloud browser next time they open the editor directly? Default: no.
4. **Shortcut key.** `Ctrl/Cmd+L` is my suggestion for opening the ownCloud
   browser. Any conflicts?
5. **File action scope.** Should Layer B also register the action on
   `.markdown` files (in addition to `.md`)? Default: yes.

---

## 10. References

Primary ownCloud 10.16 developer documentation consulted for this plan:

- [Developer Manual — Introduction](https://doc.owncloud.com/server/latest/developer_manual/index.html)
- [App Metadata (info.xml)](https://doc.owncloud.com/server/latest/developer_manual/app/fundamentals/info.html)
- [JavaScript fundamentals (file actions, CSRF, URL helpers)](https://doc.owncloud.com/server/latest/developer_manual/app/fundamentals/js.html)
- [Filesystem API (for future Layer-A-in-PHP ideas — not used in v1)](https://doc.owncloud.com/server/latest/developer_manual/app/fundamentals/filesystem.html)
- [Security Guidelines](https://doc.owncloud.com/server/latest/developer_manual/general/security.html)
- [WebDAV access guide (endpoint shape, PROPFIND, cURL examples)](https://doc.owncloud.com/server/latest/classic_ui/files/access_webdav.html)
- [Linking External Sites (Option A / iframe caveats)](https://doc.owncloud.com/server/latest/admin_manual/configuration/server/external_sites.html)

---

**End of OWNCLOUD_INTEGRATION_PLAN.md** • Status: 📋 Planning • Implementation begins after approval.
