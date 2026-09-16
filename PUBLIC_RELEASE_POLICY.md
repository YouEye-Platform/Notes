# Public release policy

This repository may be published only from an owner-approved curated baseline
or a separately authorized history rewrite. Removing private data from the tip
does not remove it from existing history.

The public project website is informational metadata. The install manifest's
source repository is preserved from the established release line; changing it
requires an explicit source/channel migration, not a documentation cleanup.
Development build entrypoints do not sign, publish, accept credentials, or
establish Stable trust. A public publication requires a separately reviewed
source identity and curated baseline.

The build manifest identifies the existing supported `koshka-lxc-625-v1`
executor. Executor selection is an Alex/Infra boundary: this product neither
creates executor identities nor makes an infrastructure trust assertion.
`release-manifest.json` uses the product-local release-metadata format only;
it is source-bound product metadata, not an Infra manifest or replacement for
Infra validation, provenance, SBOM, signing, or publication records.

A promotion must bind an exact source commit, source epoch, version, branch,
tag, artifact digest, SBOM, provenance, and destination. The version inside
`standalone.tar` and the runtime `/api/manifest` must match the release tag.
Existing tags and assets are immutable.
