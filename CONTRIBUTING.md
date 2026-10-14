# Contributing

Base changes on `dev` and keep product behavior, tests, `package.json`, and
`youeye-app.yaml` consistent. Run `pnpm test` and `pnpm release:check` before
submitting changes. Release builds use `.youeye/build/app`; the entrypoint is
credential-free and emits an unsigned `standalone.tar` for independent
validation, signing, and publication.

Do not commit credentials, signing material, private endpoints, deployment
records, worker/session journals, or generated release artifacts. Release
promotion and public publication require separately authorized workflows.

## Release version identity

New releases use `X.Y.Z[-token.N]`, retaining all three numeric positions.
Development targets the next Stable base: after `0.5.3`, use
`0.5.4-dev.N`; private main uses `alpha.N`, public Beta uses `beta.N`, and
feature releases use a collision-checked branch token with a numeric counter.
The exact case-sensitive Git branch remains separate from the display token.
Select source/channel before comparing versions; `.10` follows `.9`.

The release coordinator reserves identities with a stable request key before
building. Retry the same frozen attempt; never repurpose a used identity or
rewrite historical tags, locks or artifact versions. Failed attempts may leave
gaps. Source-only preparation does not start builds or publication, and the
existing branch/merge workflow remains in effect.

This product retains its own version sequence; it is not numbered from the
YouEye core release group. Keep every registered source version authority
consistent. Unchanged published payloads retain their original provenance.
