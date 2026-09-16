# YouEye Notes

Markdown note-taking app for the [YouEye](https://github.com/YouEye-Platform/YouEye) platform.

Notes runs as a native YouEye app. It provides local note storage, dashboard widgets, notification surfaces, and a settings panel that is embedded inside YouEye Settings.

Current development source version: `0.4.5.1.0.2`

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

The app uses Next.js 15, TypeScript, Tailwind CSS, and the shared native-app surface contract used by YouEye apps.

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
