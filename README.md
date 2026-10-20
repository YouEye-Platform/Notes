# YouEye Notes

Markdown note-taking app for the [YouEye](https://github.com/YouEye-Platform/YouEye) platform.

Notes runs as a native YouEye app. It provides local note storage, dashboard widgets, notification surfaces, and a settings panel that is embedded inside YouEye Settings.

The version in `package.json` and `youeye-app.yaml` is the exact source version.

## Features

- Markdown notes with folders, pinning, and search
- Recent notes, quick capture, and pinned notes dashboard widgets
- Public share links for selected notes
- Reminder notification surface
- App-owned settings panel for YouEye Settings
- Auth return handling for native launch flows
- Theme, language, and account menu integration
- PWA-ready build with service worker assets

## YouEye Surfaces

| Surface | Purpose |
|---|---|
| `/` | Main Notes app |
| `/embed/widget/recent-notes` | Dashboard recent notes widget |
| `/embed/widget/quick-capture` | Dashboard quick capture widget |
| `/embed/widget/pinned-notes` | Dashboard pinned notes widget |
| `/embed/settings` | App settings panel shown inside YouEye Settings |
| `/embed/notification/default` | Rich notification body |
| `/api/manifest` | Native app manifest consumed by Market and UI |
| `/api/health` | Container health and version endpoint |

## Development

```bash
pnpm install
pnpm dev
```

The app uses Next.js 16, TypeScript, Tailwind CSS, and the shared native-app surface contract used by YouEye apps.

## Build and release checks

```bash
pnpm test
pnpm release:check
pnpm build
```

The source-owned `.youeye/build/app` entrypoint produces an unsigned
`standalone.tar` for independent validation, signing, and publication. It
requires the build environment described in `.youeye/build/manifest.json`.
Package and install-manifest versions must agree. Development tags use
`dev-v<version>`; Stable tags use `v<version>`.

The install manifest retains the Forgejo source identity. The public project
website is documentation metadata, not an instruction to switch update sources.
See [PUBLIC_RELEASE_POLICY.md](PUBLIC_RELEASE_POLICY.md) for publication rules.

## License

YouEye source code is licensed under the [Business Source License 1.1](LICENSE). Each version converts to AGPL-3.0 after four years.

The "YouEye" name and logo are trademarks. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.

## Acting user and household admission

Private routes derive the acting identity from `getSession(appId)`, which checks
the native cookie and current identity session through the configured client.
Never use a browser-supplied `X-YouEye-User`, `userId` or `user_id` to select
private rows or nominate the user of a platform service call. Household admission
and per-user service consent are separate checks; administrative status does not
grant access to every app.

Every note mutation, including tag-only changes, verifies the note's owner.
Private folder and tag references must belong to that same identity. Reads also
filter tag relationships and folder counts by owner, including historical rows.

Widget, card and inter-app routes require a native session. Inter-app factories
receive an explicit app ID and pass `{ userId }` as the second handler argument;
user fields are removed from request data. A server-to-server caller without a
validated native session is denied. Header/body identity nomination is not a
supported delegation protocol. Existing explicitly public shares and public
content remain distinct from private routes, and external public exposure must
be chosen by the appliance administrator.
## App service credentials

Platform calls run on the server with the protected `YOUEYE_APP_ID`,
`YOUEYE_APP_TOKEN` and `YOUEYE_GATEWAY` values injected by the installer.
The app ID is the exact installed ID; helpers do not invent prefix aliases.
A missing credential fails with an integration-not-ready error. Use Market's
administrator credential reconciliation action to repair delivery.

Pass the acting user from a validated server session. Caller-supplied headers
cannot replace machine identity, select another user, or attach a browser/bridge
credential. Keep platform helpers in server code and keep runtime credentials
out of source, browser bundles and logs. Public health/manifests do not need a
service credential. Rotation and restore reinject a credential and prove it
before marking integration ready.

## Web build baseline

Use Node 24.22.0 and pnpm 10.6.2 with the committed frozen lockfile.
Next.js 16.4.2 builds explicitly use webpack for Serwist 9.5.13; run `pnpm lint`
and `pnpm typecheck` separately. Static-only offline caching excludes private
API, HTML and RSC responses.

The signed standalone payload carries the exact Node runtime and upstream licence
in `.youeye-runtime`. The existing `server.js` entrypoint forwards to this runtime,
so native update/recovery switches application and runtime together.

The remaining `braces` advisory is confined to build-time lint glob patterns;
there is no upstream fix. Alex reviews this and the ESLint 9 compatibility hold
on the next Web patch or by 2026-11-19. Do not introduce untrusted glob patterns.

### Platform locale

The authenticated platform header supplies the resolved personal or instance
locale. The app uses it for the document language and, where present, its
next-intl provider and message request. Missing or unsupported values fall back
to English. Locale propagation does not supply new translated strings. Keep
header responses out of browser caches and test user changes independently.
