// The app's release line (X.Y.Z, the repository's VERSION) and git tree. The release
// build sets YOUEYE_LINE and YOUEYE_SOURCE_TREE (.youeye/build/lib.sh) and
// next.config.ts inlines them at build time; development builds report 0.0.0.
// Never a build name (X.Y.Z-dev.N): the same build is promoted under other names,
// and the Control Panel shows the installed release's own version.
export const APP_VERSION = process.env.YOUEYE_LINE || "0.0.0";
export const SOURCE_TREE = process.env.YOUEYE_SOURCE_TREE || "";
