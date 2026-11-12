// The build version (X.Y.Z-rc.N). The release build sets YOUEYE_VERSION and
// next.config.ts inlines it at build time; development builds report 0.0.0.
export const BUILD_VERSION = process.env.YOUEYE_VERSION || "0.0.0";
