#!/bin/bash
set -euo pipefail
app_build_fail() { printf 'youeye-app-build: %s\n' "$*" >&2; exit 1; }
app_require_command() { command -v "$1" >/dev/null 2>&1 || app_build_fail "required command is missing: $1"; }
app_prepare_contract() {
    local script_dir git_commit
    script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[1]}")" && pwd)"
    YOUEYE_SOURCE_DIR="${YOUEYE_SOURCE_DIR:-$(cd -- "$script_dir/../.." && pwd)}"
    YOUEYE_OUTPUT_DIR="${YOUEYE_OUTPUT_DIR:-}"; YOUEYE_WORK_DIR="${YOUEYE_WORK_DIR:-}"
    YOUEYE_SOURCE_COMMIT="${YOUEYE_SOURCE_COMMIT:-}"; SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-}"
    [[ -d $YOUEYE_SOURCE_DIR ]] || app_build_fail 'YOUEYE_SOURCE_DIR must be an existing source directory'
    [[ -n $YOUEYE_OUTPUT_DIR && $YOUEYE_OUTPUT_DIR != / && $YOUEYE_OUTPUT_DIR != "$YOUEYE_SOURCE_DIR" ]] || app_build_fail 'YOUEYE_OUTPUT_DIR must be a dedicated non-root directory'
    [[ -n $YOUEYE_WORK_DIR && $YOUEYE_WORK_DIR != / && $YOUEYE_WORK_DIR != "$YOUEYE_SOURCE_DIR" && $YOUEYE_WORK_DIR != "$YOUEYE_OUTPUT_DIR" ]] || app_build_fail 'YOUEYE_WORK_DIR must be a separate dedicated non-root directory'
    if git_commit="$(git -C "$YOUEYE_SOURCE_DIR" rev-parse HEAD 2>/dev/null)"; then
        [[ -z $YOUEYE_SOURCE_COMMIT || $YOUEYE_SOURCE_COMMIT == "$git_commit" ]] || app_build_fail 'YOUEYE_SOURCE_COMMIT does not match the checked-out source commit'
        YOUEYE_SOURCE_COMMIT="$git_commit"
        [[ -n $SOURCE_DATE_EPOCH ]] || SOURCE_DATE_EPOCH="$(git -C "$YOUEYE_SOURCE_DIR" show -s --format=%ct "$git_commit")"
    fi
    [[ $YOUEYE_SOURCE_COMMIT =~ ^[0-9a-f]{40}$ ]] || app_build_fail 'YOUEYE_SOURCE_COMMIT must be the exact 40-character source commit'
    [[ $SOURCE_DATE_EPOCH =~ ^[1-9][0-9]*$ ]] || app_build_fail 'SOURCE_DATE_EPOCH must be a positive integer'
    install -d -m 0755 "$YOUEYE_OUTPUT_DIR" "$YOUEYE_WORK_DIR"
    export YOUEYE_SOURCE_DIR YOUEYE_OUTPUT_DIR YOUEYE_WORK_DIR YOUEYE_SOURCE_COMMIT SOURCE_DATE_EPOCH
    export LANG=C.UTF-8 LC_ALL=C.UTF-8 TZ=UTC CI=1 NEXT_TELEMETRY_DISABLED=1
}
app_require_pnpm() {
    app_require_command node; app_require_command pnpm; app_require_command tar
    local actual; actual="$(pnpm --version)"
    [[ $actual == 10.6.2 ]] || app_build_fail "pnpm 10.6.2 is required; found $actual"
    [[ -n ${YOUEYE_PNPM_STORE_DIR:-} && -d $YOUEYE_PNPM_STORE_DIR ]] || app_build_fail 'YOUEYE_PNPM_STORE_DIR must select the reviewed shared content-addressed store'
}
app_find_standalone_root() {
    local root=$1
    if [[ -f $root/server.js ]]; then printf '%s\n' "$root"; return; fi
    local -a matches=(); mapfile -d '' matches < <(find "$root" -mindepth 2 -maxdepth 5 -type f -name server.js -print0)
    [[ ${#matches[@]} -eq 1 ]] || app_build_fail "expected exactly one standalone server.js under $root; found ${#matches[@]}"
    dirname -- "${matches[0]}"
}
app_package_standalone() {
    local standalone_root=$1 source_version packaged_version output temporary legal_file
    [[ -f $standalone_root/server.js ]] || app_build_fail 'standalone server.js is missing'; node --check "$standalone_root/server.js" >/dev/null
    source_version="$(node -p "require(process.argv[1]).version" "$YOUEYE_SOURCE_DIR/package.json")"
    [[ -f $standalone_root/package.json ]] || app_build_fail 'standalone package.json is missing'
    packaged_version="$(node -p "require(process.argv[1]).version" "$standalone_root/package.json")"
    [[ $packaged_version == "$source_version" ]] || app_build_fail 'packaged version does not match source package.json'
    for legal_file in LICENSE TRADEMARK.md THIRD_PARTY_NOTICES.txt; do
        [[ -f $YOUEYE_SOURCE_DIR/$legal_file ]] || app_build_fail "required distribution notice is missing: $legal_file"
        install -m 0644 "$YOUEYE_SOURCE_DIR/$legal_file" "$standalone_root/$legal_file"
    done
    YOUEYE_RELEASE_OUTPUT="$standalone_root/release-manifest.json" node "$YOUEYE_SOURCE_DIR/scripts/write-release-manifest.mjs"
    output="$YOUEYE_OUTPUT_DIR/standalone.tar"; temporary="$YOUEYE_WORK_DIR/standalone.tar.partial"; rm -f -- "$temporary" "$output"
    tar --sort=name --format=posix --numeric-owner --owner=0 --group=0 --mtime="@$SOURCE_DATE_EPOCH" --pax-option=delete=atime,delete=ctime -C "$standalone_root" -cf "$temporary" .
    [[ -s $temporary ]] || app_build_fail 'standalone.tar is empty'
    tar -tf "$temporary" ./server.js ./package.json ./release-manifest.json ./LICENSE ./TRADEMARK.md ./THIRD_PARTY_NOTICES.txt >/dev/null || app_build_fail 'standalone.tar is missing required root files'
    mv -- "$temporary" "$output"; sha256sum "$output"
}
