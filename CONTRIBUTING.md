# Contributing

Base changes on `dev` and keep product behavior, tests, `package.json`, and
`youeye-app.yaml` consistent. Run `pnpm test` and `pnpm release:check` before
submitting changes. Release builds use `.youeye/build/app`; the entrypoint is
credential-free and emits an unsigned `standalone.tar` for independent
validation, signing, and publication.

Do not commit credentials, signing material, private endpoints, deployment
records, worker/session journals, or generated release artifacts. Release
promotion and public publication require separately authorized workflows.

## Development version baseline

Before the next release, align each component's development version with its
latest published Stable base and choose an unused six-position development
iteration (for example, `0.5.1.0.0.1` after Stable `0.5.1`). Never lower a
component already on a newer base. A public snapshot can advance its release
version without advancing the development branch automatically; compare source
content separately from version numbers. Keep all registered version authorities
consistent. Existing release locks describe real published inputs: do not replace
their versions, tags or hashes with values for artifacts that do not exist.

Source preparation does not require a Development release. The release workflow
merges reviewed development source, assigns the destination version, then builds
and publishes only when explicitly started. Private Alpha uses five positions;
public Stable uses three. A source-only task must not create tags or releases.
