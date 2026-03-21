# NW.js Desktop Migration (Production-Ready)

## 1. Architecture Transformation

### Current web architecture -> NW.js mapping

- Frontend layer:
  - Existing Next.js App Router UI in `app/` remains unchanged.
  - NW.js embeds the app in a desktop window and loads `http://127.0.0.1:3001`.
- Backend/API handling:
  - Existing Next.js route handlers in `app/api/**` remain the backend boundary.
  - In desktop mode, these handlers run from the local bundled Next standalone server.
- Local vs remote resources:
  - Local: bundled UI assets, local IndexedDB (Dexie), optional local file operations via Node-capable backend routes.
  - Remote: Firebase, PostHog, Razorpay, and any external APIs over HTTPS.

### Required modifications applied

- Added a desktop wrapper at `desktop/` that:
  - starts the bundled Next server (`server.js`),
  - waits for readiness,
  - opens the NW.js window,
  - shuts down cleanly.
- Enabled conditional Next standalone output during desktop builds only:
  - `DESKTOP_BUILD=1 next build`.
- Added packaging pipeline for Windows `.exe` using `nw-builder`.

## 2. Project Structure

```text
.
|-- app/
|-- components/
|-- lib/
|-- public/
|-- desktop/
|   |-- build-nw.mjs
|   |-- nw-main.js
|   `-- package.json
|-- next.config.ts
|-- package.json
`-- NWJS_MIGRATION.md
```

Packaging output:

```text
dist/
`-- desktop/
    |-- app/    # Prepared runtime app (standalone + nw manifest)
    `-- bin/    # Windows distributable produced by nw-builder
```

## 3. NW.js Configuration

Desktop manifest (`desktop/package.json`) in this migration:

```json
{
  "name": "synplix-desktop",
  "version": "1.0.0",
  "main": "about:blank",
  "node-main": "nw-main.js",
  "window": {
    "title": "Synplix",
    "width": 1440,
    "height": 900,
    "min_width": 1100,
    "min_height": 700,
    "position": "center",
    "resizable": true,
    "frame": true,
    "toolbar": false,
    "show": false
  },
  "permissions": {
    "notifications": true,
    "fileSystem": true
  },
  "node-remote": [
    "http://127.0.0.1:3001/*"
  ],
  "chromium-args": "--disable-renderer-backgrounding --disable-background-timer-throttling"
}
```

Notes:
- `node-main` bootstraps server lifecycle.
- `main` remains neutral (`about:blank`) because app URL is opened after server readiness.

## 4. Code Adaptation

### A) Browser-only APIs

Most of your current code is browser-safe already (Dexie, localStorage, React hooks).
No rewrite required.

### B) Use Node.js modules in desktop app

Server-side usage is preferred for security. Example route handler pattern:

```ts
// app/api/desktop/read-file/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";

export async function POST(req: NextRequest) {
  const { path } = await req.json();

  // Add your allowlist checks here.
  const contents = await readFile(path, "utf8");
  return NextResponse.json({ contents });
}
```

### C) File system handling

Use `fs` only in server-side code (route handlers) or in `desktop/nw-main.js`, not in client components.

Required code changes already done:
- Added `desktop/nw-main.js` to control process lifecycle.
- Added `start:standalone` + desktop scripts in root `package.json`.
- Added conditional standalone build in `next.config.ts`.
- Added secure desktop file API route: `POST /api/desktop/files`.
- Added desktop API client helper: `lib/desktopFileApi.ts`.

Implemented secure API contract:

- Enabled only when desktop runtime is active (`DESKTOP_RUNTIME=1`).
- Requires desktop token header (`x-desktop-api-token`) in desktop mode.
- Restricts access to allowlisted scopes only:
  - `imports`
  - `exports`
  - `backups`
- Rejects path traversal and absolute paths.
- Enforces payload/file size limits.

Example usage:

```ts
import { callDesktopFileApi } from "@/lib/desktopFileApi";

const result = await callDesktopFileApi({
  operation: "write",
  scope: "exports",
  relativePath: "invoices/2026-03/report.json",
  contentText: JSON.stringify({ ok: true }, null, 2),
  createDirectories: true,
  overwrite: true,
});

console.log(result);
```

## 5. Feature Enhancements (Desktop-Specific)

Recommended next upgrades:

- File system access:
  - Add explicit allowlisted import/export directories.
  - Add file pickers and checksum validation for imported data files.
- Offline capability:
  - Keep Dexie sync queue (already present).
  - Add network status + last-sync indicator in top bar.
- Notifications:
  - Use Web Notifications for reminders and sync status.
  - Add notification permission UX on first launch.
- Auto-start/background:
  - Add startup registration (Windows Task Scheduler/Run key via installer).
  - Keep lightweight tray/background mode for sync jobs.

## 6. Build & Packaging Steps

1. Install desktop dependencies:

```bash
npm install
```

2. Run local desktop app (development):

```bash
npm run desktop:dev
```

3. Package Windows executable (`.exe`):

```bash
npm run desktop:package
```

4. Optional cross-platform build:

- Update `desktop/build-nw.mjs` `nwbuild` args:
  - macOS: `-p osx64`
  - Linux: `-p linux64`
- Run packaging per target on compatible build agents.

## 7. Performance Optimization

- Reduce memory usage:
  - Keep one NW window process.
  - Avoid duplicate polling intervals in React effects.
- Optimize asset loading:
  - Keep Next production build with code splitting.
  - Compress large static assets and avoid oversized chart datasets.
- Lazy loading:
  - Lazy load heavy pages/charts and export libraries (`jspdf`, `xlsx`) via dynamic imports.

## 8. Security Considerations

- Prevent Node.js misuse in frontend:
  - Prefer Node access in backend route handlers only.
  - Do not expose unrestricted `fs` access to client routes.
- Secure API calls:
  - Keep HTTPS for all remote services.
  - Validate and sanitize all desktop-originated payloads server-side.
- Protect local data:
  - Encrypt sensitive local records before persistence if compliance requires it.
  - Protect exported files with user-selected secure location and optional passwording.

## 9. Optional Enhancements

- Auto-updater integration:
  - Add release channel metadata and signed artifact checks.
- Installer creation:
  - Wrap output executable with Inno Setup / NSIS / WiX for `.exe` or `.msi`.
- Code signing:
  - Sign Windows binaries with an Authenticode certificate to avoid SmartScreen friction.

## Practical Migration Summary

- Minimal rewrite strategy selected:
  - Keep Next.js app and APIs intact.
  - Add NW.js shell + standalone desktop packaging.
- Result:
  - Desktop executable path is now in place without re-architecting your business logic.
