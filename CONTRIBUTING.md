# Contributing

Base changes on `dev` and keep product behavior, tests, `package.json`, and
`youeye-app.yaml` consistent. Run `pnpm test` before submitting
changes. Release builds use `.youeye/build/app`; the entrypoint is
credential-free and emits an unsigned `standalone.tar` for independent
validation and publication. Releases are not signed; integrity comes from
SHA-256 digests served over HTTPS.

Do not commit credentials, private keys, private endpoints, deployment
records, worker/session journals, or generated release artifacts. Release
promotion and public publication require separately authorized workflows.

## Versions and releases

`VERSION` holds the release line (`X.Y.Z`). Every build is `X.Y.Z-dev.N`: the
release tool picks the next free `N` from this repository's release tags and
passes the full version to the build as `YOUEYE_VERSION`; `.youeye/build/app`
fails without it. Nothing in the source tree carries the build number:
`package.json` and `youeye-app.yaml` keep the placeholder `0.0.0`. The build
writes the version into the app (`next.config.ts` inlines it), into
`release-manifest.json` inside `standalone.tar`, and into the release copy of
`youeye-app.yaml`.

A build keeps its version on every channel (dev, alpha, beta, stable).
Promotion copies the same bytes and never rebuilds. Release tags are
`v<version>`. A release holds `standalone.tar`, `youeye-app.yaml` and
`product-release.json`, which binds them by SHA-256 and the source git tree.

## Timeline producers

Use the existing API helper for Timeline activity and follow
[the collection contract](docs/timeline-collection.md). Never bypass fresh consent
or queue/replay Timeline payloads after a rejected event.

## Interface languages

Follow [the localization contract](docs/localization.md) for interface work.
New text needs messages in every registered language, including error and
accessible labels. Run `pnpm i18n:check`; do not expand the existing-literal
baseline to admit untranslated features.
