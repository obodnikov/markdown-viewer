# Multiple App Windows

## Goal

Design an Electron application so one machine can open and operate on multiple documents by using multiple application windows, with one active document per window.

This document is written as a reusable implementation guide. It uses patterns that apply broadly to Electron applications, including apps that embed a local backend process.

## When To Choose This Model

Use multiple windows instead of tabs when:

- each document should have isolated UI state
- you want minimal refactoring from a single-document app
- users benefit from side-by-side comparison across monitors
- you want the operating system window manager to handle layout
- the app already assumes one editor, one preview, one undo stack, and one current file per renderer

Do not choose this model if the main user workflow depends on rapid switching among many documents inside one shell window. In that case, tabs are usually the better UX, but the implementation cost is higher.

## Terminology

- Instance: one Electron process tree launched by the OS
- Window: one `BrowserWindow`
- Document: one opened file or untitled in-memory workspace

A strong baseline architecture is:

- one app instance
- many windows
- one document per window

This is usually better than:

- many app instances

because menu handling, lifecycle, IPC wiring, shared services, and update flow stay under one main process.

## Recommended Product Behavior

Users should be able to:

- create a new empty window
- open a file into the current window
- open a file into a new window
- drag a file onto the app and get a new window for that file
- reopen recent files in their own windows
- close one window without affecting other open documents

Each window should manage its own:

- current file path
- dirty state
- editor content
- undo/redo history
- cursor/selection state
- view preferences that are document-local

The application may still share:

- global preferences
- API keys
- theme
- telemetry
- auto-update state

## Architecture Overview

### Main Process Responsibilities

The main process should own:

- window creation and destruction
- routing file-open requests to windows
- application menu
- recent files
- OS integration such as deep links, dock/taskbar behavior, drag-and-drop opens
- unsaved-change shutdown coordination

The main process should not own document contents. It should only track window metadata and delegate document state to the renderer.

### Renderer Responsibilities

Each renderer window should own:

- the active document model
- dirty/clean transitions
- editor operations
- save/load flow for that window
- prompts related to that specific document

This keeps the renderer simple and preserves the single-document mental model, which is the main reason this approach scales well from an existing app.

## Core Design Principle

Treat each window as an isolated document workspace.

That means:

- no renderer global state shared across windows
- no assumption that there is only one focused document in the app
- no single `mainWindow` variable as the only window reference

Instead, the main process should maintain a window registry.

## Window Registry Pattern

Use a registry keyed by `windowId`.

Recommended metadata:

- `windowId`
- `browserWindow`
- `filePath`
- `isDirty`
- `isReady`
- `pendingOpenPath`

Example conceptual shape:

```js
const windows = new Map();
```

Each entry should be created when a window is created and removed when the window is closed.

This enables:

- targeted open/save behavior
- dirty-state checks during app quit
- recent-file and reopen logic
- broadcasting global preference changes when needed

## Create Window API

Avoid a bare `createWindow()` with no inputs once the app supports documents.

Prefer:

```js
createWindow({
  filePath: null,
  isNewEmptyDocument: true,
  focus: true,
});
```

or:

```js
createWindow({
  filePath: '/path/to/data.json',
  focus: true,
});
```

This makes file-open and menu actions explicit and testable.

## File Open Flows

### Open Into Current Window

Use when:

- the current window is empty and clean
- the user explicitly chose `Open...` and product behavior prefers replacement

Flow:

1. ask the target renderer whether it is dirty
2. if dirty, prompt to save/discard/cancel
3. if safe, load the selected file into that same window

### Open Into New Window

Use when:

- the user chooses `Open in New Window`
- the current window already has a document open
- the OS passes multiple files to the app

Flow:

1. user selects a file in the main process
2. main process creates a new window with `filePath`
3. renderer loads the file during startup or receives an IPC open command after ready

For reuse across projects, make `Open in New Window` a first-class action. It is clearer than trying to infer intent every time.

## Passing The Document Into A Window

There are two good patterns.

### Pattern A: Pass File Path At Window Creation Time

Send document intent through:

- command-line args
- `additionalArguments`
- query params
- an initialization IPC call after `did-finish-load`

Best when:

- the main process owns file dialogs
- the renderer should load the file immediately at boot

### Pattern B: Open Empty Window Then Send IPC Command

Flow:

1. create window
2. wait for renderer ready signal
3. send `document:open` IPC message with file path or file contents

Best when:

- startup order is complex
- the renderer must initialize dependencies before opening files
- the app may open files after startup as well

For most apps, Pattern B is easier to reason about because it works for both startup and runtime opens.

## Unsaved Changes Model

Unsaved changes must be tracked per window, not globally.

Each renderer should notify the main process when dirty state changes.

Recommended IPC:

- `window:setDirty(windowId, isDirty)`
- `window:getDirty(windowId)`

Main process uses this to:

- decorate title bar state if needed
- prompt on window close
- block quit until all dirty windows are handled

### Close Flow

When a user closes one window:

1. main process intercepts close
2. if that window is clean, allow close
3. if dirty, ask renderer or show native dialog:
   - Save
   - Discard
   - Cancel
4. only close that window after a successful decision

### Quit Flow

When the whole app quits:

1. iterate over all open windows
2. handle each dirty window independently
3. abort quit if any window cancels

Do not assume one prompt is enough for the whole app unless the product spec explicitly accepts data loss tradeoffs.

## Menu Design

Recommended File menu items:

- `New Window`
- `Open...`
- `Open in New Window...`
- `Save`
- `Save As...`
- `Close Window`
- `Open Recent`

Behavior guidance:

- `Open...` should target the focused window
- `Open in New Window...` should always create a new one
- `New Window` should open an empty untitled document

On macOS, users strongly expect multi-window behavior from the app menu. Match platform norms rather than forcing a browser-like shell model.

## Main Process Patterns To Reuse

### 1. Replace Single `mainWindow` Variables

Avoid:

```js
let mainWindow = null;
```

Prefer:

```js
const windows = new Map();
```

### 2. Resolve Target Window At Action Time

For menu actions, always resolve:

- focused window first
- fallback window if appropriate

Do not capture stale window references in long-lived closures.

### 3. Separate Window Creation From File Opening

Keep these concerns separate:

- creating a shell window
- loading a document into that window

This reduces edge cases around restart, reopen, drag-and-drop, and recent files.

## Renderer Patterns To Reuse

Each renderer should behave as if it is the only document it will ever manage.

That is a feature, not a limitation, for this model.

Keep renderer state local:

- `currentFilePath`
- `currentData`
- `isDirty`
- `undoStack`
- `redoStack`

Expose a narrow API to the main process:

- open document
- save document
- ask whether dirty
- ask for title/status metadata

Do not make the renderer responsible for discovering other windows.

## Handling Local Backends

If the app launches a backend process, decide whether it should be:

- one backend per app instance
- one backend per window

### Recommended Default

Use one backend per app instance.

Reasons:

- lower memory usage
- fewer child processes
- easier logs and health monitoring
- simpler port allocation

Use one backend per window only if:

- documents require strict process isolation
- backend state is not safely partitioned per request
- crashes in one document workflow must not affect others

### Shared Backend Requirements

If one backend is shared across many windows:

- API requests must be stateless or document-scoped
- no hidden singleton mutable document state in the backend
- request payloads must include all needed document context

### Per-Window Backend Requirements

If each window launches its own backend:

- allocate ports dynamically
- bind backend lifecycle to that window
- ensure close cleanup is reliable
- expect higher CPU and RAM usage

For most JSON/document tools, one backend per app instance is the right design.

## Shared Settings Versus Per-Window State

Be explicit about what is global and what is window-local.

Global settings:

- theme
- API keys
- default export format
- app-wide preferences

Window-local state:

- open file path
- dirty flag
- undo stack
- cursor position
- split/editor/preview layout if you want each window independent

Document-local state should never be stored in a single shared settings store unless persistence is intentional and keyed by document identity.

## Operating System Behavior

### macOS

Common expectations:

- app stays running after closing all windows
- dock icon can create a new window
- File menu drives most window creation
- opening files from Finder may call open-file handlers when the app is already running

### Windows

Common expectations:

- closing the last window usually exits the app
- taskbar shows separate windows clearly
- double-clicking associated files may launch the app again or pass arguments to the existing process depending on setup

### Linux

Behavior varies by desktop environment, especially around file associations and window activation. Keep implementation explicit and avoid platform assumptions.

## Single Instance Versus Multiple Instances

For this model, the usual recommendation is:

- enforce a single app instance
- allow many windows inside that instance

Benefits:

- one menu owner
- easier recent-files handling
- simpler updates
- simpler shared backend management
- better OS integration for file open events

If a second instance is launched:

1. redirect its open-file intent to the existing instance
2. existing instance creates a new window for the file
3. second instance exits

This is often the cleanest final architecture.

## Migration Strategy For Existing Single-Document Apps

If the app currently assumes one window and one document, migrate in this order.

### Phase 1: Main Process Multi-Window Support

- replace single window references with a registry
- implement `createWindow(options)`
- add `New Window`
- make close behavior window-aware

Do not refactor the renderer yet.

### Phase 2: File Open Routing

- support `Open...` in focused window
- support `Open in New Window...`
- support startup file arguments and OS open-file events

### Phase 3: Per-Window Dirty State IPC

- renderer reports dirty changes
- main process prompts on close and quit

### Phase 4: Shared Services Cleanup

- ensure backend/API layer is safe for multiple windows
- ensure settings writes are not wrongly treated as document state

### Phase 5: UX Polish

- recent files
- window titles
- reopen last closed file or restore session if desired
- drag-and-drop files into a new or existing window

This phased path minimizes risk because it does not force a tab/document-manager refactor.

## Anti-Patterns

Avoid these designs:

- one global `currentDocument` in the main process
- one global renderer state shared across windows
- menu callbacks that capture a stale `BrowserWindow`
- saving document contents in global preferences storage
- one hardcoded backend port without collision handling
- blocking all windows because one window is dirty
- opening a second app instance just to simulate multi-document support

## Testing Strategy

At minimum, test these scenarios:

### Window Lifecycle

- create two windows
- close one window and verify the other stays usable
- close the dirty window and verify prompt behavior

### File Routing

- open file in current window
- open file in new window
- open two different files in two different windows

### Save Safety

- edit in window A and window B independently
- save window A and confirm window B stays dirty
- quit app with multiple dirty windows

### Backend Behavior

- two windows issue API requests concurrently
- closing one window does not break the other

### Platform Behavior

- macOS activate/reopen flow
- Windows file association open flow
- second-launch behavior with single-instance lock enabled

## Recommended Final Architecture

For most Electron document apps, the best long-term design is:

- single app instance
- multiple `BrowserWindow`s
- one document per window
- one shared backend per app instance
- per-window renderer state
- per-window dirty tracking
- explicit `Open...` and `Open in New Window...`

This gives users practical multi-document support without forcing a tabbed document model.

## Reusable Implementation Checklist

- add a main-process window registry
- replace `mainWindow` assumptions
- implement `createWindow(options)`
- support focused-window actions
- support new-window file open
- track dirty state per window
- intercept close and quit safely
- separate global settings from document state
- decide shared-backend versus per-window backend
- add tests for two-window behavior

## Applying This To Existing Projects

If an Electron app already has:

- one editor
- one preview
- one current file
- one save/open flow

then multiple windows are usually the fastest safe path to multi-document support.

You preserve the renderer architecture and move the complexity into the main process, where Electron already expects window orchestration to live.

That is the key reuse principle from this document:

build multi-document support by multiplying isolated document workspaces, not by forcing one renderer to become a document manager before it needs to.
