# Contributing

Base changes on `dev` and keep product behavior, tests, `package.json`, and
`youeye-app.yaml` consistent. Run `pnpm test` and `pnpm release:check` before
submitting changes. Release builds use `.youeye/build/app`; the entrypoint is
credential-free and emits an unsigned `standalone.tar` for independent
validation, signing, and publication.

Do not commit credentials, signing material, private endpoints, deployment
records, worker/session journals, or generated release artifacts. Release
promotion and public publication require separately authorized workflows.
